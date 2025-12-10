import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { entries, collections } from '../../../db/schema';
import { eq } from 'drizzle-orm';
import { createEntrySchema, validateBody, validationError, sanitizeEntryData } from '@/lib/validation';

// GET all entries or entries by collection
export const GET: APIRoute = async ({ url }) => {
  try {
    const collectionId = url.searchParams.get('collectionId');

    let allEntries;
    if (collectionId) {
      const parsed = parseInt(collectionId);
      if (isNaN(parsed) || parsed < 1) {
        return validationError('Invalid collectionId');
      }
      allEntries = await db.select().from(entries).where(eq(entries.collectionId, parsed));
    } else {
      allEntries = await db.select().from(entries);
    }

    return new Response(JSON.stringify(allEntries), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to fetch entries' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// POST new entry
export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate input
    const validation = await validateBody(request, createEntrySchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { collectionId, slug, data, template } = validation.data;

    // Get collection schema to sanitize data
    const [collection] = await db.select().from(collections).where(eq(collections.id, collectionId));
    if (!collection) {
      return validationError('Collection not found');
    }

    // Sanitize entry data based on schema
    const sanitizedData = sanitizeEntryData(data as Record<string, unknown>, collection.schema);

    const [newEntry] = await db.insert(entries).values({
      collectionId,
      slug,
      data: sanitizedData,
      template,
      publishedAt: new Date()
    }).returning();

    return new Response(JSON.stringify(newEntry), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create entry error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create entry' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
