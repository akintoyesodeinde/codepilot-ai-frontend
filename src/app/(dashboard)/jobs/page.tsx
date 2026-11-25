'use client';

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ListChecks, RefreshCw, XCircle } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { AnalysisJobItem } from '@/lib/api-types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function JobsMonitorPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('repository:write');

  const jobsQuery = useQuery({
    queryKey: ['workspace-jobs', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    refetchInterval: 5000,
    queryFn: async () => {
      const res = await apiRequest<{ items: AnalysisJobItem[] }>('/api/v1/jobs?limit=30', {
        workspaceId: activeWorkspaceId,
      });
      return res.data.items;
    },
  });

  const cancelMutation = useMutation({
    mutationFn: async (jobId: string) =>
      apiRequest(`/api/v1/jobs/${jobId}`, {
        method: 'DELETE',
        workspaceId: activeWorkspaceId,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['workspace-jobs', activeWorkspaceId] });
    },
  });

  const jobs = jobsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Background Analysis Jobs</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Durable SQS / worker job execution history, retry attempts, and dead-letter monitoring.
          </p>
        </div>

        <Button variant="outline" size="sm" onClick={() => void jobsQuery.refetch()}>
          <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
          Refresh
        </Button>
      </div>

      {jobsQuery.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : jobs.length === 0 ? (
        <EmptyState
          icon={<ListChecks className="h-6 w-6" />}
          title="No background jobs yet"
          description="Syncing a repository, indexing source code, or triggering a PR review creates durable jobs tracked here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="px-4 py-3 font-medium">Job Type</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Attempts</th>
                    <th className="px-4 py-3 font-medium">Created</th>
                    <th className="px-4 py-3 font-medium">Completed</th>
                    <th className="px-4 py-3 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {jobs.map((job) => (
                    <tr key={job.id}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold">{job.jobType}</p>
                        <p className="font-mono text-[11px] text-[var(--muted-foreground)]">
                          {job.id.slice(0, 12)}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            job.status === 'COMPLETED'
                              ? 'success'
                              : job.status === 'QUEUED' || job.status === 'RUNNING'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {job.status}
                        </Badge>
                        {job.lastError ? (
                          <p className="mt-1 max-w-xs truncate text-xs text-red-600 dark:text-red-400">
                            {job.lastError}
                          </p>
                        ) : null}
                      </td>
                      <td className="px-4 py-3 font-mono text-xs">
                        {job.attempts} / {job.maxAttempts}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(job.createdAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(job.completedAt)}
                      </td>
                      <td className="px-4 py-3 text-right">
                        {canWrite && (job.status === 'QUEUED' || job.status === 'RUNNING') ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={cancelMutation.isPending}
                            onClick={() => cancelMutation.mutate(job.id)}
                          >
                            <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                            Cancel
                          </Button>
                        ) : null}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
