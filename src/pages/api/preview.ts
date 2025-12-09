import type { APIRoute } from 'astro';

// Store preview data temporarily (in production, use Redis or similar)
const previewStore = new Map<string, any>();

// POST - Save preview data
export const POST: APIRoute = async ({ request }) => {
  try {
    const data = await request.json();
    const previewId = `preview-${Date.now()}-${Math.random().toString(36).substring(7)}`;

    // Store for 5 minutes
    previewStore.set(previewId, {
      data,
      expiresAt: Date.now() + 5 * 60 * 1000
    });

    // Clean up expired previews
    for (const [key, value] of previewStore.entries()) {
      if (value.expiresAt < Date.now()) {
        previewStore.delete(key);
      }
    }

    return new Response(JSON.stringify({ previewId }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to save preview' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};

// GET - Retrieve preview data
export const GET: APIRoute = async ({ url }) => {
  try {
    const previewId = url.searchParams.get('id');

    if (!previewId) {
      return new Response(JSON.stringify({ error: 'Preview ID required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    const preview = previewStore.get(previewId);

    if (!preview) {
      return new Response(JSON.stringify({ error: 'Preview not found or expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    if (preview.expiresAt < Date.now()) {
      previewStore.delete(previewId);
      return new Response(JSON.stringify({ error: 'Preview expired' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    return new Response(JSON.stringify(preview.data), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Failed to retrieve preview' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
};
