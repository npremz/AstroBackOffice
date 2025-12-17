import { zxcvbn, zxcvbnOptions } from '@zxcvbn-ts/core';
import * as zxcvbnCommonPackage from '@zxcvbn-ts/language-common';
import * as zxcvbnEnPackage from '@zxcvbn-ts/language-en';

// Initialize zxcvbn with dictionaries
zxcvbnOptions.setOptions({
  translations: zxcvbnEnPackage.translations,
  graphs: zxcvbnCommonPackage.adjacencyGraphs,
  dictionary: {
    ...zxcvbnCommonPackage.dictionary,
    ...zxcvbnEnPackage.dictionary,
  },
});

// Password policy configuration
export const PASSWORD_POLICY = {
  minLength: 12,
  maxLength: 128,
  requireUppercase: true,
  requireLowercase: true,
  requireNumber: true,
  requireSpecial: true,
  minZxcvbnScore: 3, // 0-4, where 3 = "safely unguessable"
} as const;

// Error messages
const ERRORS = {
  tooShort: `Password must be at least ${PASSWORD_POLICY.minLength} characters`,
  tooLong: `Password must not exceed ${PASSWORD_POLICY.maxLength} characters`,
  noUppercase: 'Password must contain at least one uppercase letter',
  noLowercase: 'Password must contain at least one lowercase letter',
  noNumber: 'Password must contain at least one number',
  noSpecial: 'Password must contain at least one special character (!@#$%^&*...)',
  tooWeak: 'Password is too weak or easily guessable',
} as const;

export interface PasswordValidationResult {
  valid: boolean;
  score: number;
  errors: string[];
  suggestions: string[];
  crackTime: string;
}

export function validatePassword(password: string): PasswordValidationResult {
  const errors: string[] = [];

  // Length checks
  if (password.length < PASSWORD_POLICY.minLength) {
    errors.push(ERRORS.tooShort);
  }
  if (password.length > PASSWORD_POLICY.maxLength) {
    errors.push(ERRORS.tooLong);
  }

  // Character type checks
  if (PASSWORD_POLICY.requireUppercase && !/[A-Z]/.test(password)) {
    errors.push(ERRORS.noUppercase);
  }
  if (PASSWORD_POLICY.requireLowercase && !/[a-z]/.test(password)) {
    errors.push(ERRORS.noLowercase);
  }
  if (PASSWORD_POLICY.requireNumber && !/\d/.test(password)) {
    errors.push(ERRORS.noNumber);
  }
  if (PASSWORD_POLICY.requireSpecial && !/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?`~]/.test(password)) {
    errors.push(ERRORS.noSpecial);
  }

  // zxcvbn strength analysis
  const result = zxcvbn(password);
  const score = result.score;
  const crackTime = result.crackTimesDisplay.offlineSlowHashing1e4PerSecond;
  const suggestions = result.feedback.suggestions || [];

  // Check minimum strength score
  if (score < PASSWORD_POLICY.minZxcvbnScore) {
    errors.push(ERRORS.tooWeak);
  }

  return {
    valid: errors.length === 0,
    score,
    errors,
    suggestions,
    crackTime,
  };
}

// Export error messages for use in Zod schema
export { ERRORS as PASSWORD_ERRORS };
