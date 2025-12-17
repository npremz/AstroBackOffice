/**
 * CORS (Cross-Origin Resource Sharing) Module
 *
 * Provides explicit CORS configuration for API routes.
 * @see https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS
 */

export interface CorsConfig {
  /** Allowed origins (use specific origins, never '*' with credentials) */
  allowedOrigins: string[];
  /** Allowed HTTP methods */
  allowedMethods: string[];
  /** Allowed request headers */
  allowedHeaders: string[];
  /** Headers exposed to the client */
  exposedHeaders: string[];
  /** Allow credentials (cookies, authorization headers) */
  allowCredentials: boolean;
  /** Preflight cache duration in seconds */
  maxAge: number;
}

/**
 * Default CORS configuration
 */
const DEFAULT_CORS_CONFIG: CorsConfig = {
  allowedOrigins: getAllowedOrigins(),
  allowedMethods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-CSRF-Token',
    'X-Requested-With',
  ],
  exposedHeaders: ['X-CSRF-Token'],
  allowCredentials: true,
  maxAge: 86400, // 24 hours
};

/**
 * Get allowed origins from environment variable
 * Falls back to same-origin only if not configured
 */
function getAllowedOrigins(): string[] {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (!envOrigins) {
    // In development, allow localhost
    if (process.env.NODE_ENV !== 'production') {
      return ['http://localhost:4321', 'http://localhost:3000', 'http://127.0.0.1:4321'];
    }
    // In production with no config, deny all cross-origin
    return [];
  }

  return envOrigins
    .split(',')
    .map(origin => origin.trim())
    .filter(origin => origin.length > 0);
}

/**
 * Validate if an origin is allowed
 */
export function isOriginAllowed(origin: string | null, config: CorsConfig = DEFAULT_CORS_CONFIG): boolean {
  if (!origin) {
    // Same-origin requests don't have an Origin header
    return true;
  }

  // Check if origin matches any allowed origin
  return config.allowedOrigins.some(allowed => {
    // Exact match
    if (allowed === origin) {
      return true;
    }

    // Wildcard subdomain match (e.g., "*.example.com")
    if (allowed.startsWith('*.')) {
      const domain = allowed.slice(2);
      const originUrl = new URL(origin);
      return originUrl.hostname.endsWith(domain) || originUrl.hostname === domain.slice(1);
    }

    return false;
  });
}

/**
 * Get CORS headers for a request
 */
export function getCorsHeaders(
  request: Request,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): Record<string, string> {
  const origin = request.headers.get('Origin');
  const headers: Record<string, string> = {};

  // Only add CORS headers if origin is present and allowed
  if (origin && isOriginAllowed(origin, config)) {
    // Reflect the allowed origin (never use * with credentials)
    headers['Access-Control-Allow-Origin'] = origin;

    if (config.allowCredentials) {
      headers['Access-Control-Allow-Credentials'] = 'true';
    }

    // Vary header to ensure proper caching
    headers['Vary'] = 'Origin';
  }

  return headers;
}

/**
 * Get preflight response headers (for OPTIONS requests)
 */
export function getPreflightHeaders(
  request: Request,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): Record<string, string> {
  const headers = getCorsHeaders(request, config);
  const origin = request.headers.get('Origin');

  // Only add preflight headers if origin is allowed
  if (origin && isOriginAllowed(origin, config)) {
    headers['Access-Control-Allow-Methods'] = config.allowedMethods.join(', ');
    headers['Access-Control-Allow-Headers'] = config.allowedHeaders.join(', ');
    headers['Access-Control-Max-Age'] = config.maxAge.toString();

    if (config.exposedHeaders.length > 0) {
      headers['Access-Control-Expose-Headers'] = config.exposedHeaders.join(', ');
    }
  }

  return headers;
}

/**
 * Create a preflight response (204 No Content)
 */
export function createPreflightResponse(request: Request, config: CorsConfig = DEFAULT_CORS_CONFIG): Response {
  const headers = getPreflightHeaders(request, config);

  return new Response(null, {
    status: 204,
    headers,
  });
}

/**
 * Apply CORS headers to an existing response
 */
export function applyCorsHeaders(
  response: Response,
  request: Request,
  config: CorsConfig = DEFAULT_CORS_CONFIG
): Response {
  const corsHeaders = getCorsHeaders(request, config);

  // If no CORS headers needed, return original response
  if (Object.keys(corsHeaders).length === 0) {
    return response;
  }

  // Clone response to make headers mutable
  const newResponse = new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: new Headers(response.headers),
  });

  for (const [name, value] of Object.entries(corsHeaders)) {
    newResponse.headers.set(name, value);
  }

  return newResponse;
}

/**
 * Check if a request is a CORS preflight request
 */
export function isPreflightRequest(request: Request): boolean {
  return (
    request.method === 'OPTIONS' &&
    request.headers.has('Origin') &&
    request.headers.has('Access-Control-Request-Method')
  );
}

/**
 * Get the current CORS configuration (for testing/debugging)
 */
export function getCorsConfig(): CorsConfig {
  return { ...DEFAULT_CORS_CONFIG };
}
