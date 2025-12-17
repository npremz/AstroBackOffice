import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isOriginAllowed,
  getCorsHeaders,
  getPreflightHeaders,
  createPreflightResponse,
  applyCorsHeaders,
  isPreflightRequest,
  getCorsConfig,
  type CorsConfig,
} from '@/lib/cors';

describe('cors', () => {
  const createRequest = (options: {
    origin?: string;
    method?: string;
    headers?: Record<string, string>;
  } = {}): Request => {
    const headers = new Headers(options.headers);
    if (options.origin) {
      headers.set('Origin', options.origin);
    }
    return new Request('http://localhost:4321/api/test', {
      method: options.method || 'GET',
      headers,
    });
  };

  describe('isOriginAllowed', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
      vi.stubEnv('ALLOWED_ORIGINS', '');
    });

    it('should allow same-origin requests (null origin)', () => {
      expect(isOriginAllowed(null)).toBe(true);
    });

    it('should allow localhost in development', () => {
      vi.stubEnv('NODE_ENV', 'development');
      expect(isOriginAllowed('http://localhost:4321')).toBe(true);
      expect(isOriginAllowed('http://localhost:3000')).toBe(true);
      expect(isOriginAllowed('http://127.0.0.1:4321')).toBe(true);
    });

    it('should reject unknown origins in production without config', () => {
      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('ALLOWED_ORIGINS', '');

      const config: CorsConfig = {
        allowedOrigins: [],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      expect(isOriginAllowed('http://evil.com', config)).toBe(false);
    });

    it('should allow configured origins', () => {
      const config: CorsConfig = {
        allowedOrigins: ['https://myapp.com', 'https://admin.myapp.com'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      expect(isOriginAllowed('https://myapp.com', config)).toBe(true);
      expect(isOriginAllowed('https://admin.myapp.com', config)).toBe(true);
      expect(isOriginAllowed('https://evil.com', config)).toBe(false);
    });

    it('should support wildcard subdomain matching', () => {
      const config: CorsConfig = {
        allowedOrigins: ['*.example.com'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      expect(isOriginAllowed('https://app.example.com', config)).toBe(true);
      expect(isOriginAllowed('https://api.example.com', config)).toBe(true);
      expect(isOriginAllowed('https://sub.app.example.com', config)).toBe(true);
      expect(isOriginAllowed('https://evil.com', config)).toBe(false);
    });
  });

  describe('getCorsHeaders', () => {
    it('should return empty headers for same-origin requests', () => {
      const request = createRequest(); // No Origin header
      const headers = getCorsHeaders(request);

      expect(Object.keys(headers)).toHaveLength(0);
    });

    it('should return CORS headers for allowed origins', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const headers = getCorsHeaders(request, config);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
      expect(headers['Vary']).toBe('Origin');
    });

    it('should not return CORS headers for disallowed origins', () => {
      const config: CorsConfig = {
        allowedOrigins: ['https://trusted.com'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'https://evil.com' });
      const headers = getCorsHeaders(request, config);

      expect(headers['Access-Control-Allow-Origin']).toBeUndefined();
    });

    it('should reflect the specific origin, not use wildcard', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const headers = getCorsHeaders(request, config);

      // Should reflect specific origin, never '*' when credentials are used
      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });
  });

  describe('getPreflightHeaders', () => {
    it('should include all preflight headers for allowed origins', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST', 'PUT', 'DELETE'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-CSRF-Token'],
        exposedHeaders: ['X-CSRF-Token'],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const headers = getPreflightHeaders(request, config);

      expect(headers['Access-Control-Allow-Origin']).toBe('http://localhost:3000');
      expect(headers['Access-Control-Allow-Methods']).toBe('GET, POST, PUT, DELETE');
      expect(headers['Access-Control-Allow-Headers']).toBe('Content-Type, Authorization, X-CSRF-Token');
      expect(headers['Access-Control-Expose-Headers']).toBe('X-CSRF-Token');
      expect(headers['Access-Control-Max-Age']).toBe('86400');
      expect(headers['Access-Control-Allow-Credentials']).toBe('true');
    });

    it('should not include preflight headers for disallowed origins', () => {
      const config: CorsConfig = {
        allowedOrigins: ['https://trusted.com'],
        allowedMethods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'https://evil.com' });
      const headers = getPreflightHeaders(request, config);

      expect(headers['Access-Control-Allow-Methods']).toBeUndefined();
      expect(headers['Access-Control-Allow-Headers']).toBeUndefined();
    });
  });

  describe('createPreflightResponse', () => {
    it('should return a 204 response with preflight headers', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET', 'POST'],
        allowedHeaders: ['Content-Type'],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const response = createPreflightResponse(request, config);

      expect(response.status).toBe(204);
      expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(response.headers.get('Access-Control-Allow-Methods')).toBe('GET, POST');
    });

    it('should return empty body', async () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const response = createPreflightResponse(request, config);
      const body = await response.text();

      expect(body).toBe('');
    });
  });

  describe('applyCorsHeaders', () => {
    it('should apply CORS headers to an existing response', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const originalResponse = new Response(JSON.stringify({ data: 'test' }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const request = createRequest({ origin: 'http://localhost:3000' });
      const corsResponse = applyCorsHeaders(originalResponse, request, config);

      expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
      expect(corsResponse.headers.get('Content-Type')).toBe('application/json');
      expect(corsResponse.status).toBe(200);
    });

    it('should preserve original response body', async () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const originalBody = JSON.stringify({ test: 'data' });
      const originalResponse = new Response(originalBody, {
        headers: { 'Content-Type': 'application/json' },
      });

      const request = createRequest({ origin: 'http://localhost:3000' });
      const corsResponse = applyCorsHeaders(originalResponse, request, config);
      const body = await corsResponse.text();

      expect(body).toBe(originalBody);
    });

    it('should return original response if no CORS headers needed', () => {
      const config: CorsConfig = {
        allowedOrigins: ['https://trusted.com'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const originalResponse = new Response('test');
      const request = createRequest(); // No origin header

      const corsResponse = applyCorsHeaders(originalResponse, request, config);

      expect(corsResponse.headers.get('Access-Control-Allow-Origin')).toBeNull();
    });
  });

  describe('isPreflightRequest', () => {
    it('should identify preflight requests', () => {
      const request = createRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
        headers: {
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(isPreflightRequest(request)).toBe(true);
    });

    it('should not identify regular OPTIONS as preflight', () => {
      const request = createRequest({
        method: 'OPTIONS',
        origin: 'http://localhost:3000',
        // Missing Access-Control-Request-Method header
      });

      expect(isPreflightRequest(request)).toBe(false);
    });

    it('should not identify non-OPTIONS as preflight', () => {
      const request = createRequest({
        method: 'POST',
        origin: 'http://localhost:3000',
        headers: {
          'Access-Control-Request-Method': 'POST',
        },
      });

      expect(isPreflightRequest(request)).toBe(false);
    });

    it('should not identify requests without origin as preflight', () => {
      const headers = new Headers({
        'Access-Control-Request-Method': 'POST',
      });
      const request = new Request('http://localhost:4321/api/test', {
        method: 'OPTIONS',
        headers,
      });

      expect(isPreflightRequest(request)).toBe(false);
    });
  });

  describe('getCorsConfig', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'development');
    });

    it('should return a copy of the config', () => {
      const config1 = getCorsConfig();
      const config2 = getCorsConfig();

      expect(config1).toEqual(config2);
      expect(config1).not.toBe(config2); // Different object references
    });

    it('should have sensible defaults', () => {
      const config = getCorsConfig();

      expect(config.allowedMethods).toContain('GET');
      expect(config.allowedMethods).toContain('POST');
      expect(config.allowedMethods).toContain('PUT');
      expect(config.allowedMethods).toContain('DELETE');
      expect(config.allowedHeaders).toContain('Content-Type');
      expect(config.allowedHeaders).toContain('Authorization');
      expect(config.allowedHeaders).toContain('X-CSRF-Token');
      expect(config.allowCredentials).toBe(true);
      expect(config.maxAge).toBeGreaterThan(0);
    });
  });

  describe('Security considerations', () => {
    it('should never use wildcard (*) with credentials', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const headers = getCorsHeaders(request, config);

      // When credentials are allowed, Access-Control-Allow-Origin must be specific
      expect(headers['Access-Control-Allow-Origin']).not.toBe('*');
    });

    it('should include Vary header for proper caching', () => {
      const config: CorsConfig = {
        allowedOrigins: ['http://localhost:3000'],
        allowedMethods: ['GET'],
        allowedHeaders: [],
        exposedHeaders: [],
        allowCredentials: true,
        maxAge: 86400,
      };

      const request = createRequest({ origin: 'http://localhost:3000' });
      const headers = getCorsHeaders(request, config);

      // Vary header ensures caches handle CORS correctly
      expect(headers['Vary']).toBe('Origin');
    });

    it('should not expose sensitive headers by default', () => {
      const config = getCorsConfig();

      // Should not expose sensitive headers like Set-Cookie
      expect(config.exposedHeaders).not.toContain('Set-Cookie');
    });
  });
});
