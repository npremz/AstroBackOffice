import type { APIRoute } from 'astro';
import { db } from '@/db';
import { files } from '@/db/schema';
import { desc, sql } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { checkRateLimit, getClientId, rateLimitResponse, uploadRateLimit } from '@/lib/rate-limit';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

// Allowed MIME types for documents
const ALLOWED_MIME_TYPES = [
  // PDF
  'application/pdf',
  // Microsoft Office
  'application/msword', // .doc
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document', // .docx
  'application/vnd.ms-excel', // .xls
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-powerpoint', // .ppt
  'application/vnd.openxmlformats-officedocument.presentationml.presentation', // .pptx
  // OpenDocument
  'application/vnd.oasis.opendocument.text', // .odt
  'application/vnd.oasis.opendocument.spreadsheet', // .ods
  'application/vnd.oasis.opendocument.presentation', // .odp
  // Text files
  'text/plain', // .txt
  'text/csv', // .csv
  'text/markdown', // .md
  // Archives
  'application/zip',
  'application/x-zip-compressed',
  'application/x-rar-compressed',
  'application/x-7z-compressed',
];

// File extension mapping for display
export const FILE_EXTENSIONS: Record<string, string> = {
  'application/pdf': 'PDF',
  'application/msword': 'DOC',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'DOCX',
  'application/vnd.ms-excel': 'XLS',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'XLSX',
  'application/vnd.ms-powerpoint': 'PPT',
  'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PPTX',
  'application/vnd.oasis.opendocument.text': 'ODT',
  'application/vnd.oasis.opendocument.spreadsheet': 'ODS',
  'application/vnd.oasis.opendocument.presentation': 'ODP',
  'text/plain': 'TXT',
  'text/csv': 'CSV',
  'text/markdown': 'MD',
  'application/zip': 'ZIP',
  'application/x-zip-compressed': 'ZIP',
  'application/x-rar-compressed': 'RAR',
  'application/x-7z-compressed': '7Z',
};

// Max file size (50MB for documents)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// Magic bytes for file validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'application/pdf': [[0x25, 0x50, 0x44, 0x46]], // %PDF
  'application/zip': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]], // PK
  'application/x-zip-compressed': [[0x50, 0x4B, 0x03, 0x04], [0x50, 0x4B, 0x05, 0x06]],
  'application/x-rar-compressed': [[0x52, 0x61, 0x72, 0x21, 0x1A, 0x07]], // Rar!
  'application/x-7z-compressed': [[0x37, 0x7A, 0xBC, 0xAF, 0x27, 0x1C]], // 7z signature
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // No signature to check (e.g., text files, Office docs)
  
  return signatures.some(sig => 
    sig.every((byte, i) => buffer[i] === byte)
  );
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .slice(0, 200);
}

// GET /api/files - List all files (with pagination)
export const GET: APIRoute = async ({ url }) => {
  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(files);
    const total = Number(count);

    // Get paginated data
    const data = await db.select().from(files)
      .orderBy(desc(files.uploadedAt))
      .limit(pagination.limit)
      .offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching files:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch files' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/files - Upload new file
export const POST: APIRoute = async ({ request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);

  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(`upload:${clientId}`, uploadRateLimit);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const description = formData.get('description') as string || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 50MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ 
        error: 'Invalid file type. Allowed types: PDF, Word, Excel, PowerPoint, OpenDocument, Text, CSV, Markdown, ZIP, RAR, 7Z' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes for binary files
    if (!validateMagicBytes(buffer, file.type)) {
      return new Response(JSON.stringify({ error: 'File content does not match declared type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename with sanitization
    const timestamp = Date.now();
    const sanitizedOriginal = sanitizeFilename(file.name);
    const originalExt = sanitizedOriginal.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${originalExt}`;

    // Ensure files directory exists
    const filesDir = join(process.cwd(), 'public', 'files');
    if (!existsSync(filesDir)) {
      await mkdir(filesDir, { recursive: true });
    }

    // Save file
    const filepath = join(filesDir, filename);
    await writeFile(filepath, buffer);

    const url = `/files/${filename}`;

    // Insert into database
    const [newFile] = await db.insert(files).values({
      filename,
      originalName: sanitizedOriginal,
      url,
      mimeType: file.type,
      size: file.size,
      description: description.slice(0, 500),
      uploadedAt: new Date()
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'File',
      resourceId: newFile.id,
      resourceName: sanitizedOriginal,
      changes: { after: { filename, originalName: sanitizedOriginal, mimeType: file.type, size: file.size } },
    });

    return new Response(JSON.stringify(newFile), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading file:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'File',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to upload file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
