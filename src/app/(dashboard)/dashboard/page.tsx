'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import {
  Activity,
  AlertCircle,
  ArrowRight,
  FolderGit2,
  GitBranch,
  GitCommit,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { AnalyticsOverview } from '@/lib/api-types';
import { formatRelativeTime, shortSha } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function DashboardOverviewPage() {
  const { activeWorkspace, activeWorkspaceId } = useSession();

  const overviewQuery = useQuery({
    queryKey: ['analytics', 'overview', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<AnalyticsOverview>('/api/v1/analytics/overview', {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  if (overviewQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <div className="grid gap-6 lg:grid-cols-2">
          <Skeleton className="h-72 w-full" />
          <Skeleton className="h-72 w-full" />
        </div>
      </div>
    );
  }

  if (overviewQuery.isError || !overviewQuery.data) {
    return (
      <Card>
        <CardContent className="flex items-center gap-3 p-6 text-sm text-red-600 dark:text-red-400">
          <AlertCircle className="h-5 w-5 shrink-0" aria-hidden="true" />
          <span>Failed to load workspace analytics from the backend API.</span>
          <Button variant="outline" size="sm" onClick={() => void overviewQuery.refetch()}>
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  const data = overviewQuery.data;
  const kpis = [
    {
      label: 'Connected Repositories',
      value: data.summary.connectedRepositories,
      sub: `${data.summary.trackedBranches} branches tracked`,
      icon: FolderGit2,
      href: '/repositories',
    },
    {
      label: 'Tracked Commits',
      value: data.summary.trackedCommits,
      sub: `${data.summary.activeGithubInstallations} GitHub installation(s)`,
      icon: GitCommit,
      href: '/repositories',
    },
    {
      label: 'Workspace Members',
      value: data.summary.activeMembers,
      sub: `${data.summary.pendingInvitations} pending invitation(s)`,
      icon: Users,
      href: '/team',
    },
    {
      label: 'Audit Events (7d)',
      value: data.summary.auditEventsLast7Days,
      sub: `${data.summary.unreadNotifications} unread notification(s)`,
      icon: Activity,
      href: '/audit-logs',
    },
  ];

  const budgetPct =
    data.usage && data.usage.monthlyAiBudgetUsd > 0
      ? Math.min(100, (data.usage.currentMonthSpendUsd / data.usage.monthlyAiBudgetUsd) * 100)
      : 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Engineering Intelligence Overview</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Live workspace metrics for{' '}
            <span className="font-medium text-[var(--foreground)]">{activeWorkspace?.name}</span>{' '}
            sourced directly from MySQL via the backend REST API.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant="success">
            <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
            Phase 1 Foundation Active
          </Badge>
        </div>
      </div>

      {/* KPI Grid */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => {
          const Icon = kpi.icon;
          return (
            <Link key={kpi.label} href={kpi.href} className="group block">
              <Card className="transition-colors group-hover:border-[var(--primary)]/50">
                <CardHeader className="flex flex-row items-center justify-between pb-2">
                  <CardDescription className="font-medium">{kpi.label}</CardDescription>
                  <Icon className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold tracking-tight">{kpi.value}</p>
                  <p className="mt-1 text-xs text-[var(--muted-foreground)]">{kpi.sub}</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* Charts + Quota */}
      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Repository Language Distribution</CardTitle>
            <CardDescription>
              Active repositories grouped by primary language stored in this workspace
            </CardDescription>
          </CardHeader>
          <CardContent>
            {data.repositoriesByLanguage.length === 0 ? (
              <EmptyState
                icon={<FolderGit2 className="h-5 w-5" />}
                title="No repositories connected yet"
                description="Connect a GitHub App installation in Phase 2 or seed synthetic development repositories to populate language analytics."
              />
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={data.repositoriesByLanguage}
                    margin={{ top: 8, right: 16, left: -12, bottom: 0 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="language" fontSize={12} tickLine={false} axisLine={false} />
                    <YAxis allowDecimals={false} fontSize={12} tickLine={false} axisLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'var(--card)',
                        borderColor: 'var(--border)',
                        borderRadius: '0.5rem',
                        fontSize: '0.75rem',
                      }}
                    />
                    <Bar
                      dataKey="count"
                      name="Repositories"
                      fill="var(--primary)"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Workspace Quotas &amp; AI Budget</CardTitle>
            <CardDescription>
              Enforced application-level spending and resource guardrails
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {data.usage ? (
              <>
                <div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-[var(--muted-foreground)]">Monthly AI Spend</span>
                    <span className="font-mono font-medium">
                      ${data.usage.currentMonthSpendUsd.toFixed(2)} / $
                      {data.usage.monthlyAiBudgetUsd.toFixed(2)}
                    </span>
                  </div>
                  <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-[var(--muted)]">
                    <div
                      className="h-full rounded-full bg-[var(--primary)]"
                      style={{ width: `${budgetPct}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 pt-2">
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Repositories</p>
                    <p className="mt-1 text-lg font-semibold">
                      {data.summary.connectedRepositories} / {data.usage.maxRepositories}
                    </p>
                  </div>
                  <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3">
                    <p className="text-xs text-[var(--muted-foreground)]">Members</p>
                    <p className="mt-1 text-lg font-semibold">
                      {data.summary.activeMembers} / {data.usage.maxMembers}
                    </p>
                  </div>
                </div>

                <div className="rounded-lg border border-[var(--border)] p-3 text-xs text-[var(--muted-foreground)]">
                  Token budget: {data.usage.currentMonthTokens.toLocaleString()} /{' '}
                  {data.usage.maxMonthlyTokens.toLocaleString()} tokens this period.
                </div>

                <Button variant="outline" size="sm" asChild className="w-full">
                  <Link href="/settings">
                    Configure limits &amp; policies
                    <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
                  </Link>
                </Button>
              </>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {/* Recent Commits & Recent Audit Activity */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Repository Commits</CardTitle>
              <CardDescription>
                Latest tracked commits across workspace repositories
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/repositories">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentCommits.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No commits tracked in this workspace yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.recentCommits.map((commit) => (
                  <li
                    key={commit.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <Link
                        href={`/repositories/${commit.repository.id}`}
                        className="block truncate text-sm font-medium hover:text-[var(--primary)]"
                      >
                        {commit.messageHeadline}
                      </Link>
                      <p className="mt-0.5 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                        <GitBranch className="h-3 w-3 shrink-0" aria-hidden="true" />
                        <span className="truncate">{commit.repository.fullName}</span>
                        <span>&middot;</span>
                        <span>{commit.authorName}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <code className="rounded bg-[var(--muted)] px-1.5 py-0.5 font-mono text-xs">
                        {shortSha(commit.sha)}
                      </code>
                      <p className="mt-1 text-[11px] text-[var(--muted-foreground)]">
                        {formatRelativeTime(commit.committedAt)}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Workspace Activity</CardTitle>
              <CardDescription>
                Security and operational events logged for this tenant
              </CardDescription>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/audit-logs">Audit log</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.recentActivity.length === 0 ? (
              <p className="py-6 text-center text-sm text-[var(--muted-foreground)]">
                No workspace audit activity recorded yet.
              </p>
            ) : (
              <ul className="divide-y divide-[var(--border)]">
                {data.recentActivity.map((event) => (
                  <li
                    key={event.id}
                    className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono text-xs font-medium">{event.action}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {event.actorName} &middot; {event.resourceType}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge
                        variant={
                          event.outcome === 'SUCCESS'
                            ? 'success'
                            : event.outcome === 'DENIED'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {event.outcome}
                      </Badge>
                      <span className="text-[11px] text-[var(--muted-foreground)]">
                        {formatRelativeTime(event.createdAt)}
                      </span>
                    </div>
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
