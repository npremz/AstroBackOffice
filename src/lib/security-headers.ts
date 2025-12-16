/**
 * Security Headers Module
 *
 * Implements OWASP recommended security headers for HTTP responses.
 * @see https://owasp.org/www-project-secure-headers/
 */

export interface SecurityHeadersConfig {
  /** Enable HSTS (should be true in production with HTTPS) */
  enableHSTS: boolean;
  /** HSTS max-age in seconds (default: 1 year) */
  hstsMaxAge: number;
  /** Include subdomains in HSTS */
  hstsIncludeSubdomains: boolean;
  /** Enable HSTS preload */
  hstsPreload: boolean;
  /** Content Security Policy directives */
  csp: ContentSecurityPolicy;
  /** Allowed frame ancestors (for X-Frame-Options fallback) */
  frameAncestors: 'none' | 'self' | string[];
  /** Permissions Policy directives */
  permissionsPolicy: PermissionsPolicy;
}

export interface ContentSecurityPolicy {
  defaultSrc: string[];
  scriptSrc: string[];
  styleSrc: string[];
  imgSrc: string[];
  fontSrc: string[];
  connectSrc: string[];
  mediaSrc: string[];
  objectSrc: string[];
  frameSrc: string[];
  frameAncestors: string[];
  baseUri: string[];
  formAction: string[];
  upgradeInsecureRequests: boolean;
}

export interface PermissionsPolicy {
  camera: string[];
  microphone: string[];
  geolocation: string[];
  payment: string[];
  usb: string[];
  fullscreen: string[];
  accelerometer: string[];
  gyroscope: string[];
  magnetometer: string[];
}

/**
 * Default CSP configuration for the CMS admin
 */
