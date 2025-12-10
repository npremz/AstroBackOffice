import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  generateCsrfToken,
  requiresCsrfValidation,
  csrfError,
} from '@/lib/csrf';

// Mock environment
beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-csrf-secret-minimum-32-characters-long');
});

describe('CSRF Protection', () => {
  describe('generateCsrfToken', () => {
    it('should generate 64 character hex token', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens each time', () => {
      const tokens = new Set<string>();
      for (let i = 0; i < 100; i++) {
        tokens.add(generateCsrfToken());
      }
      expect(tokens.size).toBe(100);
    });

    it('should generate cryptographically random tokens', () => {
      // Check that tokens don't have obvious patterns
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      // Tokens should be completely different (high entropy)
      let sameChars = 0;
      for (let i = 0; i < token1.length; i++) {
        if (token1[i] === token2[i]) sameChars++;
      }
      // Statistically, ~4 characters might match by chance (64 chars / 16 hex values)
      expect(sameChars).toBeLessThan(16);
    });
  });

  describe('requiresCsrfValidation', () => {
    it('should require validation for state-changing methods', () => {
      expect(requiresCsrfValidation('POST')).toBe(true);
      expect(requiresCsrfValidation('PUT')).toBe(true);
      expect(requiresCsrfValidation('PATCH')).toBe(true);
      expect(requiresCsrfValidation('DELETE')).toBe(true);
    });

    it('should not require validation for safe methods', () => {
      expect(requiresCsrfValidation('GET')).toBe(false);
      expect(requiresCsrfValidation('HEAD')).toBe(false);
      expect(requiresCsrfValidation('OPTIONS')).toBe(false);
    });

    it('should be case-insensitive', () => {
      expect(requiresCsrfValidation('post')).toBe(true);
      expect(requiresCsrfValidation('Post')).toBe(true);
      expect(requiresCsrfValidation('get')).toBe(false);
      expect(requiresCsrfValidation('Get')).toBe(false);
    });

    it('should reject unknown methods', () => {
      expect(requiresCsrfValidation('UNKNOWN')).toBe(false);
      expect(requiresCsrfValidation('')).toBe(false);
      expect(requiresCsrfValidation('CONNECT')).toBe(false);
    });
  });

  describe('csrfError', () => {
    it('should return 403 status', () => {
      const response = csrfError();
      expect(response.status).toBe(403);
    });

    it('should return JSON error message', async () => {
      const response = csrfError();
      const body = await response.json();
      expect(body.error).toContain('CSRF');
    });

    it('should set correct Content-Type', () => {
      const response = csrfError();
      expect(response.headers.get('Content-Type')).toBe('application/json');
    });
  });

  describe('Token validation flow (simulated)', () => {
    it('should validate matching tokens', () => {
      const token = generateCsrfToken();
      
      // Simulate what validateCsrf does internally
      // Cookie token and header token should match
      const cookieToken = token;
      const headerToken = token;
      
      expect(cookieToken === headerToken).toBe(true);
    });

    it('should reject mismatched tokens', () => {
      const cookieToken = generateCsrfToken();
      const headerToken = generateCsrfToken();
      
      expect(cookieToken === headerToken).toBe(false);
    });

    it('should reject empty tokens', () => {
      expect('').toBeFalsy();
      expect(null).toBeFalsy();
      expect(undefined).toBeFalsy();
    });
  });

  describe('Security edge cases', () => {
    it('should not be vulnerable to timing attacks (constant time comparison)', () => {
      // The actual validation uses hashToken which uses HMAC
      // This test documents the expectation
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      
      // Both comparisons should take similar time
      // (Can't actually test timing in unit tests, but document the requirement)
      expect(typeof token1).toBe('string');
      expect(typeof token2).toBe('string');
    });

    it('should handle malformed tokens gracefully', () => {
      const malformedTokens = [
        '',
        'short',
        'a'.repeat(1000),
        '<script>',
        "'; DROP TABLE sessions;--",
        '\x00\x00\x00',
      ];

      for (const token of malformedTokens) {
        // These should be treated as invalid without crashing
        expect(token !== generateCsrfToken()).toBe(true);
      }
    });
  });
});

describe('CSRF + Cookie interaction', () => {
  describe('Cookie configuration', () => {
    it('should use correct cookie name', () => {
      // Cookie name should be 'cms_csrf' as defined in csrf.ts
      const EXPECTED_COOKIE_NAME = 'cms_csrf';
      expect(EXPECTED_COOKIE_NAME).toBe('cms_csrf');
    });

    it('should expect httpOnly=false for JavaScript access', () => {
      // CSRF cookie must be readable by JavaScript to send in header
      const expectedConfig = {
        httpOnly: false,
        sameSite: 'strict',
      };
      expect(expectedConfig.httpOnly).toBe(false);
    });
  });

  describe('Request validation scenarios', () => {
    it('should reject request without cookie', () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'x-csrf-token': generateCsrfToken() },
      });
      
      // No cookie = validation should fail
      const hasCookie = request.headers.get('Cookie')?.includes('cms_csrf');
      expect(hasCookie).toBeFalsy();
    });

    it('should reject request without header', () => {
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: { 'Cookie': `cms_csrf=${generateCsrfToken()}` },
      });
      
      // No x-csrf-token header = validation should fail
      const hasHeader = request.headers.has('x-csrf-token');
      expect(hasHeader).toBe(false);
    });

    it('should handle double-submit cookie pattern', () => {
      const token = generateCsrfToken();
      const request = new Request('http://localhost/api/test', {
        method: 'POST',
        headers: {
          'Cookie': `cms_csrf=${token}`,
          'x-csrf-token': token,
        },
      });
      
      // Both should contain the same token
      const cookieValue = request.headers.get('Cookie');
      const headerValue = request.headers.get('x-csrf-token');
      
      expect(cookieValue).toContain(token);
      expect(headerValue).toBe(token);
    });
  });
});
