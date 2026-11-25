import type { ApiEnvelope, ProblemDetails } from '@/lib/api-types';

const API_BASE_URL = (process.env.NEXT_PUBLIC_API_BASE_URL ?? '').replace(/\/$/, '');

let cachedCsrfToken: string | null = null;
let refreshInFlight: Promise<boolean> | null = null;

export class ApiProblemError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly correlationId: string;
  public readonly errors?: Array<{ field: string; message: string }>;

  constructor(problem: ProblemDetails) {
    super(problem.detail || problem.title);
    this.name = 'ApiProblemError';
    this.status = problem.status;
    this.code = problem.code;
    this.correlationId = problem.correlationId;
    this.errors = problem.errors;
  }
}

export function setClientCsrfToken(token: string | null): void {
  cachedCsrfToken = token;
}

export function readCsrfTokenFromCookies(): string | null {
  if (typeof document !== 'undefined') {
    const match = document.cookie
      .split(';')
      .map((c) => c.trim())
      .find((c) => c.startsWith('cp_csrf='));
    if (match) {
      const value = decodeURIComponent(match.slice('cp_csrf='.length));
      if (value) {
        cachedCsrfToken = value;
        return value;
      }
    }
  }
  return cachedCsrfToken;
}

async function attemptSessionRefresh(): Promise<boolean> {
  if (!refreshInFlight) {
    refreshInFlight = fetch(`${API_BASE_URL}/api/v1/auth/refresh`, {
      method: 'POST',
      credentials: 'include',
    })
      .then(async (res) => {
        if (!res.ok) {
          return false;
        }
        const json = (await res.json().catch(() => null)) as ApiEnvelope<{
          csrfToken?: string;
        }> | null;
        if (json?.data?.csrfToken) {
          cachedCsrfToken = json.data.csrfToken;
        }
        return true;
      })
      .catch(() => false)
      .finally(() => {
        refreshInFlight = null;
      });
  }
  return refreshInFlight;
}

export interface ApiRequestOptions {
  method?: 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';
  body?: unknown;
  workspaceId?: string | null;
  skipRefreshRetry?: boolean;
}

export async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<ApiEnvelope<T>> {
  const method = options.method ?? 'GET';
  const headers = new Headers();

  if (options.body !== undefined) {
    headers.set('Content-Type', 'application/json');
  }

  if (options.workspaceId) {
    headers.set('X-Workspace-Id', options.workspaceId);
  }

  if (method !== 'GET') {
    const csrf = readCsrfTokenFromCookies();
    if (csrf) {
      headers.set('X-CSRF-Token', csrf);
    }
  }

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    credentials: 'include',
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
  });

  if (
    response.status === 401 &&
    !options.skipRefreshRetry &&
    !path.startsWith('/api/v1/auth/login') &&
    !path.startsWith('/api/v1/auth/register') &&
    !path.startsWith('/api/v1/auth/refresh')
  ) {
    const refreshed = await attemptSessionRefresh();
    if (refreshed) {
      return apiRequest<T>(path, { ...options, skipRefreshRetry: true });
    }
  }

  const text = await response.text();
  const parsed = text ? (JSON.parse(text) as unknown) : null;

  if (!response.ok) {
    if (parsed && typeof parsed === 'object' && 'detail' in parsed && 'status' in parsed) {
      throw new ApiProblemError(parsed as ProblemDetails);
    }
    throw new ApiProblemError({
      type: 'about:blank',
      title: response.statusText || 'Request Failed',
      status: response.status,
      detail: `HTTP ${response.status} error while calling ${path}`,
      instance: path,
      code: 'HTTP_ERROR',
      correlationId: response.headers.get('x-request-id') ?? 'unknown',
    });
  }

  const envelope = parsed as ApiEnvelope<T>;
  if (
    envelope?.data &&
    typeof envelope.data === 'object' &&
    'csrfToken' in envelope.data &&
    typeof (envelope.data as { csrfToken?: unknown }).csrfToken === 'string'
  ) {
    cachedCsrfToken = (envelope.data as { csrfToken: string }).csrfToken;
  }

  return envelope;
}
