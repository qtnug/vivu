/**
 * Standard API Test Client for Vivu E2E & Integration Tests
 */

export interface ApiResponse<T = any> {
  status: number;
  ok: boolean;
  data: T;
  rawBody: string;
}

export class TestClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || process.env.TEST_BASE_URL || 'http://localhost:3001';
    this.defaultHeaders = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  setBaseUrl(url: string) {
    this.baseUrl = url;
  }

  async get<T = any>(path: string, options?: { headers?: Record<string, string>; token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>('GET', path, undefined, options);
  }

  async post<T = any>(path: string, body?: any, options?: { headers?: Record<string, string>; token?: string; apiKey?: string }): Promise<ApiResponse<T>> {
    return this.request<T>('POST', path, body, options);
  }

  async put<T = any>(path: string, body?: any, options?: { headers?: Record<string, string>; token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>('PUT', path, body, options);
  }

  async delete<T = any>(path: string, options?: { headers?: Record<string, string>; token?: string }): Promise<ApiResponse<T>> {
    return this.request<T>('DELETE', path, undefined, options);
  }

  private async request<T>(
    method: string,
    path: string,
    body?: any,
    options?: { headers?: Record<string, string>; token?: string; apiKey?: string }
  ): Promise<ApiResponse<T>> {
    const url = path.startsWith('http') ? path : `${this.baseUrl}${path.startsWith('/') ? path : '/' + path}`;
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...(options?.headers || {}),
    };

    if (options?.token) {
      headers['Authorization'] = `Bearer ${options.token}`;
    } else if (options?.apiKey) {
      headers['Authorization'] = `Apikey ${options.apiKey}`;
    }

    const init: RequestInit = {
      method,
      headers,
    };

    if (body !== undefined) {
      init.body = typeof body === 'string' ? body : JSON.stringify(body);
    }

    const response = await fetch(url, init);
    const rawBody = await response.text();
    let data: any = rawBody;
    try {
      data = JSON.parse(rawBody);
    } catch {
      // Leave as string if not JSON
    }

    return {
      status: response.status,
      ok: response.ok,
      data,
      rawBody,
    };
  }
}

export const api = new TestClient();
