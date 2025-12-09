import type { APIRoute } from 'astro';
import { db } from '@/db';
import { media } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';

// PUT /api/media/[id] - Update media metadata
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id as string);
    const { alt } = await request.json();

    const [updated] = await db
      .update(media)
      .set({ alt })
      .where(eq(media.id, id))
      .returning();

    if (!updated) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating media:', error);
    return new Response(JSON.stringify({ error: 'Failed to update media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/media/[id] - Delete media
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id as string);

    // Get media info first
    const [mediaItem] = await db.select().from(media).where(eq(media.id, id));

    if (!mediaItem) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete file from filesystem
    const filepath = join(process.cwd(), 'public', 'uploads', mediaItem.filename);
    try {
      await unlink(filepath);
    } catch (error) {
      console.warn('File not found on filesystem:', filepath);
    }

    // Delete from database
    await db.delete(media).where(eq(media.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
