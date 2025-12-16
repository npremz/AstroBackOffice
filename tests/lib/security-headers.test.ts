import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  buildCspHeader,
  buildPermissionsPolicyHeader,
  buildXFrameOptions,
  buildHstsHeader,
  getSecurityHeaders,
  applySecurityHeaders,
  getApiSecurityConfig,
  shouldRelaxSecurityHeaders,
  getRelaxedSecurityConfig,
  DEFAULT_CONFIG,
  type SecurityHeadersConfig,
  type ContentSecurityPolicy,
  type PermissionsPolicy,
} from '@/lib/security-headers';

describe('security-headers', () => {
  describe('buildCspHeader', () => {
    it('should build a valid CSP header with all directives', () => {
      const csp: ContentSecurityPolicy = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'"],
        styleSrc: ["'self'", 'https://fonts.googleapis.com'],
        imgSrc: ["'self'", 'data:', 'blob:'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        connectSrc: ["'self'"],
        mediaSrc: ["'self'"],
        objectSrc: ["'none'"],
        frameSrc: ["'none'"],
        frameAncestors: ["'none'"],
        baseUri: ["'self'"],
        formAction: ["'self'"],
        upgradeInsecureRequests: true,
      };

      const header = buildCspHeader(csp);

      expect(header).toContain("default-src 'self'");
      expect(header).toContain("script-src 'self' 'unsafe-inline'");
      expect(header).toContain("style-src 'self' https://fonts.googleapis.com");
      expect(header).toContain("img-src 'self' data: blob:");
      expect(header).toContain("font-src 'self' https://fonts.gstatic.com");
      expect(header).toContain("connect-src 'self'");
      expect(header).toContain("media-src 'self'");
      expect(header).toContain("object-src 'none'");
      expect(header).toContain("frame-src 'none'");
      expect(header).toContain("frame-ancestors 'none'");
      expect(header).toContain("base-uri 'self'");
      expect(header).toContain("form-action 'self'");
      expect(header).toContain('upgrade-insecure-requests');
    });

    it('should separate directives with semicolons', () => {
      const csp: ContentSecurityPolicy = {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        frameSrc: [],
        frameAncestors: [],
        baseUri: [],
        formAction: [],
        upgradeInsecureRequests: false,
      };

      const header = buildCspHeader(csp);
      const parts = header.split('; ');

      expect(parts.length).toBe(2);
      expect(parts[0]).toBe("default-src 'self'");
      expect(parts[1]).toBe("script-src 'self'");
    });

    it('should skip empty directives', () => {
      const csp: ContentSecurityPolicy = {
        defaultSrc: ["'self'"],
        scriptSrc: [],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        frameSrc: [],
        frameAncestors: [],
        baseUri: [],
        formAction: [],
        upgradeInsecureRequests: false,
      };

      const header = buildCspHeader(csp);

      expect(header).toBe("default-src 'self'");
      expect(header).not.toContain('script-src');
    });

    it('should not include upgrade-insecure-requests when disabled', () => {
      const csp: ContentSecurityPolicy = {
        defaultSrc: ["'self'"],
        scriptSrc: [],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        frameSrc: [],
        frameAncestors: [],
        baseUri: [],
        formAction: [],
        upgradeInsecureRequests: false,
      };

      const header = buildCspHeader(csp);

      expect(header).not.toContain('upgrade-insecure-requests');
    });

    it('should handle multiple sources correctly', () => {
      const csp: ContentSecurityPolicy = {
        defaultSrc: ["'self'", 'https://example.com', 'https://cdn.example.com'],
        scriptSrc: [],
        styleSrc: [],
        imgSrc: [],
        fontSrc: [],
        connectSrc: [],
        mediaSrc: [],
        objectSrc: [],
        frameSrc: [],
        frameAncestors: [],
        baseUri: [],
        formAction: [],
        upgradeInsecureRequests: false,
      };

      const header = buildCspHeader(csp);

      expect(header).toBe("default-src 'self' https://example.com https://cdn.example.com");
    });
  });

  describe('buildPermissionsPolicyHeader', () => {
    it('should build a valid Permissions-Policy header', () => {
      const policy: PermissionsPolicy = {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        fullscreen: ["'self'"],
        accelerometer: [],
        gyroscope: [],
        magnetometer: [],
      };

      const header = buildPermissionsPolicyHeader(policy);

      expect(header).toContain('camera=()');
      expect(header).toContain('microphone=()');
      expect(header).toContain('geolocation=()');
      expect(header).toContain('payment=()');
      expect(header).toContain('usb=()');
      expect(header).toContain("fullscreen=('self')");
      expect(header).toContain('accelerometer=()');
      expect(header).toContain('gyroscope=()');
      expect(header).toContain('magnetometer=()');
    });

    it('should convert camelCase to kebab-case', () => {
      const policy: PermissionsPolicy = {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        fullscreen: [],
        accelerometer: [],
        gyroscope: [],
        magnetometer: [],
      };

      const header = buildPermissionsPolicyHeader(policy);

      // These should NOT have uppercase letters
      expect(header).not.toMatch(/[A-Z]/);
    });

    it('should handle multiple origins in allowlist', () => {
      const policy: PermissionsPolicy = {
        camera: ["'self'", 'https://trusted.com'],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        fullscreen: [],
        accelerometer: [],
        gyroscope: [],
        magnetometer: [],
      };

      const header = buildPermissionsPolicyHeader(policy);

      expect(header).toContain("camera=('self' https://trusted.com)");
    });

    it('should use empty parentheses for denied features', () => {
      const policy: PermissionsPolicy = {
        camera: [],
        microphone: [],
        geolocation: [],
        payment: [],
        usb: [],
        fullscreen: [],
        accelerometer: [],
        gyroscope: [],
        magnetometer: [],
      };

      const header = buildPermissionsPolicyHeader(policy);

      expect(header).toContain('camera=()');
      expect(header).toContain('microphone=()');
    });
  });

  describe('buildXFrameOptions', () => {
    it('should return DENY for "none"', () => {
      expect(buildXFrameOptions('none')).toBe('DENY');
    });

    it('should return SAMEORIGIN for "self"', () => {
      expect(buildXFrameOptions('self')).toBe('SAMEORIGIN');
    });

    it('should return DENY for array (not supported by X-Frame-Options)', () => {
      expect(buildXFrameOptions(['https://example.com'])).toBe('DENY');
    });

    it('should return DENY for multiple origins', () => {
      expect(buildXFrameOptions(['https://a.com', 'https://b.com'])).toBe('DENY');
    });
  });

  describe('buildHstsHeader', () => {
    it('should build basic HSTS header with max-age', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: false,
        hstsPreload: false,
      };

      const header = buildHstsHeader(config);

      expect(header).toBe('max-age=31536000');
    });

    it('should include includeSubDomains when enabled', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        hstsPreload: false,
      };

      const header = buildHstsHeader(config);

      expect(header).toBe('max-age=31536000; includeSubDomains');
    });

    it('should include preload when enabled', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: true,
        hstsMaxAge: 31536000,
        hstsIncludeSubdomains: true,
        hstsPreload: true,
      };

      const header = buildHstsHeader(config);

      expect(header).toBe('max-age=31536000; includeSubDomains; preload');
    });

    it('should handle custom max-age values', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: true,
        hstsMaxAge: 86400, // 1 day
        hstsIncludeSubdomains: false,
        hstsPreload: false,
      };

      const header = buildHstsHeader(config);

      expect(header).toBe('max-age=86400');
    });
  });

  describe('getSecurityHeaders', () => {
    beforeEach(() => {
      vi.stubEnv('NODE_ENV', 'test');
    });

    it('should return all required security headers', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
      expect(headers['X-Frame-Options']).toBeDefined();
      expect(headers['Content-Security-Policy']).toBeDefined();
      expect(headers['Permissions-Policy']).toBeDefined();
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });

    it('should include HSTS when enabled', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: true,
      };

      const headers = getSecurityHeaders(config);

      expect(headers['Strict-Transport-Security']).toBeDefined();
      expect(headers['Strict-Transport-Security']).toContain('max-age=');
    });

    it('should not include HSTS when disabled', () => {
      const config: SecurityHeadersConfig = {
        ...DEFAULT_CONFIG,
        enableHSTS: false,
      };

      const headers = getSecurityHeaders(config);

      expect(headers['Strict-Transport-Security']).toBeUndefined();
    });

    it('should set X-Frame-Options to DENY by default', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['X-Frame-Options']).toBe('DENY');
    });

    it('should include cache control headers', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['Cache-Control']).toContain('no-store');
      expect(headers['Cache-Control']).toContain('no-cache');
      expect(headers['Cache-Control']).toContain('must-revalidate');
      expect(headers['Pragma']).toBe('no-cache');
      expect(headers['Expires']).toBe('0');
    });
  });

  describe('applySecurityHeaders', () => {
    it('should apply security headers to a Response', () => {
      const originalResponse = new Response('test body', {
        status: 200,
        headers: { 'Content-Type': 'text/plain' },
      });

      const securedResponse = applySecurityHeaders(originalResponse, DEFAULT_CONFIG);

      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(securedResponse.headers.get('Content-Security-Policy')).toBeDefined();
    });

    it('should preserve original response status', () => {
      const originalResponse = new Response('not found', { status: 404 });

      const securedResponse = applySecurityHeaders(originalResponse, DEFAULT_CONFIG);

      expect(securedResponse.status).toBe(404);
    });

    it('should preserve original response body', async () => {
      const body = 'test body content';
      const originalResponse = new Response(body, { status: 200 });

      const securedResponse = applySecurityHeaders(originalResponse, DEFAULT_CONFIG);

      const responseBody = await securedResponse.text();
      expect(responseBody).toBe(body);
    });

    it('should preserve original headers while adding security headers', () => {
      const originalResponse = new Response('test', {
        headers: {
          'Content-Type': 'application/json',
          'X-Custom-Header': 'custom-value',
        },
      });

      const securedResponse = applySecurityHeaders(originalResponse, DEFAULT_CONFIG);

      expect(securedResponse.headers.get('Content-Type')).toBe('application/json');
      expect(securedResponse.headers.get('X-Custom-Header')).toBe('custom-value');
      expect(securedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
    });

    it('should override conflicting headers with security headers', () => {
      const originalResponse = new Response('test', {
        headers: {
          'X-Frame-Options': 'ALLOWALL', // Insecure value
        },
      });

      const securedResponse = applySecurityHeaders(originalResponse, DEFAULT_CONFIG);

      expect(securedResponse.headers.get('X-Frame-Options')).toBe('DENY');
    });
  });

  describe('getApiSecurityConfig', () => {
    it('should return stricter CSP for API routes', () => {
      const config = getApiSecurityConfig();

      expect(config.csp.scriptSrc).toContain("'none'");
      expect(config.csp.styleSrc).toContain("'none'");
    });

    it('should maintain other security settings', () => {
      const config = getApiSecurityConfig();

      expect(config.csp.defaultSrc).toContain("'self'");
      expect(config.csp.objectSrc).toContain("'none'");
    });
  });

  describe('shouldRelaxSecurityHeaders', () => {
    it('should return true for /uploads/ paths', () => {
      expect(shouldRelaxSecurityHeaders('/uploads/image.jpg')).toBe(true);
      expect(shouldRelaxSecurityHeaders('/uploads/2024/01/photo.png')).toBe(true);
    });

    it('should return true for /files/ paths', () => {
      expect(shouldRelaxSecurityHeaders('/files/document.pdf')).toBe(true);
      expect(shouldRelaxSecurityHeaders('/files/report.xlsx')).toBe(true);
    });

    it('should return true for /_astro/ paths', () => {
      expect(shouldRelaxSecurityHeaders('/_astro/chunk.js')).toBe(true);
      expect(shouldRelaxSecurityHeaders('/_astro/styles.css')).toBe(true);
    });

    it('should return false for other paths', () => {
      expect(shouldRelaxSecurityHeaders('/admin')).toBe(false);
      expect(shouldRelaxSecurityHeaders('/api/entries')).toBe(false);
      expect(shouldRelaxSecurityHeaders('/')).toBe(false);
      expect(shouldRelaxSecurityHeaders('/login')).toBe(false);
    });

    it('should return false for paths containing but not starting with relaxed prefixes', () => {
      expect(shouldRelaxSecurityHeaders('/admin/uploads')).toBe(false);
      expect(shouldRelaxSecurityHeaders('/api/files')).toBe(false);
    });
  });

  describe('getRelaxedSecurityConfig', () => {
    it('should allow self in frame-ancestors', () => {
      const config = getRelaxedSecurityConfig();

      expect(config.csp.frameAncestors).toContain("'self'");
    });

    it('should maintain other security defaults', () => {
      const config = getRelaxedSecurityConfig();

      expect(config.csp.defaultSrc).toContain("'self'");
      expect(config.csp.objectSrc).toContain("'none'");
    });
  });

  describe('DEFAULT_CONFIG', () => {
    it('should have secure default CSP', () => {
      expect(DEFAULT_CONFIG.csp.defaultSrc).toContain("'self'");
      expect(DEFAULT_CONFIG.csp.objectSrc).toContain("'none'");
      expect(DEFAULT_CONFIG.csp.frameAncestors).toContain("'none'");
    });

    it('should deny all dangerous permissions by default', () => {
      expect(DEFAULT_CONFIG.permissionsPolicy.camera).toEqual([]);
      expect(DEFAULT_CONFIG.permissionsPolicy.microphone).toEqual([]);
      expect(DEFAULT_CONFIG.permissionsPolicy.geolocation).toEqual([]);
      expect(DEFAULT_CONFIG.permissionsPolicy.payment).toEqual([]);
      expect(DEFAULT_CONFIG.permissionsPolicy.usb).toEqual([]);
    });

    it('should have frame ancestors set to none', () => {
      expect(DEFAULT_CONFIG.frameAncestors).toBe('none');
    });

    it('should have HSTS enabled only in production by default', () => {
      // In test environment, HSTS should be disabled
      expect(DEFAULT_CONFIG.enableHSTS).toBe(false);
    });

    it('should have reasonable HSTS max-age', () => {
      // At least 6 months (15768000 seconds)
      expect(DEFAULT_CONFIG.hstsMaxAge).toBeGreaterThanOrEqual(15768000);
    });
  });

  describe('Security header values validation', () => {
    it('should not contain dangerous CSP directives', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);
      const csp = headers['Content-Security-Policy'];

      // unsafe-eval should never appear (allows arbitrary code execution)
      expect(csp).not.toContain("'unsafe-eval'");

      // data: should only appear in img-src (needed for base64 images in rich text)
      // but never in script-src (XSS vector)
      expect(csp).not.toMatch(/script-src[^;]*data:/);
      expect(csp).not.toMatch(/default-src[^;]*data:/);

      // Verify data: is only in img-src where it's acceptable
      expect(csp).toMatch(/img-src[^;]*data:/);
    });

    it('should block object embeds', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);
      const csp = headers['Content-Security-Policy'];

      expect(csp).toContain("object-src 'none'");
    });

    it('should prevent clickjacking', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['X-Frame-Options']).toBe('DENY');
      expect(headers['Content-Security-Policy']).toContain("frame-ancestors 'none'");
    });

    it('should prevent MIME sniffing attacks', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['X-Content-Type-Options']).toBe('nosniff');
    });

    it('should enable XSS protection for legacy browsers', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['X-XSS-Protection']).toBe('1; mode=block');
    });

    it('should have strict referrer policy', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      // Should not leak full URL to other origins
      expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    });

    it('should isolate cross-origin resources', () => {
      const headers = getSecurityHeaders(DEFAULT_CONFIG);

      expect(headers['Cross-Origin-Opener-Policy']).toBe('same-origin');
      expect(headers['Cross-Origin-Resource-Policy']).toBe('same-origin');
    });
  });
});
