import { describe, it, expect } from 'vitest';
import {
  slugSchema,
  templateSchema,
  schemaFieldSchema,
  loginSchema,
  sanitizeHtml,
  sanitizeEntryData,
  createCollectionSchema,
  createEntrySchema,
} from '@/lib/validation';

describe('validation', () => {
  describe('slugSchema', () => {
    it('should accept valid slugs', () => {
      expect(slugSchema.safeParse('my-slug').success).toBe(true);
      expect(slugSchema.safeParse('article').success).toBe(true);
      expect(slugSchema.safeParse('blog/post-1').success).toBe(true);
      expect(slugSchema.safeParse('a1b2c3').success).toBe(true);
      expect(slugSchema.safeParse('a').success).toBe(true);
    });

    it('should reject invalid slugs', () => {
      expect(slugSchema.safeParse('My-Slug').success).toBe(false); // uppercase
      expect(slugSchema.safeParse('my slug').success).toBe(false); // space
      expect(slugSchema.safeParse('-my-slug').success).toBe(false); // starts with hyphen
      expect(slugSchema.safeParse('my-slug-').success).toBe(false); // ends with hyphen
      expect(slugSchema.safeParse('').success).toBe(false); // empty
      expect(slugSchema.safeParse('/slug').success).toBe(false); // starts with slash
      expect(slugSchema.safeParse('slug/').success).toBe(false); // ends with slash
      expect(slugSchema.safeParse('slug--double').success).toBe(false); // double hyphen
    });

    it('should reject path traversal attempts', () => {
      expect(slugSchema.safeParse('../etc/passwd').success).toBe(false);
      expect(slugSchema.safeParse('..%2f..%2fetc').success).toBe(false);
      expect(slugSchema.safeParse('slug/../admin').success).toBe(false);
    });

    it('should reject special characters and injection', () => {
      expect(slugSchema.safeParse('slug<script>').success).toBe(false);
      expect(slugSchema.safeParse("slug'; DROP TABLE").success).toBe(false);
      expect(slugSchema.safeParse('slug\x00null').success).toBe(false);
      expect(slugSchema.safeParse('slug\ninjection').success).toBe(false);
    });

    it('should enforce max length', () => {
      const longSlug = 'a'.repeat(201);
      expect(slugSchema.safeParse(longSlug).success).toBe(false);
      const maxSlug = 'a'.repeat(200);
      expect(slugSchema.safeParse(maxSlug).success).toBe(true);
    });
  });

  describe('templateSchema', () => {
    it('should accept valid template names', () => {
      expect(templateSchema.safeParse('BaseLayout').success).toBe(true);
      expect(templateSchema.safeParse('ArticleLayout').success).toBe(true);
      expect(templateSchema.safeParse('Blog123Layout').success).toBe(true);
      expect(templateSchema.safeParse('ALayout').success).toBe(true);
    });

    it('should reject invalid template names', () => {
      expect(templateSchema.safeParse('baseLayout').success).toBe(false); // lowercase start
      expect(templateSchema.safeParse('Base').success).toBe(false); // no Layout suffix
      expect(templateSchema.safeParse('Layout').success).toBe(false); // just Layout
      expect(templateSchema.safeParse('base-layout').success).toBe(false); // hyphen
      expect(templateSchema.safeParse('').success).toBe(false);
    });

    it('should reject injection attempts', () => {
      expect(templateSchema.safeParse('BaseLayout<script>').success).toBe(false);
      expect(templateSchema.safeParse('Base/../Layout').success).toBe(false);
      expect(templateSchema.safeParse('BaseLayout; rm -rf').success).toBe(false);
    });
  });

  describe('schemaFieldSchema', () => {
    it('should accept valid field definitions', () => {
      const field = { label: 'Title', type: 'text', key: 'title', required: true };
      expect(schemaFieldSchema.safeParse(field).success).toBe(true);
    });

    it('should accept all valid types', () => {
      const types = ['text', 'textarea', 'number', 'richtext', 'image'];
      types.forEach(type => {
        const field = { label: 'Field', type, key: 'field', required: false };
        expect(schemaFieldSchema.safeParse(field).success).toBe(true);
      });
    });

    it('should accept valid key formats', () => {
      expect(schemaFieldSchema.safeParse({ label: 'F', type: 'text', key: 'myKey', required: false }).success).toBe(true);
      expect(schemaFieldSchema.safeParse({ label: 'F', type: 'text', key: 'my_key', required: false }).success).toBe(true);
      expect(schemaFieldSchema.safeParse({ label: 'F', type: 'text', key: 'myKey123', required: false }).success).toBe(true);
      expect(schemaFieldSchema.safeParse({ label: 'F', type: 'text', key: 'a', required: false }).success).toBe(true);
    });

    it('should reject invalid key format', () => {
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'text', key: '123start', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'text', key: 'my-key', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'text', key: '', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'text', key: '_underscore', required: true }).success).toBe(false);
    });

    it('should reject invalid type', () => {
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'invalid', key: 'title', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: 'script', key: 'title', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'Title', type: '', key: 'title', required: true }).success).toBe(false);
    });

    it('should enforce label constraints', () => {
      expect(schemaFieldSchema.safeParse({ label: '', type: 'text', key: 'title', required: true }).success).toBe(false);
      expect(schemaFieldSchema.safeParse({ label: 'a'.repeat(101), type: 'text', key: 'title', required: true }).success).toBe(false);
    });

    it('should enforce key length constraints', () => {
      expect(schemaFieldSchema.safeParse({ label: 'F', type: 'text', key: 'a'.repeat(51), required: true }).success).toBe(false);
    });
  });

  describe('loginSchema', () => {
    it('should accept valid login data', () => {
      expect(loginSchema.safeParse({ email: 'test@example.com', password: 'password123' }).success).toBe(true);
      expect(loginSchema.safeParse({ email: 'a@b.co', password: 'p' }).success).toBe(true);
    });

    it('should reject invalid email', () => {
      expect(loginSchema.safeParse({ email: 'not-an-email', password: 'password123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: '', password: 'password123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: 'test@', password: 'password123' }).success).toBe(false);
      expect(loginSchema.safeParse({ email: '@example.com', password: 'password123' }).success).toBe(false);
    });

    it('should reject empty password', () => {
      expect(loginSchema.safeParse({ email: 'test@example.com', password: '' }).success).toBe(false);
    });

    it('should enforce email max length', () => {
      const longEmail = 'a'.repeat(250) + '@b.com';
      expect(loginSchema.safeParse({ email: longEmail, password: 'pass' }).success).toBe(false);
    });

    it('should enforce password max length', () => {
      const longPassword = 'a'.repeat(201);
      expect(loginSchema.safeParse({ email: 'test@example.com', password: longPassword }).success).toBe(false);
    });

    it('should reject missing fields', () => {
      expect(loginSchema.safeParse({ email: 'test@example.com' }).success).toBe(false);
      expect(loginSchema.safeParse({ password: 'password' }).success).toBe(false);
      expect(loginSchema.safeParse({}).success).toBe(false);
    });
  });

  describe('createCollectionSchema', () => {
    it('should accept valid collection', () => {
      const collection = {
        slug: 'articles',
        schema: [{ label: 'Title', type: 'text', key: 'title', required: true }],
      };
      expect(createCollectionSchema.safeParse(collection).success).toBe(true);
    });

    it('should reject empty schema', () => {
      const collection = { slug: 'articles', schema: [] };
      expect(createCollectionSchema.safeParse(collection).success).toBe(false);
    });

    it('should enforce schema max size', () => {
      const schema = Array(51).fill({ label: 'F', type: 'text', key: 'f', required: false });
      expect(createCollectionSchema.safeParse({ slug: 'test', schema }).success).toBe(false);
    });
  });

  describe('sanitizeHtml', () => {
    it('should allow safe HTML tags', () => {
      const input = '<p>Hello <strong>world</strong></p>';
      expect(sanitizeHtml(input)).toBe(input);
    });

    it('should allow common formatting tags', () => {
      expect(sanitizeHtml('<em>italic</em>')).toBe('<em>italic</em>');
      expect(sanitizeHtml('<u>underline</u>')).toBe('<u>underline</u>');
      expect(sanitizeHtml('<s>strikethrough</s>')).toBe('<s>strikethrough</s>');
      expect(sanitizeHtml('<br>')).toContain('br');
    });

    it('should allow headings', () => {
      expect(sanitizeHtml('<h1>Title</h1>')).toBe('<h1>Title</h1>');
      expect(sanitizeHtml('<h6>Small</h6>')).toBe('<h6>Small</h6>');
    });

    it('should allow lists', () => {
      expect(sanitizeHtml('<ul><li>Item</li></ul>')).toBe('<ul><li>Item</li></ul>');
      expect(sanitizeHtml('<ol><li>Item</li></ol>')).toBe('<ol><li>Item</li></ol>');
    });

    it('should remove script tags', () => {
      expect(sanitizeHtml('<p>Hello</p><script>alert("xss")</script>')).toBe('<p>Hello</p>');
      expect(sanitizeHtml('<script src="evil.js"></script>')).toBe('');
      expect(sanitizeHtml('<SCRIPT>alert(1)</SCRIPT>')).toBe('');
    });

    it('should remove dangerous event handlers', () => {
      expect(sanitizeHtml('<p onclick="alert(1)">Hello</p>')).toBe('<p>Hello</p>');
      expect(sanitizeHtml('<img onerror="alert(1)" src="x">')).not.toContain('onerror');
      expect(sanitizeHtml('<body onload="alert(1)">')).not.toContain('onload');
      expect(sanitizeHtml('<div onmouseover="alert(1)">test</div>')).not.toContain('onmouseover');
    });

    it('should remove javascript: URLs', () => {
      const result = sanitizeHtml('<a href="javascript:alert(1)">Click</a>');
      expect(result).not.toContain('javascript:');
    });

    it('should allow safe link attributes', () => {
      const input = '<a href="https://example.com" target="_blank">Link</a>';
      const result = sanitizeHtml(input);
      expect(result).toContain('href="https://example.com"');
    });

    it('should remove iframe tags', () => {
      expect(sanitizeHtml('<iframe src="https://evil.com"></iframe>')).toBe('');
      expect(sanitizeHtml('<iframe srcdoc="<script>alert(1)</script>">')).toBe('');
    });

    it('should remove form elements', () => {
      expect(sanitizeHtml('<form action="evil.com"><input></form>')).toBe('');
    });

    it('should remove object/embed tags', () => {
      expect(sanitizeHtml('<object data="evil.swf"></object>')).toBe('');
      expect(sanitizeHtml('<embed src="evil.swf">')).toBe('');
    });

    it('should handle nested malicious content', () => {
      expect(sanitizeHtml('<div><script>alert(1)</script><p>Safe</p></div>')).toBe('<div><p>Safe</p></div>');
    });

    it('should handle encoded XSS attempts', () => {
      // These should either be stripped or rendered harmless
      const result1 = sanitizeHtml('<img src="x" onerror="&#x61;lert(1)">');
      expect(result1).not.toContain('onerror');
    });

    it('should handle empty and whitespace input', () => {
      expect(sanitizeHtml('')).toBe('');
      expect(sanitizeHtml('   ')).toBe('   ');
    });

    it('should preserve plain text', () => {
      expect(sanitizeHtml('Hello World')).toBe('Hello World');
      expect(sanitizeHtml('Test < and > symbols')).toContain('Test');
    });

    // ADVANCED XSS ATTACK VECTORS
    it('should block SVG-based XSS attacks', () => {
      const result = sanitizeHtml('<svg onload="alert(1)"><circle/></svg>');
      expect(result).not.toContain('onload');
    });

    it('should block data: URI XSS in images', () => {
      const result = sanitizeHtml('<img src="data:text/html,<script>alert(1)</script>">');
      // Either removes the tag or sanitizes the src
      expect(result).not.toMatch(/data:text\/html/);
    });

    it('should block vbscript: URLs', () => {
      const result = sanitizeHtml('<a href="vbscript:msgbox(1)">Click</a>');
      expect(result).not.toContain('vbscript:');
    });

    it('should block expression() in style attributes', () => {
      const result = sanitizeHtml('<div style="background:expression(alert(1))">test</div>');
      expect(result).not.toContain('expression');
    });

    it('should block base tag injection', () => {
      const result = sanitizeHtml('<base href="http://evil.com/">');
      expect(result).toBe('');
    });

    it('should block meta refresh injection', () => {
      const result = sanitizeHtml('<meta http-equiv="refresh" content="0;url=http://evil.com">');
      expect(result).toBe('');
    });

    it('should block link tag injection', () => {
      const result = sanitizeHtml('<link rel="import" href="http://evil.com/evil.html">');
      expect(result).toBe('');
    });

    it('should handle mutation XSS attempts', () => {
      // This is a classic mutation XSS that bypasses some sanitizers
      const result = sanitizeHtml('<noscript><p title="</noscript><script>alert(1)</script>">');
      expect(result).not.toContain('<script>');
    });

    it('should block template tag abuse', () => {
      const result = sanitizeHtml('<template><script>alert(1)</script></template>');
      expect(result).not.toContain('<script>');
    });

    it('should block math tag XSS', () => {
      const result = sanitizeHtml('<math><mtext><table><mglyph><style><img src=x onerror=alert(1)>');
      expect(result).not.toContain('onerror');
    });

    it('should handle Unicode escapes in event handlers', () => {
      const result = sanitizeHtml('<img src=x on\\u0065rror=alert(1)>');
      expect(result).not.toMatch(/on.*error/i);
    });

    it('should handle newlines in dangerous attributes', () => {
      const result = sanitizeHtml('<img src=x one\nrror=alert(1)>');
      expect(result).not.toContain('alert');
    });
  });

  describe('sanitizeEntryData', () => {
    const schema = [
      { key: 'title', type: 'text' },
      { key: 'content', type: 'richtext' },
      { key: 'count', type: 'number' },
      { key: 'image', type: 'image' },
      { key: 'description', type: 'textarea' },
    ];

    it('should sanitize text fields', () => {
      const data = { title: 'Hello World' };
      const result = sanitizeEntryData(data, schema);
      expect(result.title).toBe('Hello World');
    });

    it('should sanitize richtext fields and remove XSS', () => {
      const data = { content: '<p>Hello</p><script>bad</script>' };
      const result = sanitizeEntryData(data, schema);
      expect(result.content).toBe('<p>Hello</p>');
    });

    it('should handle number fields', () => {
      expect(sanitizeEntryData({ count: 42 }, schema).count).toBe(42);
      expect(sanitizeEntryData({ count: 0 }, schema).count).toBe(0);
      expect(sanitizeEntryData({ count: -10 }, schema).count).toBe(-10);
      expect(sanitizeEntryData({ count: 3.14 }, schema).count).toBe(3.14);
    });

    it('should parse string numbers', () => {
      expect(sanitizeEntryData({ count: '123' }, schema).count).toBe(123);
      expect(sanitizeEntryData({ count: '3.14' }, schema).count).toBe(3.14);
      expect(sanitizeEntryData({ count: '-5' }, schema).count).toBe(-5);
    });

    it('should default missing fields to empty string or 0', () => {
      const result = sanitizeEntryData({}, schema);
      expect(result.title).toBe('');
      expect(result.content).toBe('');
      expect(result.image).toBe('');
      expect(result.description).toBe('');
    });

    it('should default invalid number to 0', () => {
      expect(sanitizeEntryData({ count: 'not a number' }, schema).count).toBe(0);
      expect(sanitizeEntryData({ count: NaN }, schema).count).toBe(0);
      expect(sanitizeEntryData({ count: undefined }, schema).count).toBe(0);
      expect(sanitizeEntryData({ count: null }, schema).count).toBe(0);
    });

    it('should truncate very long text fields', () => {
      const longText = 'a'.repeat(15000);
      const result = sanitizeEntryData({ title: longText }, schema);
      expect(result.title.length).toBeLessThanOrEqual(10000);
    });

    it('should handle null and undefined values', () => {
      const result = sanitizeEntryData({ title: null, content: undefined }, schema);
      expect(result.title).toBe('');
      expect(result.content).toBe('');
    });

    it('should only include fields defined in schema', () => {
      const data = { title: 'Test', unknownField: 'ignored', anotherField: 123 };
      const result = sanitizeEntryData(data, schema);
      expect(result).not.toHaveProperty('unknownField');
      expect(result).not.toHaveProperty('anotherField');
    });

    it('should handle non-string values for text fields', () => {
      const result = sanitizeEntryData({ title: 12345, description: { nested: 'object' } }, schema);
      expect(result.title).toBe('');
      expect(result.description).toBe('');
    });
  });
});
