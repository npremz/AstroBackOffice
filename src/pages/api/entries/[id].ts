import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, revisions, collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { updateEntrySchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

// GET single entry
export const GET: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    const [entry] = await db.select().from(entries).where(eq(entries.id, id));

    if (!entry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(entry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// PUT update entry
export const PUT: APIRoute = async ({ params, request }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Validate input
    const validation = await validateBody(request, updateEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { data, slug, template } = validation.data;

    // Get current entry and its collection
    const [currentEntry] = await db.select().from(entries).where(eq(entries.id, id));
    if (!currentEntry) {
      return new Response(JSON.stringify({ error: 'Entry not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Get collection schema for sanitization
    const [collection] = await db.select().from(collections).where(eq(collections.id, currentEntry.collectionId));

    // Create a revision before updating
    await db.insert(revisions).values({
      entryId: id,
      data: currentEntry.data,
      createdAt: new Date(),
      status: 'archived'
    });

    // Sanitize data if provided
    const sanitizedData = data && collection 
      ? sanitizeEntryData(data as Record<string, unknown>, collection.schema)
      : currentEntry.data;

    // Update entry
    const [updatedEntry] = await db.update(entries)
      .set({ 
        data: sanitizedData, 
        slug: slug ?? currentEntry.slug, 
        template: template ?? currentEntry.template, 
        publishedAt: new Date() 
      })
      .where(eq(entries.id, id))
      .returning();

    return new Response(JSON.stringify(updatedEntry), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Update entry error:', error);
    return new Response(JSON.stringify({ error: 'Failed to update entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// DELETE entry
export const DELETE: APIRoute = async ({ params }) => {
  try {
    const id = parseInt(params.id!);
    if (isNaN(id) || id < 1) {
      return validationError('Invalid entry ID');
    }

    // Delete revisions first (cascade)
    await db.delete(revisions).where(eq(revisions.entryId, id));
    
    // Then delete the entry
    await db.delete(entries).where(eq(entries.id, id));

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Delete entry error:', error);
    return new Response(JSON.stringify({ error: 'Failed to delete entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
