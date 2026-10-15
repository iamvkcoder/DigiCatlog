export class ApiError extends Error {
  statusCode: number;
  data: any;
  code?: string;

  constructor(message: string, statusCode: number, data?: any, code?: string) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.data = data;
    this.code = code;
  }
}

const API_BASE = '/api';

async function request<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `${API_BASE}${endpoint.startsWith('/') ? endpoint : `/${endpoint}`}`;

  const headers = new Headers(options.headers);

  // If body is NOT FormData, set JSON Content-Type
  if (options.body && !(options.body instanceof FormData)) {
    if (!headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
  }

  const response = await fetch(url, {
    ...options,
    headers,
    credentials: 'include', // Includes httpOnly cookies
  });

  const contentType = response.headers.get('content-type') || '';
  let responseData: any = null;

  if (contentType.includes('application/json')) {
    responseData = await response.json();
  } else {
    responseData = await response.text();
  }

  if (!response.ok) {
    const errorMessage =
      responseData?.error || responseData?.message || response.statusText || 'An error occurred';
    throw new ApiError(errorMessage, response.status, responseData, responseData?.code);
  }

  return responseData as T;
}

export const api = {
  get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'GET' });
  },

  post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
  },

  delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return request<T>(endpoint, { ...options, method: 'DELETE' });
  },

  upload<T>(endpoint: string, file: File, folder = 'items'): Promise<T> {
    const formData = new FormData();
    formData.append('file', file);
    return request<T>(`${endpoint}?folder=${folder}`, {
      method: 'POST',
      body: formData,
    });
  },
};
