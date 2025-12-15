import type { APIRoute } from 'astro';
import { db } from '../../../../db';
import { contentModules } from '../../../../db/schema';
import { eq } from 'drizzle-orm';
import { requireAuth } from '@/lib/auth';
import { logAudit, createAuditContext } from '@/lib/audit';
import { validationError } from '@/lib/validation';

// POST duplicate content module (single type)
export const POST: APIRoute = async ({ params, request, cookies }) => {
  const auth = await requireAuth(cookies);
  if ('response' in auth) return auth.response;

  const auditContext = createAuditContext(auth.user, request);
  const id = parseInt(params.id!);

  try {
    if (isNaN(id) || id < 1) {
      return validationError('Invalid content module ID');
    }

    // Get the original content module
    const [originalModule] = await db.select().from(contentModules).where(eq(contentModules.id, id));
    if (!originalModule) {
      return new Response(JSON.stringify({ error: 'Content module not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Generate unique slug by appending -copy or -copy-N
    let newSlug = `${originalModule.slug}-copy`;
    let newName = `${originalModule.name} (Copy)`;
    let counter = 1;
    
    // Check if slug exists and find unique one
    while (true) {
      const existingModules = await db.select({ id: contentModules.id })
        .from(contentModules)
        .where(eq(contentModules.slug, newSlug));
      
      if (existingModules.length === 0) break;
      
      counter++;
      newSlug = `${originalModule.slug}-copy-${counter}`;
      newName = `${originalModule.name} (Copy ${counter})`;
      
      // Safety limit
      if (counter > 100) {
        return new Response(JSON.stringify({ error: 'Could not generate unique slug' }), {
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }

    // Create the duplicate content module
    const [duplicatedModule] = await db.insert(contentModules).values({
      slug: newSlug,
      name: newName,
      schema: originalModule.schema,
      data: originalModule.data,
      updatedAt: new Date(),
    }).returning();

    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'ContentModule',
      resourceId: duplicatedModule.id,
      resourceName: duplicatedModule.slug,
      changes: { 
        after: { 
          slug: duplicatedModule.slug, 
          name: duplicatedModule.name,
          duplicatedFrom: originalModule.id,
          originalSlug: originalModule.slug 
        } 
      },
    });

    return new Response(JSON.stringify({
      ...duplicatedModule,
      originalId: originalModule.id,
      originalSlug: originalModule.slug,
    }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Duplicate content module error:', error);
    await logAudit(auditContext, {
      action: 'CREATE',
      resourceType: 'ContentModule',
      resourceName: 'duplicate',
      status: 'FAILED',
      errorMessage: error instanceof Error ? error.message : 'Unknown error',
    });
    return new Response(JSON.stringify({ error: 'Failed to duplicate content module' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
