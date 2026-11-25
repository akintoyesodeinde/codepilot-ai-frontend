'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  Code2,
  FolderGit2,
  GitBranch,
  GitCommit,
  Globe,
  Lock,
  Search,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { RepositoryItem } from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';

export default function RepositoriesPage() {
  const { activeWorkspaceId } = useSession();
  const [search, setSearch] = useState('');
  const [visibility, setVisibility] = useState('');

  const reposQuery = useInfiniteQuery({
    queryKey: ['repositories', activeWorkspaceId, search, visibility],
    enabled: Boolean(activeWorkspaceId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '12' });
      if (search.trim()) params.set('search', search.trim());
      if (visibility) params.set('visibility', visibility);
      if (pageParam) params.set('cursor', pageParam);

      return apiRequest<{ items: RepositoryItem[] }>(`/api/v1/repositories?${params.toString()}`, {
        workspaceId: activeWorkspaceId,
      });
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination?.hasMore ? lastPage.meta.pagination.nextCursor : undefined,
  });

  const repositories = reposQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repositories</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Tenant-scoped GitHub repositories tracked inside this workspace.
          </p>
        </div>
        <Badge variant="secondary">GitHub App live sync activates in Phase 2</Badge>
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted-foreground)]"
            aria-hidden="true"
          />
          <Input
            type="search"
            aria-label="Search repositories"
            placeholder="Search by repository name or description..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <select
          aria-label="Filter by visibility"
          value={visibility}
          onChange={(e) => setVisibility(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          <option value="">All visibilities</option>
          <option value="PRIVATE">Private</option>
          <option value="INTERNAL">Internal</option>
          <option value="PUBLIC">Public</option>
        </select>
      </div>

      {reposQuery.isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full" />
          ))}
        </div>
      ) : reposQuery.isError ? (
        <Card>
          <CardContent className="flex items-center gap-3 p-6 text-sm text-red-600 dark:text-red-400">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            <span>Failed to load workspace repositories.</span>
            <Button variant="outline" size="sm" onClick={() => void reposQuery.refetch()}>
              Retry
            </Button>
          </CardContent>
        </Card>
      ) : repositories.length === 0 ? (
        <EmptyState
          icon={<FolderGit2 className="h-6 w-6" />}
          title="No matching repositories"
          description="No repositories match the current filters, or this workspace has not connected GitHub repositories yet."
        />
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {repositories.map((repo) => (
              <Link key={repo.id} href={`/repositories/${repo.id}`} className="group block">
                <Card className="flex h-full flex-col justify-between p-5 transition-colors group-hover:border-[var(--primary)]/50">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-xs text-[var(--muted-foreground)]">
                          {repo.ownerLogin}
                        </p>
                        <h2 className="truncate text-base font-semibold group-hover:text-[var(--primary)]">
                          {repo.name}
                        </h2>
                      </div>
                      <Badge variant={repo.visibility === 'PUBLIC' ? 'success' : 'secondary'}>
                        {repo.visibility === 'PUBLIC' ? (
                          <Globe className="h-3 w-3" aria-hidden="true" />
                        ) : (
                          <Lock className="h-3 w-3" aria-hidden="true" />
                        )}
                        {repo.visibility}
                      </Badge>
                    </div>
                    <p className="mt-2 line-clamp-2 text-sm text-[var(--muted-foreground)]">
                      {repo.description || 'No repository description provided.'}
                    </p>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-[var(--border)] pt-3 text-xs text-[var(--muted-foreground)]">
                    <div className="flex items-center gap-3">
                      {repo.primaryLanguage ? (
                        <span className="flex items-center gap-1 font-medium text-[var(--foreground)]">
                          <Code2 className="h-3.5 w-3.5 text-[var(--primary)]" aria-hidden="true" />
                          {repo.primaryLanguage}
                        </span>
                      ) : null}
                      <span className="flex items-center gap-1">
                        <GitBranch className="h-3.5 w-3.5" aria-hidden="true" />
                        {repo.branchCount}
                      </span>
                      <span className="flex items-center gap-1">
                        <GitCommit className="h-3.5 w-3.5" aria-hidden="true" />
                        {repo.commitCount}
                      </span>
                    </div>
                    <span>Synced {formatRelativeTime(repo.lastSyncedAt)}</span>
                  </div>
                </Card>
              </Link>
            ))}
          </div>

          {reposQuery.hasNextPage ? (
            <div className="flex justify-center">
              <Button
                variant="outline"
                disabled={reposQuery.isFetchingNextPage}
                onClick={() => void reposQuery.fetchNextPage()}
              >
                {reposQuery.isFetchingNextPage ? 'Loading more...' : 'Load more repositories'}
              </Button>
            </div>
          ) : null}
        </>
      )}
    </div>
  );
}
