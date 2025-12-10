import { describe, it, expect } from 'vitest';
import {
  normalizeEmail,
  hashPassword,
  verifyPassword,
  ensureRole,
  ALLOWED_ROLES,
} from '@/lib/auth';

describe('auth', () => {
  describe('normalizeEmail', () => {
    it('should lowercase email', () => {
      expect(normalizeEmail('Test@Example.COM')).toBe('test@example.com');
    });

    it('should trim whitespace', () => {
      expect(normalizeEmail('  test@example.com  ')).toBe('test@example.com');
    });

    it('should handle both trim and lowercase', () => {
      expect(normalizeEmail('  Test@EXAMPLE.com  ')).toBe('test@example.com');
    });

    it('should handle empty string', () => {
      expect(normalizeEmail('')).toBe('');
    });

    it('should handle unicode characters', () => {
      expect(normalizeEmail('Tëst@Exämple.COM')).toBe('tëst@exämple.com');
    });

    it('should handle tabs and newlines', () => {
      expect(normalizeEmail('\t\ntest@example.com\r\n')).toBe('test@example.com');
    });
  });

  describe('hashPassword / verifyPassword', () => {
    it('should hash and verify a password', () => {
      const password = 'mySecurePassword123!';
      const hash = hashPassword(password);

      expect(hash).toMatch(/^scrypt:[a-f0-9]+:[a-f0-9]+$/);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should reject wrong password', () => {
      const hash = hashPassword('correctPassword');
      expect(verifyPassword('wrongPassword', hash)).toBe(false);
    });

    it('should generate unique hashes for same password (salt randomness)', () => {
      const password = 'samePassword';
      const hash1 = hashPassword(password);
      const hash2 = hashPassword(password);

      expect(hash1).not.toBe(hash2);
      expect(verifyPassword(password, hash1)).toBe(true);
      expect(verifyPassword(password, hash2)).toBe(true);
    });

    it('should reject malformed hash formats', () => {
      expect(verifyPassword('password', 'invalid')).toBe(false);
      expect(verifyPassword('password', 'wrong:format')).toBe(false);
      expect(verifyPassword('password', 'scrypt::')).toBe(false);
      expect(verifyPassword('password', 'bcrypt:salt:hash')).toBe(false);
      expect(verifyPassword('password', '')).toBe(false);
    });

    it('should handle empty password', () => {
      const hash = hashPassword('');
      expect(verifyPassword('', hash)).toBe(true);
      expect(verifyPassword('notEmpty', hash)).toBe(false);
    });

    it('should handle very long passwords', () => {
      const longPassword = 'a'.repeat(1000);
      const hash = hashPassword(longPassword);
      expect(verifyPassword(longPassword, hash)).toBe(true);
      expect(verifyPassword(longPassword + 'b', hash)).toBe(false);
    });

    it('should handle unicode passwords', () => {
      const password = '密码🔐émojis';
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('密码🔐émoji', hash)).toBe(false);
    });

    it('should handle special characters', () => {
      const password = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/\\`~';
      const hash = hashPassword(password);
      expect(verifyPassword(password, hash)).toBe(true);
    });

    it('should be case sensitive', () => {
      const hash = hashPassword('Password');
      expect(verifyPassword('password', hash)).toBe(false);
      expect(verifyPassword('PASSWORD', hash)).toBe(false);
    });

    it('should reject tampered hash', () => {
      const hash = hashPassword('password');
      const [method, salt, hashValue] = hash.split(':');
      const tamperedHash = `${method}:${salt}:${'0'.repeat(hashValue.length)}`;
      expect(verifyPassword('password', tamperedHash)).toBe(false);
    });

    it('should reject hash with modified salt', () => {
      const hash = hashPassword('password');
      const [method, salt, hashValue] = hash.split(':');
      const modifiedSalt = 'a'.repeat(salt.length);
      const tamperedHash = `${method}:${modifiedSalt}:${hashValue}`;
      expect(verifyPassword('password', tamperedHash)).toBe(false);
    });

    it('should handle null byte injection in password', () => {
      const password = 'before\x00after';
      const hash = hashPassword(password);
      // Should verify exact match including null byte
      expect(verifyPassword(password, hash)).toBe(true);
      expect(verifyPassword('before', hash)).toBe(false);
      expect(verifyPassword('after', hash)).toBe(false);
    });

    it('should produce hash of consistent format', () => {
      for (let i = 0; i < 10; i++) {
        const hash = hashPassword(`password${i}`);
        const parts = hash.split(':');
        expect(parts).toHaveLength(3);
        expect(parts[0]).toBe('scrypt');
        expect(parts[1]).toMatch(/^[a-f0-9]{32}$/); // 16 bytes = 32 hex chars
        expect(parts[2]).toMatch(/^[a-f0-9]{128}$/); // 64 bytes = 128 hex chars
      }
    });
  });

  describe('ensureRole', () => {
    it('should accept valid roles', () => {
      expect(ensureRole('super_admin')).toBe(true);
      expect(ensureRole('editor')).toBe(true);
      expect(ensureRole('viewer')).toBe(true);
    });

    it('should reject invalid roles', () => {
      expect(ensureRole('admin')).toBe(false);
      expect(ensureRole('user')).toBe(false);
      expect(ensureRole('')).toBe(false);
    });

    it('should reject role injection attempts', () => {
      expect(ensureRole('super_admin; DROP TABLE users;')).toBe(false);
      expect(ensureRole('editor\x00admin')).toBe(false);
      expect(ensureRole('SUPER_ADMIN')).toBe(false);
    });

    it('should reject roles with extra whitespace', () => {
      expect(ensureRole(' editor')).toBe(false);
      expect(ensureRole('editor ')).toBe(false);
      expect(ensureRole(' editor ')).toBe(false);
    });
  });

  describe('ALLOWED_ROLES', () => {
    it('should contain expected roles', () => {
      expect(ALLOWED_ROLES).toContain('super_admin');
      expect(ALLOWED_ROLES).toContain('editor');
      expect(ALLOWED_ROLES).toContain('viewer');
      expect(ALLOWED_ROLES).toHaveLength(3);
    });

    it('should be a readonly tuple (TypeScript enforced)', () => {
      // ALLOWED_ROLES is typed as readonly, mutations would cause TS errors
      // At runtime, we verify the array contents are as expected
      expect(Array.isArray(ALLOWED_ROLES)).toBe(true);
      expect([...ALLOWED_ROLES]).toEqual(['super_admin', 'editor', 'viewer']);
    });
  });
});
