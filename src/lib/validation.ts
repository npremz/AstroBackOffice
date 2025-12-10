import { z } from 'zod';
import DOMPurify from 'isomorphic-dompurify';

// Schema field definition
export const schemaFieldSchema = z.object({
  label: z.string().min(1).max(100),
  type: z.enum(['text', 'textarea', 'number', 'richtext', 'image']),
  key: z.string().min(1).max(50).regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'Key must start with a letter and contain only alphanumeric characters and underscores'),
  required: z.boolean(),
});

// Slug validation - only allow safe characters
export const slugSchema = z.string()
  .min(1)
  .max(200)
  .regex(/^[a-z0-9]+(?:[-\/][a-z0-9]+)*$/, 'Slug must be lowercase alphanumeric with hyphens or slashes');

// Template validation - only allow safe template names
export const templateSchema = z.string()
  .min(1)
  .max(50)
  .regex(/^[A-Z][a-zA-Z0-9]*Layout$/, 'Template must be a valid layout name (e.g., BaseLayout)');

// Collection schemas
export const createCollectionSchema = z.object({
  slug: slugSchema,
  schema: z.array(schemaFieldSchema).min(1).max(50),
});

export const updateCollectionSchema = createCollectionSchema.partial();

// Entry schemas
export const createEntrySchema = z.object({
  collectionId: z.number().int().positive(),
  slug: slugSchema,
  data: z.record(z.unknown()),
  template: templateSchema,
});

export const updateEntrySchema = z.object({
  data: z.record(z.unknown()).optional(),
  slug: slugSchema.optional(),
  template: templateSchema.optional(),
});

// Content module schemas
export const createContentModuleSchema = z.object({
  slug: slugSchema,
  name: z.string().min(1).max(100),
  schema: z.array(schemaFieldSchema).min(1).max(50),
  data: z.record(z.unknown()).optional(),
});

export const updateContentModuleSchema = createContentModuleSchema.partial();

// Media schemas
export const updateMediaSchema = z.object({
  alt: z.string().max(500).optional(),
});

// Auth schemas
export const loginSchema = z.object({
  email: z.string().email().max(255),
  password: z.string().min(1).max(200),
});

// Sanitize HTML content (for richtext fields)
export function sanitizeHtml(dirty: string): string {
  // Configure DOMPurify to block data: URIs in src attributes
  DOMPurify.addHook('uponSanitizeAttribute', (node, data) => {
    if (data.attrName === 'src' && data.attrValue?.startsWith('data:')) {
      // Only allow safe data: URIs (images)
      if (!data.attrValue.match(/^data:image\/(png|gif|jpeg|webp);base64,/i)) {
        data.attrValue = '';
      }
    }
  });
  
  const result = DOMPurify.sanitize(dirty, {
    ALLOWED_TAGS: [
      'p', 'br', 'strong', 'em', 'u', 's', 'a', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'blockquote', 'code', 'pre',
      'img', 'span', 'div'
    ],
    ALLOWED_ATTR: ['href', 'target', 'rel', 'src', 'alt', 'class'],
    ALLOW_DATA_ATTR: false,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'style', 'iframe', 'form', 'input', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onload', 'onclick', 'onmouseover', 'style'],
  });
  
  // Remove hook to avoid interference with subsequent calls
  DOMPurify.removeHook('uponSanitizeAttribute');
  
  return result;
}

// Sanitize entry data based on collection schema
export function sanitizeEntryData(
  data: Record<string, unknown>,
  schema: Array<{ key: string; type: string }>
): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  
  for (const field of schema) {
    const value = data[field.key];
    
    if (value === undefined || value === null) {
      sanitized[field.key] = field.type === 'number' ? 0 : '';
      continue;
    }
    
    switch (field.type) {
      case 'richtext':
        sanitized[field.key] = typeof value === 'string' ? sanitizeHtml(value) : '';
        break;
      case 'text':
      case 'textarea':
      case 'image':
        // Escape but don't strip - these shouldn't contain HTML
        sanitized[field.key] = typeof value === 'string' ? value.slice(0, 10000) : '';
        break;
      case 'number':
        const num = typeof value === 'number' ? value : parseFloat(String(value));
        sanitized[field.key] = Number.isNaN(num) ? 0 : num;
        break;
      default:
        sanitized[field.key] = typeof value === 'string' ? value.slice(0, 10000) : '';
    }
  }
  
  return sanitized;
}

// Validate and parse request body with Zod schema
export async function validateBody<T>(
  request: Request,
  schema: z.ZodSchema<T>
): Promise<{ success: true; data: T } | { success: false; error: string }> {
  try {
    const body = await request.json();
    const result = schema.safeParse(body);
    
    if (!result.success) {
      const errors = result.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join(', ');
      return { success: false, error: errors };
    }
    
    return { success: true, data: result.data };
  } catch {
    return { success: false, error: 'Invalid JSON body' };
  }
}

// Helper to create validation error response
export function validationError(message: string): Response {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { 'Content-Type': 'application/json' }
  });
}
