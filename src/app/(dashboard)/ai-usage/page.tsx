'use client';

import { useQuery } from '@tanstack/react-query';
import { Cpu, DollarSign, Layers, Zap } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type { AiUsageResponse } from '@/lib/api-types';
import { formatDateTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function AiUsagePage() {
  const { activeWorkspaceId } = useSession();

  const usageQuery = useQuery({
    queryKey: ['ai-usage', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<AiUsageResponse>('/api/v1/ai/usage', {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  if (usageQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
      </div>
    );
  }

  const data = usageQuery.data;
  if (!data) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">AI Usage &amp; Spend Controls</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Measured provider token usage, request latencies, and enforced workspace spending caps for{' '}
          <span className="font-mono font-medium">{data.billingPeriod}</span>.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>AI Requests</CardDescription>
            <Zap className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.periodTotals.requests}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Total Tokens</CardDescription>
            <Layers className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.periodTotals.totalTokens.toLocaleString()}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Max {data.budget?.maxMonthlyTokens.toLocaleString() ?? '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Period Expenditure</CardDescription>
            <DollarSign className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">${data.periodTotals.costUsd.toFixed(4)}</p>
            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
              Cap ${data.budget?.monthlyAiBudgetUsd.toFixed(2) ?? '—'}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardDescription>Active Providers</CardDescription>
            <Cpu className="h-4 w-4 text-[var(--muted-foreground)]" aria-hidden="true" />
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{data.breakdownByProvider.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Token Consumption by Provider &amp; Model</CardTitle>
        </CardHeader>
        <CardContent>
          {data.breakdownByProvider.length === 0 ? (
            <EmptyState
              icon={<Cpu className="h-5 w-5" />}
              title="No AI invocations recorded this period"
              description="Run an automated PR review to record provider token usage and expenditure."
            />
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data.breakdownByProvider}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="model" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip />
                  <Bar
                    dataKey="totalTokens"
                    name="Total Tokens"
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
          <CardTitle>Recent AI Requests</CardTitle>
          <CardDescription>
            Includes rejected schemas, budget blocks, and latency metrics
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {data.recentRequests.length === 0 ? (
            <p className="p-6 text-center text-sm text-[var(--muted-foreground)]">
              No AI requests logged yet.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
                    <th className="px-4 py-3 font-medium">Provider / Model</th>
                    <th className="px-4 py-3 font-medium">Status</th>
                    <th className="px-4 py-3 font-medium">Tokens</th>
                    <th className="px-4 py-3 font-medium">Cost</th>
                    <th className="px-4 py-3 font-medium">Latency</th>
                    <th className="px-4 py-3 font-medium">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {data.recentRequests.map((req) => (
                    <tr key={req.id}>
                      <td className="px-4 py-2.5">
                        <p className="font-mono text-xs font-semibold">{req.provider}</p>
                        <p className="font-mono text-xs text-[var(--muted-foreground)]">
                          {req.model}
                        </p>
                      </td>
                      <td className="px-4 py-2.5">
                        <Badge
                          variant={
                            req.status === 'SUCCEEDED'
                              ? 'success'
                              : req.status === 'PENDING'
                                ? 'warning'
                                : 'destructive'
                          }
                        >
                          {req.status}
                        </Badge>
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        {req.totalTokens.toLocaleString()}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">
                        ${req.estimatedCostUsd.toFixed(6)}
                      </td>
                      <td className="px-4 py-2.5 font-mono text-xs">{req.latencyMs}ms</td>
                      <td className="px-4 py-2.5 text-xs text-[var(--muted-foreground)]">
                        {formatDateTime(req.createdAt)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
