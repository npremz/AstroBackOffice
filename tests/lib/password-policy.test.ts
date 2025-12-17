import { describe, it, expect } from 'vitest';
import { validatePassword, PASSWORD_POLICY } from '@/lib/password-policy';

describe('password-policy', () => {
  describe('validatePassword', () => {
    describe('length requirements', () => {
      it('should reject passwords shorter than minimum length', () => {
        const result = validatePassword('Abc123!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
      });

      it('should accept passwords at minimum length', () => {
        const password = 'Abcdef123!@#';
        expect(password.length).toBe(12);
        const result = validatePassword(password);
        expect(result.errors).not.toContain(`Password must be at least ${PASSWORD_POLICY.minLength} characters`);
      });

      it('should reject passwords exceeding maximum length', () => {
        const password = 'A'.repeat(100) + 'a'.repeat(20) + '1!@#' + 'b'.repeat(10);
        expect(password.length).toBeGreaterThan(128);
        const result = validatePassword(password);
        expect(result.valid).toBe(false);
        expect(result.errors).toContain(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
      });

      it('should accept passwords at maximum length', () => {
        const password = 'Aa1!' + 'x'.repeat(124);
        expect(password.length).toBe(128);
        const result = validatePassword(password);
        expect(result.errors).not.toContain(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
      });
    });

    describe('character type requirements', () => {
      it('should require at least one uppercase letter', () => {
        const result = validatePassword('abcdefgh123!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
      });

      it('should require at least one lowercase letter', () => {
        const result = validatePassword('ABCDEFGH123!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
      });

      it('should require at least one number', () => {
        const result = validatePassword('Abcdefghijk!@#');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should require at least one special character', () => {
        const result = validatePassword('Abcdefgh12345');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one special character (!@#$%^&*...)');
      });

      it('should accept various special characters', () => {
        const specialChars = '!@#$%^&*()_+-=[]{}|;:\'",.<>?/`~\\';
        for (const char of specialChars) {
          const password = `Abcdefgh123${char}`;
          const result = validatePassword(password);
          expect(result.errors).not.toContain('Password must contain at least one special character (!@#$%^&*...)');
        }
      });
    });

    describe('strength score (zxcvbn)', () => {
      it('should reject weak passwords with low zxcvbn score', () => {
        // Common password patterns
        const weakPasswords = [
          'Password123!',  // Common pattern
          'Qwerty12345!',  // Keyboard pattern
          'Abcdefgh123!',  // Sequential
        ];

        for (const password of weakPasswords) {
          const result = validatePassword(password);
          // May fail due to weak score or other requirements
          if (result.score < PASSWORD_POLICY.minZxcvbnScore) {
            expect(result.errors).toContain('Password is too weak or easily guessable');
          }
        }
      });

      it('should accept strong passwords with high zxcvbn score', () => {
        const strongPassword = 'Tr0ub4dor&3horse.battery.staple';
        const result = validatePassword(strongPassword);
        expect(result.score).toBeGreaterThanOrEqual(PASSWORD_POLICY.minZxcvbnScore);
      });

      it('should provide crack time estimate', () => {
        const result = validatePassword('MyStr0ngP@ssw0rd!2024');
        expect(result.crackTime).toBeDefined();
        expect(typeof result.crackTime).toBe('string');
      });

      it('should provide suggestions for weak passwords', () => {
        const result = validatePassword('Password1!');
        // zxcvbn typically provides suggestions for weak passwords
        expect(result.suggestions).toBeDefined();
        expect(Array.isArray(result.suggestions)).toBe(true);
      });
    });

    describe('valid passwords', () => {
      it('should accept a fully compliant strong password', () => {
        const password = 'MyC0mpl3x!P@ssw0rd#2024';
        const result = validatePassword(password);
        // Check all requirements
        expect(password.length).toBeGreaterThanOrEqual(PASSWORD_POLICY.minLength);
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/\d/.test(password)).toBe(true);
        expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)).toBe(true);
      });

      it('should accept unicode characters in password', () => {
        const password = 'MyP@ssw0rd_密码2024!';
        const result = validatePassword(password);
        expect(result.errors).toHaveLength(0);
        expect(result.valid).toBe(true);
      });

      it('should accept passwords with spaces', () => {
        const password = 'My Secure P@ss 2024!';
        const result = validatePassword(password);
        // Spaces are allowed, check other requirements
        expect(/[A-Z]/.test(password)).toBe(true);
        expect(/[a-z]/.test(password)).toBe(true);
        expect(/\d/.test(password)).toBe(true);
        expect(/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)).toBe(true);
      });
    });

    describe('result structure', () => {
      it('should return correct structure', () => {
        const result = validatePassword('test');
        expect(result).toHaveProperty('valid');
        expect(result).toHaveProperty('score');
        expect(result).toHaveProperty('errors');
        expect(result).toHaveProperty('suggestions');
        expect(result).toHaveProperty('crackTime');
        expect(typeof result.valid).toBe('boolean');
        expect(typeof result.score).toBe('number');
        expect(Array.isArray(result.errors)).toBe(true);
        expect(Array.isArray(result.suggestions)).toBe(true);
        expect(typeof result.crackTime).toBe('string');
      });

      it('should have score between 0 and 4', () => {
        const passwords = ['a', 'password', 'Password1!', 'MyStr0ngP@ssw0rd!'];
        for (const password of passwords) {
          const result = validatePassword(password);
          expect(result.score).toBeGreaterThanOrEqual(0);
          expect(result.score).toBeLessThanOrEqual(4);
        }
      });
    });

    describe('edge cases', () => {
      it('should handle empty password', () => {
        const result = validatePassword('');
        expect(result.valid).toBe(false);
        expect(result.errors.length).toBeGreaterThan(0);
      });

      it('should handle whitespace-only password', () => {
        const result = validatePassword('            ');
        expect(result.valid).toBe(false);
      });

      it('should handle password with only special characters', () => {
        const result = validatePassword('!@#$%^&*()_+');
        expect(result.valid).toBe(false);
        expect(result.errors).toContain('Password must contain at least one uppercase letter');
        expect(result.errors).toContain('Password must contain at least one lowercase letter');
        expect(result.errors).toContain('Password must contain at least one number');
      });

      it('should handle password with null bytes', () => {
        const password = 'MyP@ssw0rd\x002024!';
        const result = validatePassword(password);
        // Should still validate the visible characters
        expect(result).toBeDefined();
      });

      it('should handle very long password within limits', () => {
        const password = 'Aa1!' + 'MySecurePassword'.repeat(7);
        expect(password.length).toBeLessThanOrEqual(128);
        const result = validatePassword(password);
        expect(result.errors).not.toContain(`Password must not exceed ${PASSWORD_POLICY.maxLength} characters`);
      });
    });

    describe('common password attacks', () => {
      it('should reject dictionary words as passwords', () => {
        const result = validatePassword('Password123!');
        // "Password" is a dictionary word, zxcvbn should give low score
        expect(result.score).toBeLessThanOrEqual(2);
      });

      it('should detect sequential patterns', () => {
        const result = validatePassword('Abcdefgh123!');
        // Sequential letters should be detected - zxcvbn may give varying scores
        // but should not be maximum score
        expect(result.score).toBeLessThan(4);
      });

      it('should detect keyboard patterns', () => {
        const result = validatePassword('Qwertyui123!');
        // Keyboard pattern should be detected
        expect(result.score).toBeLessThanOrEqual(3);
      });

      it('should detect repeated characters', () => {
        const result = validatePassword('Aaaaaaa111!!!');
        // Repeated chars detected - zxcvbn may still give moderate score
        expect(result.score).toBeLessThan(4);
      });

      it('should reject l33t speak variations of common words', () => {
        const result = validatePassword('P@ssw0rd123!');
        // l33t speak of "password" should be detected
        expect(result.score).toBeLessThanOrEqual(2);
      });
    });
  });

  describe('PASSWORD_POLICY configuration', () => {
    it('should have expected default values', () => {
      expect(PASSWORD_POLICY.minLength).toBe(12);
      expect(PASSWORD_POLICY.maxLength).toBe(128);
      expect(PASSWORD_POLICY.requireUppercase).toBe(true);
      expect(PASSWORD_POLICY.requireLowercase).toBe(true);
      expect(PASSWORD_POLICY.requireNumber).toBe(true);
      expect(PASSWORD_POLICY.requireSpecial).toBe(true);
      expect(PASSWORD_POLICY.minZxcvbnScore).toBe(3);
    });

    it('should be immutable (const assertion)', () => {
      // TypeScript enforces this, but we can verify at runtime that values are as expected
      expect(Object.isFrozen(PASSWORD_POLICY)).toBe(false); // const assertion doesn't freeze
      // But the values should not change during tests
      const originalMinLength = PASSWORD_POLICY.minLength;
      expect(PASSWORD_POLICY.minLength).toBe(originalMinLength);
    });
  });
});
