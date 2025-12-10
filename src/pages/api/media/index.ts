import type { APIRoute } from 'astro';
import { db } from '@/db';
import { media } from '@/db/schema';
import { desc } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';
import { checkRateLimit, getClientId, rateLimitResponse, uploadRateLimit } from '@/lib/rate-limit';

// Allowed MIME types
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/png',
  'image/gif',
  'image/webp',
  'image/svg+xml',
];

// Max file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

// Magic bytes for image validation
const MAGIC_BYTES: Record<string, number[][]> = {
  'image/jpeg': [[0xFF, 0xD8, 0xFF]],
  'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
  'image/gif': [[0x47, 0x49, 0x46, 0x38, 0x37, 0x61], [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
  'image/webp': [[0x52, 0x49, 0x46, 0x46]], // RIFF header (WebP starts with RIFF)
};

function validateMagicBytes(buffer: Buffer, mimeType: string): boolean {
  const signatures = MAGIC_BYTES[mimeType];
  if (!signatures) return true; // No signature to check (e.g., SVG)
  
  return signatures.some(sig => 
    sig.every((byte, i) => buffer[i] === byte)
  );
}

// Sanitize filename to prevent path traversal
function sanitizeFilename(filename: string): string {
  // Remove path separators and null bytes
  return filename
    .replace(/[\/\\]/g, '')
    .replace(/\0/g, '')
    .replace(/\.\./g, '')
    .slice(0, 200);
}

// GET /api/media - List all media
export const GET: APIRoute = async () => {
  try {
    const mediaList = await db.select().from(media).orderBy(desc(media.uploadedAt));
    return new Response(JSON.stringify(mediaList), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching media:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST /api/media - Upload new media
export const POST: APIRoute = async ({ request }) => {
  try {
    // Rate limiting
    const clientId = getClientId(request);
    const rateCheck = checkRateLimit(`upload:${clientId}`, uploadRateLimit);
    if (!rateCheck.allowed) {
      return rateLimitResponse(rateCheck.resetAt);
    }

    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return new Response(JSON.stringify({ error: 'File too large. Maximum size is 10MB' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate MIME type
    if (!ALLOWED_MIME_TYPES.includes(file.type)) {
      return new Response(JSON.stringify({ error: 'Invalid file type. Only images are allowed (JPEG, PNG, GIF, WebP, SVG)' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Read file buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // Validate magic bytes (skip for SVG as it's text-based)
    if (file.type !== 'image/svg+xml' && !validateMagicBytes(buffer, file.type)) {
      return new Response(JSON.stringify({ error: 'File content does not match declared type' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Additional SVG validation - check for script tags
    if (file.type === 'image/svg+xml') {
      const svgContent = buffer.toString('utf-8').toLowerCase();
      if (svgContent.includes('<script') || svgContent.includes('javascript:') || svgContent.includes('onerror') || svgContent.includes('onload')) {
        return new Response(JSON.stringify({ error: 'SVG contains potentially dangerous content' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Generate unique filename with sanitization
    const timestamp = Date.now();
    const sanitizedOriginal = sanitizeFilename(file.name);
    const originalExt = sanitizedOriginal.split('.').pop()?.toLowerCase() || 'bin';
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${originalExt}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filepath = join(uploadsDir, filename);
    await writeFile(filepath, buffer);

    const url = `/uploads/${filename}`;

    // Insert into database
    const [newMedia] = await db.insert(media).values({
      filename,
      originalName: sanitizedOriginal,
      url,
      mimeType: file.type,
      size: file.size,
      width: null,
      height: null,
      alt: alt.slice(0, 500), // Limit alt text length
      uploadedAt: new Date()
    }).returning();

    return new Response(JSON.stringify(newMedia), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error uploading media:', error);
    return new Response(JSON.stringify({ error: 'Failed to upload media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
