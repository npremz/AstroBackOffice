import type { APIRoute } from 'astro';
import { db } from '@/db';
import { media } from '@/db/schema';
import { desc, eq } from 'drizzle-orm';
import { writeFile, mkdir } from 'fs/promises';
import { existsSync } from 'fs';
import { join } from 'path';

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
    const formData = await request.formData();
    const file = formData.get('file') as File;
    const alt = formData.get('alt') as string || '';

    if (!file) {
      return new Response(JSON.stringify({ error: 'No file provided' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Validate file type
    if (!file.type.startsWith('image/')) {
      return new Response(JSON.stringify({ error: 'Only image files are allowed' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique filename
    const timestamp = Date.now();
    const originalExt = file.name.split('.').pop();
    const filename = `${timestamp}-${Math.random().toString(36).substring(7)}.${originalExt}`;

    // Ensure uploads directory exists
    const uploadsDir = join(process.cwd(), 'public', 'uploads');
    if (!existsSync(uploadsDir)) {
      await mkdir(uploadsDir, { recursive: true });
    }

    // Save file
    const filepath = join(uploadsDir, filename);
    const buffer = Buffer.from(await file.arrayBuffer());
    await writeFile(filepath, buffer);

    // Get image dimensions if possible
    let width = null;
    let height = null;

    // For now we'll skip dimension extraction and let the browser handle it
    // You could add a library like 'sharp' for server-side dimension extraction

    const url = `/uploads/${filename}`;

    // Insert into database
    const [newMedia] = await db.insert(media).values({
      filename,
      originalName: file.name,
      url,
      mimeType: file.type,
      size: file.size,
      width,
      height,
      alt,
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
