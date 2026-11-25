'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  ExternalLink,
  GitBranch,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { GithubInstallationItem } from '@/lib/api-types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function IntegrationsPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );
  const canManage = hasPermission('repository:write');
  const canRevoke = hasPermission('workspace:update');

  const installationsQuery = useQuery({
    queryKey: ['github-installations', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{ items: GithubInstallationItem[] }>(
        '/api/v1/github/installations',
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const connectMutation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest<{
        installUrl: string;
        mode: 'live' | 'fixture';
      }>('/api/v1/github/install', { workspaceId: activeWorkspaceId });

      if (res.data.mode === 'live') {
        window.location.href = res.data.installUrl;
        return { mode: 'live' as const };
      }

      // In fixture/sandbox mode, invoke the signed callback endpoint directly
      const url = new URL(res.data.installUrl);
      const cb = await apiRequest<{ accountLogin: string; repositoriesSynced: number }>(
        `${url.pathname}${url.search}`,
      );
      return {
        mode: 'fixture' as const,
        synced: cb.data.repositoriesSynced,
        login: cb.data.accountLogin,
      };
    },
    onSuccess: (result) => {
      if (result.mode === 'fixture') {
        setFeedback({
          type: 'success',
          text: `Connected sandbox GitHub App installation (${result.login}) and synced ${result.synced} repositories.`,
        });
        void queryClient.invalidateQueries({ queryKey: ['github-installations'] });
        void queryClient.invalidateQueries({ queryKey: ['repositories'] });
        void queryClient.invalidateQueries({ queryKey: ['analytics'] });
      }
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to connect GitHub App.',
      });
    },
  });

  const revokeMutation = useMutation({
    mutationFn: async (installationId: string) => {
      return apiRequest(`/api/v1/github/installations/${installationId}`, {
        method: 'DELETE',
        workspaceId: activeWorkspaceId,
      });
    },
    onSuccess: () => {
      setFeedback({
        type: 'success',
        text: 'GitHub App installation revoked. Repository indexing and review publishing are immediately disabled.',
      });
      void queryClient.invalidateQueries({ queryKey: ['github-installations'] });
      void queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Failed to revoke installation.',
      });
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">GitHub App Integrations</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Least-privilege GitHub App installations scoped to this tenant workspace.
          </p>
        </div>

        {canManage ? (
          <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
            <GitBranch className="h-4 w-4" aria-hidden="true" />
            {connectMutation.isPending ? 'Connecting...' : 'Install GitHub App'}
          </Button>
        ) : null}
      </div>

      {feedback ? (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={
            feedback.type === 'success'
              ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
              : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
            Least-Privilege Permission Scope
          </CardTitle>
          <CardDescription>
            CodePilot AI requests only <code className="font-mono">contents:read</code>,{' '}
            <code className="font-mono">metadata:read</code>,{' '}
            <code className="font-mono">pull_requests:write</code>, and{' '}
            <code className="font-mono">checks:write</code>. Organization admin, repository secrets,
            and deployment permissions are never requested.
          </CardDescription>
        </CardHeader>
      </Card>

      {installationsQuery.isLoading ? (
        <Skeleton className="h-40 w-full" />
      ) : !installationsQuery.data?.length ? (
        <EmptyState
          icon={<GitBranch className="h-6 w-6" />}
          title="No GitHub App installations connected"
          description="Install the CodePilot AI GitHub App to synchronize repositories, index commit SHAs, and run automated PR reviews."
          action={
            canManage ? (
              <Button onClick={() => connectMutation.mutate()} disabled={connectMutation.isPending}>
                <ExternalLink className="h-4 w-4" aria-hidden="true" />
                Connect GitHub App
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="grid gap-4">
          {installationsQuery.data.map((inst) => (
            <Card key={inst.id}>
              <CardContent className="flex flex-wrap items-center justify-between gap-4 p-5">
                <div>
                  <div className="flex items-center gap-2.5">
                    <GitBranch className="h-5 w-5" aria-hidden="true" />
                    <h2 className="text-base font-semibold">{inst.accountLogin}</h2>
                    <Badge
                      variant={
                        inst.status === 'ACTIVE'
                          ? 'success'
                          : inst.status === 'REVOKED'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {inst.status}
                    </Badge>
                    <Badge variant="secondary">{inst.accountType}</Badge>
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-[var(--muted-foreground)]">
                    <span className="font-mono">Installation #{inst.githubInstallationId}</span>
                    <span>&middot;</span>
                    <span className="flex items-center gap-1">
                      <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                      {inst.repositoryCount} active repositor
                      {inst.repositoryCount === 1 ? 'y' : 'ies'}
                    </span>
                    <span>&middot;</span>
                    <span>Installed {formatDateTime(inst.installedAt)}</span>
                  </p>
                </div>

                {canRevoke && inst.status === 'ACTIVE' ? (
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={revokeMutation.isPending}
                    onClick={() => revokeMutation.mutate(inst.id)}
                    className="text-red-600 hover:bg-red-500/10 dark:text-red-400"
                  >
                    <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
                    Revoke access
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