const DEFAULT_CSP: ContentSecurityPolicy = {
  defaultSrc: ["'self'"],
  scriptSrc: ["'self'", "'unsafe-inline'"], // React needs unsafe-inline for dev, consider nonces for prod
  styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
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

/**
 * Default Permissions Policy - restrictive by default
 */
const DEFAULT_PERMISSIONS_POLICY: PermissionsPolicy = {
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

/**
 * Default security headers configuration
 */
export const DEFAULT_CONFIG: SecurityHeadersConfig = {
  enableHSTS: process.env.NODE_ENV === 'production',
  hstsMaxAge: 31536000, // 1 year
  hstsIncludeSubdomains: true,
  hstsPreload: false, // Enable only after testing
  csp: DEFAULT_CSP,
  frameAncestors: 'none',
  permissionsPolicy: DEFAULT_PERMISSIONS_POLICY,
};

/**
 * Build CSP header string from config
 */
export function buildCspHeader(csp: ContentSecurityPolicy): string {
  const directives: string[] = [];

  if (csp.defaultSrc.length > 0) {
    directives.push(`default-src ${csp.defaultSrc.join(' ')}`);
  }
  if (csp.scriptSrc.length > 0) {
    directives.push(`script-src ${csp.scriptSrc.join(' ')}`);
  }
  if (csp.styleSrc.length > 0) {
    directives.push(`style-src ${csp.styleSrc.join(' ')}`);
  }
  if (csp.imgSrc.length > 0) {
    directives.push(`img-src ${csp.imgSrc.join(' ')}`);
  }
  if (csp.fontSrc.length > 0) {
    directives.push(`font-src ${csp.fontSrc.join(' ')}`);
  }
  if (csp.connectSrc.length > 0) {
    directives.push(`connect-src ${csp.connectSrc.join(' ')}`);
  }
  if (csp.mediaSrc.length > 0) {
    directives.push(`media-src ${csp.mediaSrc.join(' ')}`);
  }
  if (csp.objectSrc.length > 0) {
    directives.push(`object-src ${csp.objectSrc.join(' ')}`);
  }
  if (csp.frameSrc.length > 0) {
    directives.push(`frame-src ${csp.frameSrc.join(' ')}`);
  }
  if (csp.frameAncestors.length > 0) {
    directives.push(`frame-ancestors ${csp.frameAncestors.join(' ')}`);
  }
  if (csp.baseUri.length > 0) {
    directives.push(`base-uri ${csp.baseUri.join(' ')}`);
  }
  if (csp.formAction.length > 0) {
    directives.push(`form-action ${csp.formAction.join(' ')}`);
  }
  if (csp.upgradeInsecureRequests) {
    directives.push('upgrade-insecure-requests');
  }

  return directives.join('; ');
}

/**
 * Build Permissions-Policy header string from config
 */
export function buildPermissionsPolicyHeader(policy: PermissionsPolicy): string {
  const directives: string[] = [];

  for (const [feature, allowlist] of Object.entries(policy)) {
    // Convert camelCase to kebab-case for HTTP header
    const featureName = feature.replace(/([A-Z])/g, '-$1').toLowerCase();

    if (allowlist.length === 0) {
      directives.push(`${featureName}=()`);
    } else {
      directives.push(`${featureName}=(${allowlist.join(' ')})`);
    }
  }

  return directives.join(', ');
}

/**
 * Build X-Frame-Options header value
 */
export function buildXFrameOptions(frameAncestors: 'none' | 'self' | string[]): string {
  if (frameAncestors === 'none') {
    return 'DENY';
  }
  if (frameAncestors === 'self') {
    return 'SAMEORIGIN';
  }
  // X-Frame-Options doesn't support multiple origins, use CSP frame-ancestors instead
  return 'DENY';
}

/**
 * Build HSTS header value
 */
export function buildHstsHeader(config: SecurityHeadersConfig): string {
  let value = `max-age=${config.hstsMaxAge}`;

  if (config.hstsIncludeSubdomains) {
    value += '; includeSubDomains';
  }

  if (config.hstsPreload) {
    value += '; preload';
  }

  return value;
}

/**
 * Generate all security headers as a Record
 */
export function getSecurityHeaders(config: SecurityHeadersConfig = DEFAULT_CONFIG): Record<string, string> {
  const headers: Record<string, string> = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',

    // XSS Protection (legacy, but still useful for older browsers)
    'X-XSS-Protection': '1; mode=block',

    // Clickjacking protection (fallback for older browsers, CSP frame-ancestors is preferred)
    'X-Frame-Options': buildXFrameOptions(config.frameAncestors),

    // Content Security Policy
    'Content-Security-Policy': buildCspHeader(config.csp),

    // Permissions Policy (formerly Feature-Policy)
    'Permissions-Policy': buildPermissionsPolicyHeader(config.permissionsPolicy),

    // Referrer Policy - send origin only for same-origin, nothing for cross-origin
    'Referrer-Policy': 'strict-origin-when-cross-origin',

    // Prevent caching of sensitive pages (for admin pages)
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',

    // Cross-Origin policies for additional isolation
    'Cross-Origin-Opener-Policy': 'same-origin',
    'Cross-Origin-Resource-Policy': 'same-origin',
  };

  // HSTS - only enable in production with HTTPS
  if (config.enableHSTS) {
    headers['Strict-Transport-Security'] = buildHstsHeader(config);
  }

  return headers;
}

/**
 * Apply security headers to a Response object
 */
export function applySecurityHeaders(
  response: Response,
  config: SecurityHeadersConfig = DEFAULT_CONFIG
): Response {
  const headers = getSecurityHeaders(config);

  // Clone response to make headers mutable
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });

  for (const [name, value] of Object.entries(headers)) {
    newResponse.headers.set(name, value);
  }

  return newResponse;
}

/**
 * Get security headers config for API routes (less restrictive CSP for JSON responses)
 */
export function getApiSecurityConfig(): SecurityHeadersConfig {
  return {
    ...DEFAULT_CONFIG,
    csp: {
      ...DEFAULT_CSP,
      // APIs don't need script/style sources
      scriptSrc: ["'none'"],
      styleSrc: ["'none'"],
    },
  };
}

/**
 * Check if a path should have relaxed security headers (e.g., public assets)
 */
export function shouldRelaxSecurityHeaders(pathname: string): boolean {
  // Public uploads need to be viewable
  const relaxedPaths = ['/uploads/', '/files/', '/_astro/'];
  return relaxedPaths.some(path => pathname.startsWith(path));
}

/**
 * Get relaxed security headers for public assets
 */
export function getRelaxedSecurityConfig(): SecurityHeadersConfig {
  return {
    ...DEFAULT_CONFIG,
    csp: {
      ...DEFAULT_CSP,
      // Allow images to be embedded elsewhere
      frameAncestors: ["'self'"],
    },
  };
}
