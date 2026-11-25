'use client';

import { useEffect, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api-client';
import type { AuthResponseData, WorkspaceSummary } from '@/lib/api-types';
import { useWorkspaceStore } from '@/store/workspace-store';

export const SESSION_QUERY_KEY = ['auth', 'me'] as const;

export function useSession() {
  const activeWorkspaceId = useWorkspaceStore((s) => s.activeWorkspaceId);
  const setActiveWorkspaceId = useWorkspaceStore((s) => s.setActiveWorkspaceId);

  const query = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      const res = await apiRequest<AuthResponseData>('/api/v1/auth/me');
      return res.data;
    },
    retry: false,
  });

  const workspaces = useMemo(() => query.data?.workspaces ?? [], [query.data?.workspaces]);

  useEffect(() => {
    if (!query.data) return;
    if (workspaces.length === 0) {
      if (activeWorkspaceId !== null) {
        setActiveWorkspaceId(null);
      }
      return;
    }
    const stillValid = workspaces.some((w) => w.id === activeWorkspaceId);
    if (!stillValid) {
      setActiveWorkspaceId(workspaces[0]!.id);
    }
  }, [query.data, workspaces, activeWorkspaceId, setActiveWorkspaceId]);

  const activeWorkspace: WorkspaceSummary | null =
    workspaces.find((w) => w.id === activeWorkspaceId) ?? workspaces[0] ?? null;

  return {
    ...query,
    user: query.data?.user ?? null,
    workspaces,
    activeWorkspace,
    activeWorkspaceId: activeWorkspace?.id ?? null,
    hasPermission: (perm: string) => activeWorkspace?.permissions.includes(perm) ?? false,
  };
}

export function useLogout() {
  const queryClient = useQueryClient();
  const resetWorkspaceState = useWorkspaceStore((s) => s.resetWorkspaceState);

  return async () => {
    try {
      await apiRequest('/api/v1/auth/logout', { method: 'POST' });
    } finally {
      resetWorkspaceState();
      queryClient.clear();
    }
  };
}
