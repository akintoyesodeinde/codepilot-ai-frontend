'use client';

import { useQuery } from '@tanstack/react-query';
import { Lock, Server, ShieldCheck } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { PlatformAdminOverview } from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function PlatformAdminPage() {
  const { user } = useSession();

  const overviewQuery = useQuery({
    queryKey: ['platform-admin-overview'],
    enabled: Boolean(user?.isPlatformAdmin),
    queryFn: async () => (await apiRequest<PlatformAdminOverview>('/api/v1/admin/overview')).data,
  });

  if (!user?.isPlatformAdmin) {
    return (
      <EmptyState
        icon={<Lock className="h-6 w-6" />}
        title="Platform Administrator Role Required"
        description="This operational telemetry console is restricted to Platform Administrators. Tenant source code is never accessible from this boundary."
      />
    );
  }

  if (overviewQuery.isLoading || !overviewQuery.data) {
    return <Skeleton className="h-64 w-full" />;
  }

  const data = overviewQuery.data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Platform Operations Overview</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Aggregated system health and metering metrics across workspaces with zero access to
            private tenant source code.
          </p>
        </div>
        <Badge variant="success">
          <ShieldCheck className="h-3.5 w-3.5" />
          Tenant Code Access: {data.tenantCodeAccessGranted ? 'GRANTED' : 'DENIED BY DESIGN'}
        </Badge>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Workspaces</CardDescription>
            <CardTitle className="text-3xl">{data.summary.activeWorkspaces}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active Users</CardDescription>
            <CardTitle className="text-3xl">{data.summary.activeUsers}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Platform AI Spend</CardDescription>
            <CardTitle className="text-3xl">
              ${data.summary.totalPlatformAiSpendUsd.toFixed(4)}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {data.summary.totalPlatformTokens.toLocaleString()} tokens across{' '}
            {data.summary.totalAiRequests} requests
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Failed / Dead-Lettered Jobs</CardDescription>
            <CardTitle className="text-3xl">{data.summary.failedOrDeadLetteredJobs}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Server className="h-4 w-4" />
            Background Job Distribution
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          {data.jobsByStatus.map((j) => (
            <Badge key={j.status} variant="secondary" className="px-3 py-1 text-xs">
              {j.status}: {j.count}
            </Badge>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
