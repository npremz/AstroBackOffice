import type { APIRoute } from 'astro';
import { db } from '../../../db';
import { collections } from '../../../db/schema';
import { sql } from 'drizzle-orm';
import { createCollectionSchema, validateBody, validationError } from '@/lib/validation';
import { parsePaginationParams, getOffset, paginatedResponse } from '@/lib/pagination';

export const GET: APIRoute = async ({ url }) => {
  try {
    const pagination = parsePaginationParams(url);
    const offset = getOffset(pagination);

    // Get total count
    const [{ count }] = await db.select({ count: sql<number>`count(*)` }).from(collections);
    const total = Number(count);

    // Get paginated data
    const data = await db.select().from(collections).limit(pagination.limit).offset(offset);

    return new Response(JSON.stringify(paginatedResponse(data, pagination, total)), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Fetch collections error:', error);
    return new Response(JSON.stringify({ error: 'Failed to fetch collections' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

export const POST: APIRoute = async ({ request }) => {
  try {
    // Validate input
    const validation = await validateBody(request, createCollectionSchema);
    if (!validation.success) {
      return validationError(validation.error);
    }

    const { slug, schema } = validation.data;

    const [newCollection] = await db.insert(collections).values({
      slug,
      schema
    }).returning();

    return new Response(JSON.stringify(newCollection), {
      status: 201,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    console.error('Create collection error:', error);
    return new Response(JSON.stringify({ error: 'Failed to create collection' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
