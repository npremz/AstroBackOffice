import type { APIRoute } from 'astro';
import { db } from '@/db';
import { files } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { unlink } from 'fs/promises';
import { join } from 'path';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';

// GET /api/files/[id] - Get single file
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [file] = await db.select().from(files).where(eq(files.id, id));

    if (!file) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(file), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error fetching file:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT /api/files/[id] - Update file metadata
export const PUT: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);

  try {
    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [existingFile] = await db.select().from(files).where(eq(files.id, id));
    if (!existingFile) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const body = await request.json();
    const { description } = body;

    const [updatedFile] = await db.update(files)
      .set({ 
        description: description?.slice(0, 500) || existingFile.description 
      })
      .where(eq(files.id, id))
      .returning();

    await logAudit(auditContext, {
      action: 'UPDATE',
      resourceType: 'File',
      resourceId: id,
      resourceName: existingFile.originalName,
      changes: { 
        before: { description: existingFile.description },
        after: { description: updatedFile.description }
      },
    });

    return new Response(JSON.stringify(updatedFile), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error updating file:', error);
    return new Response(JSON.stringify({ error: 'Failed to update file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE /api/files/[id] - Delete file
export const DELETE: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);

  try {
    const id = parseInt(params.id!);
    if (isNaN(id)) {
      return new Response(JSON.stringify({ error: 'Invalid file ID' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const [file] = await db.select().from(files).where(eq(files.id, id));
    if (!file) {
      return new Response(JSON.stringify({ error: 'File not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Delete file from filesystem
    try {
      const filepath = join(process.cwd(), 'public', file.url);
      await unlink(filepath);
    } catch (fsError) {
      console.warn('Could not delete file from filesystem:', fsError);
    }

    // Delete from database
    await db.delete(files).where(eq(files.id, id));

    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'File',
      resourceId: id,
      resourceName: file.originalName,
      changes: { before: { filename: file.filename, originalName: file.originalName, mimeType: file.mimeType } },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Error deleting file:', error);
    await logAudit(auditContext, {
      action: 'DELETE',
      resourceType: 'File',
      resourceId: parseInt(params.id!),
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to delete file' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
