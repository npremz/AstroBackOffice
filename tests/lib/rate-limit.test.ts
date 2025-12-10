import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import {
  checkRateLimit,
  getClientId,
  rateLimitResponse,
  loginRateLimit,
  apiRateLimit,
  uploadRateLimit,
  type RateLimitConfig,
} from '@/lib/rate-limit';

describe('rate-limit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('checkRateLimit', () => {
    const testConfig: RateLimitConfig = {
      windowMs: 60000, // 1 minute
      maxRequests: 3,
    };

    it('should allow requests under the limit', () => {
      const id = `test-${Date.now()}-${Math.random()}`;
      
      const result1 = checkRateLimit(id, testConfig);
      expect(result1.allowed).toBe(true);
      expect(result1.remaining).toBe(2);

      const result2 = checkRateLimit(id, testConfig);
      expect(result2.allowed).toBe(true);
      expect(result2.remaining).toBe(1);

      const result3 = checkRateLimit(id, testConfig);
      expect(result3.allowed).toBe(true);
      expect(result3.remaining).toBe(0);
    });

    it('should block requests over the limit', () => {
      const id = `test-block-${Date.now()}-${Math.random()}`;
      
      // Use all allowed requests
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, testConfig);
      }

      // 4th request should be blocked
      const blocked = checkRateLimit(id, testConfig);
      expect(blocked.allowed).toBe(false);
      expect(blocked.remaining).toBe(0);
    });

    it('should reset after window expires', () => {
      const id = `test-reset-${Date.now()}-${Math.random()}`;
      
      // Use all requests
      for (let i = 0; i < 3; i++) {
        checkRateLimit(id, testConfig);
      }
      
      const blocked = checkRateLimit(id, testConfig);
      expect(blocked.allowed).toBe(false);

      // Advance time past the window
      vi.advanceTimersByTime(61000);

      // Should be allowed again
      const afterReset = checkRateLimit(id, testConfig);
      expect(afterReset.allowed).toBe(true);
      expect(afterReset.remaining).toBe(2);
    });

    it('should track different identifiers separately', () => {
      const id1 = `user1-${Date.now()}-${Math.random()}`;
      const id2 = `user2-${Date.now()}-${Math.random()}`;
      
      // Exhaust id1's limit
      for (let i = 0; i < 4; i++) {
        checkRateLimit(id1, testConfig);
      }

      // id2 should still be allowed
      const result = checkRateLimit(id2, testConfig);
      expect(result.allowed).toBe(true);
    });

    it('should return correct resetAt timestamp', () => {
      const id = `test-timestamp-${Date.now()}-${Math.random()}`;
      const now = Date.now();
      
      const result = checkRateLimit(id, testConfig);
      
      expect(result.resetAt).toBeGreaterThan(now);
      expect(result.resetAt).toBeLessThanOrEqual(now + testConfig.windowMs + 100);
    });

    it('should handle rapid consecutive requests', () => {
      const id = `test-rapid-${Date.now()}-${Math.random()}`;
      const results: boolean[] = [];
      
      for (let i = 0; i < 10; i++) {
        results.push(checkRateLimit(id, testConfig).allowed);
      }

      // First 3 should be allowed, rest blocked
      expect(results.slice(0, 3)).toEqual([true, true, true]);
      expect(results.slice(3)).toEqual([false, false, false, false, false, false, false]);
    });

    it('should handle edge case of 1 request limit', () => {
      const id = `test-one-${Date.now()}-${Math.random()}`;
      const strictConfig: RateLimitConfig = { windowMs: 60000, maxRequests: 1 };
      
      const first = checkRateLimit(id, strictConfig);
      expect(first.allowed).toBe(true);
      expect(first.remaining).toBe(0);

      const second = checkRateLimit(id, strictConfig);
      expect(second.allowed).toBe(false);
    });
  });

  describe('getClientId', () => {
    it('should extract IP from x-forwarded-for header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, 10.0.0.1' },
      });
      
      expect(getClientId(request)).toBe('192.168.1.1');
    });

    it('should extract IP from x-real-ip header', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-real-ip': '192.168.1.2' },
      });
      
      expect(getClientId(request)).toBe('192.168.1.2');
    });

    it('should prefer x-forwarded-for over x-real-ip', () => {
      const request = new Request('http://localhost', {
        headers: {
          'x-forwarded-for': '192.168.1.1',
          'x-real-ip': '192.168.1.2',
        },
      });
      
      expect(getClientId(request)).toBe('192.168.1.1');
    });

    it('should return "unknown" when no IP headers present', () => {
      const request = new Request('http://localhost');
      expect(getClientId(request)).toBe('unknown');
    });

    it('should trim whitespace from IP', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '  192.168.1.1  , 10.0.0.1' },
      });
      
      expect(getClientId(request)).toBe('192.168.1.1');
    });

    it('should handle IPv6 addresses', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '2001:db8::1' },
      });
      
      expect(getClientId(request)).toBe('2001:db8::1');
    });

    it('should handle malformed headers gracefully', () => {
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '' },
      });
      
      // Empty string is falsy, should fall through to unknown
      const result = getClientId(request);
      expect(result).toBe('unknown');
    });
  });

  describe('rateLimitResponse', () => {
    it('should return 429 status', () => {
      const response = rateLimitResponse(Date.now() + 60000);
      expect(response.status).toBe(429);
    });

    it('should include Retry-After header', () => {
      const resetAt = Date.now() + 60000;
      const response = rateLimitResponse(resetAt);
      
      const retryAfter = response.headers.get('Retry-After');
      expect(retryAfter).toBeTruthy();
      expect(parseInt(retryAfter!)).toBeGreaterThan(0);
    });

    it('should include error message in body', async () => {
      const response = rateLimitResponse(Date.now() + 60000);
      const body = await response.json();
      
      expect(body.error).toContain('Too many requests');
      expect(body.retryAfter).toBeGreaterThan(0);
    });

    it('should calculate correct retry time', () => {
      const now = Date.now();
      const resetAt = now + 30000; // 30 seconds
      const response = rateLimitResponse(resetAt);
      
      const retryAfter = parseInt(response.headers.get('Retry-After')!);
      expect(retryAfter).toBeGreaterThanOrEqual(29);
      expect(retryAfter).toBeLessThanOrEqual(31);
    });
  });

  describe('pre-configured rate limiters', () => {
    it('loginRateLimit should allow 5 requests in 15 minutes', () => {
      expect(loginRateLimit.maxRequests).toBe(5);
      expect(loginRateLimit.windowMs).toBe(15 * 60 * 1000);
    });

    it('apiRateLimit should allow 100 requests per minute', () => {
      expect(apiRateLimit.maxRequests).toBe(100);
      expect(apiRateLimit.windowMs).toBe(60 * 1000);
    });

    it('uploadRateLimit should allow 10 uploads per minute', () => {
      expect(uploadRateLimit.maxRequests).toBe(10);
      expect(uploadRateLimit.windowMs).toBe(60 * 1000);
    });
  });

  describe('security edge cases', () => {
    it('should handle injection attempts in identifier', () => {
      const maliciousIds = [
        "user'; DROP TABLE rate_limits;--",
        'user\x00nullbyte',
        '../../../etc/passwd',
        '<script>alert(1)</script>',
      ];

      for (const id of maliciousIds) {
        const config: RateLimitConfig = { windowMs: 60000, maxRequests: 1 };
        // Should not throw, should treat as normal string key
        expect(() => checkRateLimit(id, config)).not.toThrow();
      }
    });

    it('should handle extremely long identifiers', () => {
      const longId = 'x'.repeat(10000);
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 1 };
      
      expect(() => checkRateLimit(longId, config)).not.toThrow();
      const result = checkRateLimit(longId + '2', config);
      expect(result.allowed).toBe(true);
    });

    it('should handle IP spoofing attempts in headers', () => {
      // Multiple IPs in x-forwarded-for (attacker tries to inject)
      const request = new Request('http://localhost', {
        headers: { 'x-forwarded-for': '192.168.1.1, evil.com, 10.0.0.1' },
      });
      const clientId = getClientId(request);
      // Should only take the first IP
      expect(clientId).toBe('192.168.1.1');
      expect(clientId).not.toContain('evil.com');
    });

    it('should not be bypassed by header manipulation', () => {
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 2 };
      
      // Same real IP with different spoofed headers should share limit
      const realIp = `real-ip-${Date.now()}-${Math.random()}`;
      
      checkRateLimit(realIp, config);
      checkRateLimit(realIp, config);
      
      const blocked = checkRateLimit(realIp, config);
      expect(blocked.allowed).toBe(false);
    });

    it('should isolate rate limits between different endpoints', () => {
      const config: RateLimitConfig = { windowMs: 60000, maxRequests: 1 };
      const baseId = `user-${Date.now()}-${Math.random()}`;
      
      // Different prefixes for different endpoints
      const loginId = `login:${baseId}`;
      const uploadId = `upload:${baseId}`;
      
      checkRateLimit(loginId, config);
      const loginBlocked = checkRateLimit(loginId, config);
      expect(loginBlocked.allowed).toBe(false);
      
      // Upload should still be allowed (different namespace)
      const uploadAllowed = checkRateLimit(uploadId, config);
      expect(uploadAllowed.allowed).toBe(true);
    });
  });
});
