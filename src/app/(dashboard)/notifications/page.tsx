'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Bell, Check } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { NotificationItem } from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function NotificationsPage() {
  const { activeWorkspaceId } = useSession();
  const queryClient = useQueryClient();
  const [unreadOnly, setUnreadOnly] = useState(false);

  const notificationsQuery = useInfiniteQuery({
    queryKey: ['notifications', activeWorkspaceId, unreadOnly],
    enabled: Boolean(activeWorkspaceId),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const params = new URLSearchParams({ limit: '20' });
      if (unreadOnly) params.set('unreadOnly', 'true');
      if (pageParam) params.set('cursor', pageParam);

      return apiRequest<{ items: NotificationItem[]; unreadCount: number }>(
        `/api/v1/notifications?${params.toString()}`,
        { workspaceId: activeWorkspaceId },
      );
    },
    getNextPageParam: (lastPage) =>
      lastPage.meta.pagination?.hasMore ? lastPage.meta.pagination.nextCursor : undefined,
  });

  const markReadMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      return apiRequest(`/api/v1/notifications/${notificationId}`, {
        method: 'PATCH',
        workspaceId: activeWorkspaceId,
      });
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const items = notificationsQuery.data?.pages.flatMap((p) => p.data.items) ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Workspace operational alerts and security policy updates.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant={!unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly(false)}
          >
            All
          </Button>
          <Button
            variant={unreadOnly ? 'default' : 'outline'}
            size="sm"
            onClick={() => setUnreadOnly(true)}
          >
            Unread only
          </Button>
        </div>
      </div>

      {notificationsQuery.isLoading ? (
        <div className="space-y-3">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      ) : items.length === 0 ? (
        <EmptyState
          icon={<Bell className="h-6 w-6" />}
          title="All caught up"
          description={
            unreadOnly
              ? 'You have no unread notifications in this workspace.'
              : 'No notifications have been generated for this workspace yet.'
          }
        />
      ) : (
        <div className="space-y-3">
          {items.map((item) => (
            <Card
              key={item.id}
              className={item.readAt ? 'p-4 opacity-80' : 'border-[var(--primary)]/40 p-4'}
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        item.severity === 'CRITICAL'
                          ? 'destructive'
                          : item.severity === 'WARNING'
                            ? 'warning'
                            : 'default'
                      }
                    >
                      {item.severity}
                    </Badge>
                    <h2 className="text-sm font-semibold">{item.title}</h2>
                    {!item.readAt ? <Badge variant="outline">Unread</Badge> : null}
                  </div>
                  <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">{item.body}</p>
                  <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                    {formatRelativeTime(item.createdAt)}
                  </p>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {item.linkPath ? (
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={item.linkPath}>Open</Link>
                    </Button>
                  ) : null}
                  {!item.readAt ? (
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={markReadMutation.isPending}
                      onClick={() => markReadMutation.mutate(item.id)}
                    >
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      Mark read
                    </Button>
                  ) : null}
                </div>
              </div>
            </Card>
          ))}

          {notificationsQuery.hasNextPage ? (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                disabled={notificationsQuery.isFetchingNextPage}
                onClick={() => void notificationsQuery.fetchNextPage()}
              >
                {notificationsQuery.isFetchingNextPage ? 'Loading...' : 'Load older notifications'}
              </Button>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
