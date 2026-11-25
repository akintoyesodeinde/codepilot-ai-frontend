'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { AlertCircle, GitPullRequest, ShieldAlert } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { PullRequestListItem } from '@/lib/api-types';
import { formatRelativeTime, shortSha } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

function riskBadgeVariant(risk: string | null | undefined) {
  switch (risk) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive' as const;
    case 'MEDIUM':
      return 'warning' as const;
    case 'LOW':
      return 'success' as const;
    default:
      return 'secondary' as const;
  }
}

export default function PullRequestsPage() {
  const { activeWorkspaceId } = useSession();
  const [stateFilter, setStateFilter] = useState('OPEN');

  const prsQuery = useInfiniteQuery({
    queryKey: ['pull-requests', activeWorkspaceId, stateFilter],
    enabled: Boolean(activeWorkspaceId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (stateFilter) params.set('state', stateFilter);
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<{ items: PullRequestListItem[] }>(
        `/api/v1/pull-requests?${params.toString()}`,
        { workspaceId: activeWorkspaceId },
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination?.hasMore ? lastPage.meta.pagination.nextCursor : undefined,
  });

  const prs = prsQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Pull Request Reviews</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Automated deterministic + AI code reviews with human approval gates and GitHub
            publishing.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {(['OPEN', 'MERGED', 'CLOSED', ''] as const).map((st) => (
            <Button
              key={st || 'ALL'}
              size="sm"
              variant={stateFilter === st ? 'default' : 'outline'}
              onClick={() => setStateFilter(st)}
            >
              {st || 'All'}
            </Button>
          ))}
        </div>
      </div>

      {prsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : prsQuery.isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span>Failed to load workspace pull requests.</span>
          </CardContent>
        </Card>
      ) : prs.length === 0 ? (
        <EmptyState
          icon={<GitPullRequest className="h-6 w-6" />}
          title="No pull requests found"
          description="Sync a connected GitHub repository or receive a signed pull_request webhook to list pull requests for automated review."
          action={
            <Button variant="outline" asChild>
              <Link href="/integrations">Manage GitHub Integrations</Link>
            </Button>
          }
        />
      ) : (
        <div className="space-y-3">
          {prs.map((pr) => (
            <Link key={pr.id} href={`/pull-requests/${pr.id}`} className="group block">
              <Card className="p-4 transition-colors group-hover:border-[var(--primary)]/50">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={pr.state === 'OPEN' ? 'success' : 'secondary'}>
                        {pr.state}
                      </Badge>
                      <span className="font-mono text-xs text-[var(--muted-foreground)]">
                        {pr.repository.fullName}#{pr.prNumber}
                      </span>
                      <h2 className="truncate text-base font-semibold group-hover:text-[var(--primary)]">
                        {pr.title}
                      </h2>
                    </div>
                    <p className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-[var(--muted-foreground)]">
                      <span>by {pr.authorLogin}</span>
                      <span>&middot;</span>
                      <code className="font-mono">
                        {pr.headBranch} &rarr; {pr.baseBranch}
                      </code>
                      <span>&middot;</span>
                      <code className="font-mono">{shortSha(pr.headSha)}</code>
                      <span>&middot;</span>
                      <span className="text-emerald-600 dark:text-emerald-400">
                        +{pr.additions}
                      </span>
                      <span className="text-red-600 dark:text-red-400">-{pr.deletions}</span>
                      <span>&middot;</span>
                      <span>Updated {formatRelativeTime(pr.updatedAt)}</span>
                    </p>
                  </div>

                  <div className="flex shrink-0 flex-wrap items-center gap-2">
                    {pr.latestReview ? (
                      <>
                        <Badge variant="outline">{pr.latestReview.status}</Badge>
                        {pr.latestReview.overallRisk ? (
                          <Badge variant={riskBadgeVariant(pr.latestReview.overallRisk)}>
                            <ShieldAlert className="h-3 w-3" aria-hidden="true" />
                            {pr.latestReview.overallRisk} ({pr.latestReview.findingsCount})
                          </Badge>
                        ) : null}
                      </>
                    ) : (
                      <Badge variant="secondary">Not reviewed</Badge>
                    )}
                  </div>
                </div>
              </Card>
            </Link>
          ))}

          {prsQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={prsQuery.isFetchingNextPage}
                onClick={() => void prsQuery.fetchNextPage()}
              >
                {prsQuery.isFetchingNextPage ? 'Loading...' : 'Load more pull requests'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
