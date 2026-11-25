'use client';

import { useState } from 'react';
import { useInfiniteQuery } from '@tanstack/react-query';
import { Activity, ShieldAlert } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { AuditLogItem } from '@/lib/api-types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function AuditLogsPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const [outcome, setOutcome] = useState('');
  const canReadAudit = hasPermission('audit:read');

  const auditQuery = useInfiniteQuery({
    queryKey: ['audit-logs', activeWorkspaceId, outcome],
    enabled: Boolean(activeWorkspaceId && canReadAudit),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '25' });
      if (outcome) params.set('outcome', outcome);
      if (pageParam) params.set('cursor', pageParam);
      return apiRequest<{ items: AuditLogItem[] }>(`/api/v1/audit-logs?${params.toString()}`, {
        workspaceId: activeWorkspaceId,
      });
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination?.hasMore ? lastPage.meta.pagination.nextCursor : undefined,
  });

  if (!canReadAudit) {
    return (
      <EmptyState
        icon={<ShieldAlert className="h-6 w-6" />}
        title="Audit logs restricted to Workspace Owners"
        description="Your current workspace role does not include the audit:read permission."
      />
    );
  }

  const items = auditQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security &amp; Audit Logs</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Immutable operational and authorization trail with request correlation IDs.
          </p>
        </div>

        <select
          aria-label="Filter audit logs by outcome"
          value={outcome}
          onChange={(e) => setOutcome(e.target.value)}
          className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
        >
          <option value="">All outcomes</option>
          <option value="SUCCESS">Success</option>
          <option value="DENIED">Denied</option>
          <option value="FAILURE">Failure</option>
        </select>
      </div>

      {auditQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Activity className="h-6 w-6" />}
          title="No audit events found"
          description="Workspace actions and authorization decisions will appear here."
        />
      ) : (
        <Card>
          <CardContent className="p-0">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="px-4 py-3 font-medium">Action</th>
                    <th className="px-4 py-3 font-medium">Actor</th>
                    <th className="px-4 py-3 font-medium">Outcome</th>
                    <th className="px-4 py-3 font-medium">Correlation ID</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {items.map((item) => (
                    <tr key={item.id}>
                      <td className="px-4 py-3">
                        <p className="font-mono text-xs font-semibold">{item.action}</p>
                        <p className="text-xs text-[var(--muted-foreground)]">
                          {item.resourceType}
                          {item.resourceId ? ` · ${item.resourceId.slice(0, 8)}` : ''}
                        </p>
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {item.actor ? (
                          <>
                            <p className="font-medium">{item.actor.fullName}</p>
                            <p className="text-[var(--muted-foreground)]">{item.actor.email}</p>
                          </>
                        ) : (
                          <span className="text-[var(--muted-foreground)]">System</span>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.outcome === 'SUCCESS'
                              ? 'success'
                              : item.outcome === 'DENIED'
                                ? 'destructive'
                                : 'warning'
                          }
                        >
                          {item.outcome}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 font-mono text-xs text-[var(--muted-foreground)]">
                        {item.correlationId.slice(0, 16)}
                      </td>
                      <td className="px-4 py-3 text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(item.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      )}

      {auditQuery.hasNextPage ? (
        <div className="flex justify-center">
          <Button
            variant="outline"
            disabled={auditQuery.isFetchingNextPage}
            onClick={() => void auditQuery.fetchNextPage()}
          >
            {auditQuery.isFetchingNextPage ? 'Loading...' : 'Load older events'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
