import { describe, expect, it, vi, beforeEach } from 'vitest';
import { formatRoleLabel, shortSha } from '@/lib/utils';
import {
  ApiProblemError,
  apiRequest,
  readCsrfTokenFromCookies,
  setClientCsrfToken,
} from '@/lib/api-client';

describe('Utility helpers', () => {
  it('formats workspace and platform roles accurately', () => {
    expect(formatRoleLabel('PLATFORM_ADMIN')).toBe('Platform Admin');
    expect(formatRoleLabel('WORKSPACE_OWNER')).toBe('Workspace Owner');
    expect(formatRoleLabel('DEVELOPER')).toBe('Developer');
    expect(formatRoleLabel('VIEWER')).toBe('Viewer');
    expect(shortSha('a1b2c3d4e5f60718293a4b5c6d7e8f9012345601')).toBe('a1b2c3d');
  });
});

describe('REST API client security headers and RFC 9457 handling', () => {
  beforeEach(() => {
    setClientCsrfToken(null);
    document.cookie = 'cp_csrf=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/';
    vi.restoreAllMocks();
  });

  it('attaches X-CSRF-Token and X-Workspace-Id headers on mutating requests', async () => {
    document.cookie = 'cp_csrf=csrf-token-value-abcdef123456; path=/';
    expect(readCsrfTokenFromCookies()).toBe('csrf-token-value-abcdef123456');

    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          data: { ok: true },
          meta: { requestId: 'req-1', timestamp: '2026-11-24T00:00:00.000Z' },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } },
      ),
    );

    const res = await apiRequest<{ ok: boolean }>('/api/v1/workspaces', {
      method: 'POST',
      workspaceId: 'ws-123',
      body: { name: 'Engineering' },
    });

    expect(res.data.ok).toBe(true);
    const [, init] = fetchMock.mock.calls[0]!;
    const headers = init?.headers as Headers;
    expect(headers.get('X-CSRF-Token')).toBe('csrf-token-value-abcdef123456');
    expect(headers.get('X-Workspace-Id')).toBe('ws-123');
    expect(init?.credentials).toBe('include');
  });

  it('parses RFC 9457 application/problem+json responses into ApiProblemError', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValueOnce(
      new Response(
        JSON.stringify({
          type: 'https://codepilot.ai/errors/forbidden',
          title: 'Forbidden',
          status: 403,
          detail: 'You do not have access to this workspace',
          instance: '/api/v1/repositories',
          code: 'WORKSPACE_ACCESS_DENIED',
          correlationId: 'corr-999',
        }),
        { status: 403, headers: { 'Content-Type': 'application/problem+json' } },
      ),
    );

    await expect(apiRequest('/api/v1/repositories')).rejects.toThrow(ApiProblemError);
  });
});
