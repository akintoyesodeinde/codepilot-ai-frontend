'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, ArrowLeft, GitBranch, GitCommit, Lock, ShieldCheck } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { RepositoryDetail } from '@/lib/api-types';
import { formatDateTime, shortSha } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';

export default function RepositoryDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeWorkspaceId } = useSession();

  const repoQuery = useQuery({
    queryKey: ['repository', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<RepositoryDetail>(`/api/v1/repositories/${params.id}`, {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  if (repoQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (repoQuery.isError || !repoQuery.data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-6 text-sm text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            Repository not found or inaccessible in the current workspace.
          </span>
          <Button variant="outline" asChild>
            <Link href="/repositories">Back to repositories</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const repo = repoQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/repositories">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All repositories
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{repo.fullName}</h1>
            <Badge variant="secondary">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {repo.visibility}
            </Badge>
            {repo.primaryLanguage ? <Badge variant="default">{repo.primaryLanguage}</Badge> : null}
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            {repo.description || 'No description configured.'}
          </p>
        </div>
        <div className="text-right text-xs text-[var(--muted-foreground)]">
          <p>
            Default branch:{' '}
            <code className="font-mono font-semibold text-[var(--foreground)]">
              {repo.defaultBranch}
            </code>
          </p>
          <p className="mt-1">Last synced: {formatDateTime(repo.lastSyncedAt)}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitBranch className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Tracked Branches ({repo.branches.length})
            </CardTitle>
            <CardDescription>Protected and active heads synced to MySQL</CardDescription>
          </CardHeader>
          <CardContent>
            {repo.branches.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No branches tracked yet.</p>
            ) : (
              <ul className="space-y-2.5">
                {repo.branches.map((branch) => (
                  <li
                    key={branch.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono font-medium">{branch.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {shortSha(branch.headSha)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {branch.isDefault ? <Badge variant="default">Default</Badge> : null}
                      {branch.isProtected ? (
                        <Badge variant="success">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Protected
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GitCommit className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
              Recent Commits ({repo.recentCommits.length})
            </CardTitle>
            <CardDescription>Commit history persisted for commit-SHA indexing</CardDescription>
          </CardHeader>
          <CardContent>
            {repo.recentCommits.length === 0 ? (
              <p className="text-sm text-[var(--muted-foreground)]">No commits recorded yet.</p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {repo.recentCommits.map((commit) => (
                  <li
                    key={commit.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{commit.messageHeadline}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {commit.authorName} &middot; {formatDateTime(commit.committedAt)}
                      </p>
                    </div>
                    <code className="shrink-0 rounded bg-[var(--muted)] px-2 py-0.5 font-mono text-xs">
                      {shortSha(commit.sha)}
                    </code>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
