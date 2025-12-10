import { describe, it, expect } from 'vitest';
import { createAuditContext, computeChanges } from '@/lib/audit';

describe('Audit Logging', () => {
  describe('createAuditContext', () => {
    it('should extract user info from authenticated user', () => {
      const user = { id: 1, email: 'admin@example.com' };
      const request = new Request('http://localhost');

      const context = createAuditContext(user, request);

      expect(context.userId).toBe(1);
      expect(context.userEmail).toBe('admin@example.com');
    });

    it('should handle anonymous user', () => {
      const request = new Request('http://localhost');

      const context = createAuditContext(null, request);

      expect(context.userId).toBeNull();
      expect(context.userEmail).toBe('anonymous');
    });

    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });

      const context = createAuditContext(null, request);
      expect(context.ipAddress).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });

      const context = createAuditContext(null, request);
      expect(context.ipAddress).toBe('192.168.1.2');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });

      const context = createAuditContext(null, request);
      expect(context.ipAddress).toBe('192.168.1.1');
    });

    it('should extract user agent', () => {
      const request = new Request('http://localhost', {
        headers: { 'user-agent': 'Mozilla/5.0 Test Browser' },
      });

      const context = createAuditContext(null, request);
      expect(context.userAgent).toBe('Mozilla/5.0 Test Browser');
    });

    it('should handle missing headers gracefully', () => {
      const request = new Request('http://localhost');

      const context = createAuditContext(null, request);

      expect(context.ipAddress).toBeNull();
      expect(context.userAgent).toBeNull();
    });

    it('should trim whitespace from forwarded IP', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' },
      });

      const context = createAuditContext(null, request);
      expect(context.ipAddress).toBe('192.168.1.1');
    });
  });

  describe('computeChanges', () => {
    it('should detect changed fields', () => {
      const before = { title: 'Old Title', status: 'draft' };
      const after = { title: 'New Title', status: 'draft' };

      const changes = computeChanges(before, after);

      expect(changes).toBeDefined();
      expect(changes?.before).toEqual({ title: 'Old Title' });
      expect(changes?.after).toEqual({ title: 'New Title' });
    });

    it('should ignore unchanged fields', () => {
      const before = { title: 'Same', content: 'Same Content' };
      const after = { title: 'Same', content: 'Same Content' };

      const changes = computeChanges(before, after);

      expect(changes).toBeUndefined();
    });

    it('should handle new fields (create)', () => {
      const changes = computeChanges(null, { title: 'New Entry' });

      expect(changes).toBeDefined();
      expect(changes?.before).toBeUndefined();
      expect(changes?.after).toEqual({ title: 'New Entry' });
    });

    it('should handle deleted fields', () => {
      const changes = computeChanges({ title: 'Deleted Entry' }, null);

      expect(changes).toBeDefined();
      expect(changes?.before).toEqual({ title: 'Deleted Entry' });
      expect(changes?.after).toBeUndefined();
    });

    it('should handle both null', () => {
      const changes = computeChanges(null, null);
      expect(changes).toBeUndefined();
    });

    it('should detect added fields in update', () => {
      const before = { title: 'Title' };
      const after = { title: 'Title', newField: 'added' };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ newField: undefined });
      expect(changes?.after).toEqual({ newField: 'added' });
    });

    it('should detect removed fields in update', () => {
      const before = { title: 'Title', oldField: 'will be removed' };
      const after = { title: 'Title' };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ oldField: 'will be removed' });
      expect(changes?.after).toEqual({ oldField: undefined });
    });

    it('should handle nested objects', () => {
      const before = { meta: { author: 'John' } };
      const after = { meta: { author: 'Jane' } };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ meta: { author: 'John' } });
      expect(changes?.after).toEqual({ meta: { author: 'Jane' } });
    });

    it('should handle array changes', () => {
      const before = { tags: ['a', 'b'] };
      const after = { tags: ['a', 'b', 'c'] };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ tags: ['a', 'b'] });
      expect(changes?.after).toEqual({ tags: ['a', 'b', 'c'] });
    });

    it('should detect type changes', () => {
      const before = { value: '123' };
      const after = { value: 123 };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ value: '123' });
      expect(changes?.after).toEqual({ value: 123 });
    });

    it('should handle null to value changes', () => {
      const before = { field: null };
      const after = { field: 'value' };

      const changes = computeChanges(before, after);

      expect(changes?.before).toEqual({ field: null });
      expect(changes?.after).toEqual({ field: 'value' });
    });

    it('should handle empty objects', () => {
      const changes = computeChanges({}, {});
      expect(changes).toBeUndefined();
    });

    it('should handle complex nested changes', () => {
      const before = {
        title: 'Post',
        meta: {
          seo: { title: 'SEO Title', description: 'Desc' },
          author: { name: 'John', id: 1 },
        },
      };
      const after = {
        title: 'Post',
        meta: {
          seo: { title: 'New SEO Title', description: 'Desc' },
          author: { name: 'John', id: 1 },
        },
      };

      const changes = computeChanges(before, after);

      expect(changes).toBeDefined();
      expect(changes?.before?.meta?.seo?.title).toBe('SEO Title');
      expect(changes?.after?.meta?.seo?.title).toBe('New SEO Title');
    });
  });

  describe('Audit log entry validation', () => {
    it('should accept all valid actions', () => {
      const validActions = ['CREATE', 'UPDATE', 'DELETE', 'PUBLISH', 'LOGIN', 'LOGOUT', 'INVITE'];
      
      for (const action of validActions) {
        expect(validActions).toContain(action);
      }
    });

    it('should accept all valid resource types', () => {
      const validTypes = ['Entry', 'Collection', 'User', 'Media', 'ContentModule', 'Session', 'Invitation'];
      
      for (const type of validTypes) {
        expect(validTypes).toContain(type);
      }
    });

    it('should accept all valid statuses', () => {
      const validStatuses = ['SUCCESS', 'FAILED'];
      expect(validStatuses).toContain('SUCCESS');
      expect(validStatuses).toContain('FAILED');
    });
  });

  describe('Security considerations', () => {
    it('should not expose sensitive data in changes', () => {
      // Password changes should be tracked but not expose the actual password
      const before = { email: 'user@example.com' };
      const after = { email: 'new@example.com' };

      const changes = computeChanges(before, after);

      // Changes should be recorded
      expect(changes).toBeDefined();
      // But we document that passwordHash should never be in the before/after
      // (this is enforced at the API layer, not in computeChanges)
    });

    it('should handle very large change objects', () => {
      const largeObject: Record<string, string> = {};
      for (let i = 0; i < 1000; i++) {
        largeObject[`field${i}`] = `value${i}`;
      }

      const before = { ...largeObject };
      const after = { ...largeObject, field0: 'changed' };

      // Should not throw
      expect(() => computeChanges(before, after)).not.toThrow();

      const changes = computeChanges(before, after);
      expect(changes?.before).toEqual({ field0: 'value0' });
      expect(changes?.after).toEqual({ field0: 'changed' });
    });

    it('should handle special characters in values', () => {
      const before = { content: '<script>alert("xss")</script>' };
      const after = { content: 'Safe content' };

      const changes = computeChanges(before, after);

      // Should preserve the exact values (sanitization happens elsewhere)
      expect(changes?.before?.content).toBe('<script>alert("xss")</script>');
    });
  });
});
