// API client with CSRF token support

let csrfToken: string | null = null;

// Get CSRF token from cookie
function getCsrfFromCookie(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)cms_csrf=([^;]*)/);
  return match ? decodeURIComponent(match[1]) : null;
}

// Initialize CSRF token
export function initCsrf(token?: string): void {
  if (token) {
    csrfToken = token;
  } else {
    csrfToken = getCsrfFromCookie();
  }
}

// Get current CSRF token
export function getCsrfToken(): string | null {
  if (!csrfToken) {
    csrfToken = getCsrfFromCookie();
  }
  return csrfToken;
}

// Fetch wrapper with CSRF token
export async function apiFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  const headers = new Headers(options.headers);
  
  // Add CSRF token for state-changing requests
  const method = (options.method || 'GET').toUpperCase();
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    const token = getCsrfToken();
    if (token) {
      headers.set('x-csrf-token', token);
    }
  }

  // Default content type for JSON
  if (options.body && typeof options.body === 'string' && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(url, {
    ...options,
    headers,
    credentials: 'same-origin',
  });
}

// Typed API helpers
export async function apiGet<T>(url: string): Promise<T> {
  const response = await apiFetch(url);
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function apiPost<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiFetch(url, {
    method: 'POST',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function apiPut<T>(url: string, data?: unknown): Promise<T> {
  const response = await apiFetch(url, {
    method: 'PUT',
    body: data ? JSON.stringify(data) : undefined,
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

export async function apiDelete<T = { success: boolean }>(url: string): Promise<T> {
  const response = await apiFetch(url, {
    method: 'DELETE',
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }
  return response.json();
}

// For file uploads (FormData)
export async function apiUpload<T>(url: string, formData: FormData): Promise<T> {
  const token = getCsrfToken();
  const headers: HeadersInit = {};
  if (token) {
    headers['x-csrf-token'] = token;
  }

  const response = await fetch(url, {
    method: 'POST',
    body: formData,
    headers,
    credentials: 'same-origin',
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Upload failed' }));
    throw new Error(error.error || 'Upload failed');
  }
  return response.json();
}
