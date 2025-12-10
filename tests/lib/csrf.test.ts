import { describe, it, expect, beforeEach, vi } from 'vitest';
import { generateCsrfToken, requiresCsrfValidation } from '@/lib/csrf';

// Mock SESSION_SECRET for tests
beforeEach(() => {
  vi.stubEnv('SESSION_SECRET', 'test-secret-key-for-testing-only');
});

describe('csrf', () => {
  describe('generateCsrfToken', () => {
    it('should generate a 64-character hex string', () => {
      const token = generateCsrfToken();
      expect(token).toMatch(/^[a-f0-9]{64}$/);
    });

    it('should generate unique tokens', () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(token1).not.toBe(token2);
    });
  });

  describe('requiresCsrfValidation', () => {
    it('should require validation for POST', () => {
      expect(requiresCsrfValidation('POST')).toBe(true);
    });

    it('should require validation for PUT', () => {
      expect(requiresCsrfValidation('PUT')).toBe(true);
    });

    it('should require validation for PATCH', () => {
      expect(requiresCsrfValidation('PATCH')).toBe(true);
    });

    it('should require validation for DELETE', () => {
      expect(requiresCsrfValidation('DELETE')).toBe(true);
    });

    it('should not require validation for GET', () => {
      expect(requiresCsrfValidation('GET')).toBe(false);
    });

    it('should not require validation for OPTIONS', () => {
      expect(requiresCsrfValidation('OPTIONS')).toBe(false);
    });

    it('should handle lowercase methods', () => {
      expect(requiresCsrfValidation('post')).toBe(true);
      expect(requiresCsrfValidation('get')).toBe(false);
    });
  });
});
