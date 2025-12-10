import type { APIRoute } from 'astro';
import { db } from '@/db';
import { media } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext, computeChanges } from '@/lib/audit';

// PUT /api/media/[id] - Update media metadata
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id as string);

  try {
    // Get current media for audit
    const [currentMedia] = await db.select().from(media).where(eq(media.id, id));
    if (!currentMedia) {
      return new Response(JSON.stringify({ error: 'Media not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const { alt } = await request.json();

    const [updated] = await db
      .update(media)
      .set({ alt })
      .where(eq(media.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Media',
      resourceId: id,
      resourceName: updated.originalName,
      changes: computeChanges({ alt: currentMedia.alt }, { alt: updated.alt }),
    });

    return new Response(JSON.stringify(updated), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating media:', error);
    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'Media',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to update media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/media/[id] - Delete media
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id as string);

  try {
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

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'Media',
      resourceId: id,
      resourceName: mediaItem.originalName,
      changes: { before: { filename: mediaItem.filename, originalName: mediaItem.originalName, mimeType: mediaItem.mimeType } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting media:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'Media',
      resourceId: id,
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete media' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
