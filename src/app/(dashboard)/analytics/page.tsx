'use client';

import { useQuery } from '@tanstack/react-query';
import { BarChart3, Info, ShieldAlert, TrendingUp } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { useSession } from '@/hooks/useSession';
import { apiRequest } from '@/lib/api-client';
import type {
  CodeQualityAnalytics,
  ReviewPerformanceAnalytics,
  SecurityAnalytics,
} from '@/lib/api-types';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';

export default function EngineeringAnalyticsPage() {
  const { activeWorkspaceId } = useSession();

  const codeQualityQuery = useQuery({
    queryKey: ['analytics', 'code-quality', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () =>
      (
        await apiRequest<CodeQualityAnalytics>('/api/v1/analytics/code-quality', {
          workspaceId: activeWorkspaceId,
        })
      ).data,
  });

  const securityQuery = useQuery({
    queryKey: ['analytics', 'security', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () =>
      (
        await apiRequest<SecurityAnalytics>('/api/v1/analytics/security', {
          workspaceId: activeWorkspaceId,
        })
      ).data,
  });

  const reviewPerfQuery = useQuery({
    queryKey: ['analytics', 'review-performance', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () =>
      (
        await apiRequest<ReviewPerformanceAnalytics>('/api/v1/analytics/review-performance', {
          workspaceId: activeWorkspaceId,
        })
      ).data,
  });

  if (codeQualityQuery.isLoading || securityQuery.isLoading || reviewPerfQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-64" />
        <div className="grid gap-4 sm:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 w-full" />
          ))}
        </div>
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  const cq = codeQualityQuery.data;
  const sec = securityQuery.data;
  const perf = reviewPerfQuery.data;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Engineering Intelligence Analytics</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Real metrics derived strictly from persisted MySQL scans, AST dependency graphs, PR
          reviews, and AI usage records — zero fabricated numbers.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Deterministic Code Health</CardDescription>
            <CardTitle className="text-3xl">
              {cq?.summary.codeHealthScore !== null && cq?.summary.codeHealthScore !== undefined
                ? `${cq.summary.codeHealthScore} / 100`
                : 'Not Scanned'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {cq?.summary.circularDependencies ?? 0} circular dep(s) · avg instability{' '}
            {(cq?.summary.averageInstability ?? 0).toFixed(2)}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Open Vulnerabilities</CardDescription>
            <CardTitle className="text-3xl">{sec?.summary.openVulnerabilities ?? 0}</CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {sec?.summary.totalVulnerabilities ?? 0} total ·{' '}
            {sec?.summary.activeRiskAcceptances ?? 0} accepted risk(s)
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Review Feedback Precision</CardDescription>
            <CardTitle className="text-3xl">
              {perf?.summary.helpfulPrecisionRate !== null &&
              perf?.summary.helpfulPrecisionRate !== undefined
                ? `${Math.round(perf.summary.helpfulPrecisionRate * 100)}%`
                : 'No Votes'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {perf?.summary.totalReviews ?? 0} reviews · avg AI latency{' '}
            {perf?.summary.averageAiLatencyMs ?? 0}ms
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Syntax-Valid Generated Tests</CardDescription>
            <CardTitle className="text-3xl">
              {cq?.summary.syntaxValidTestsRate !== null &&
              cq?.summary.syntaxValidTestsRate !== undefined
                ? `${Math.round(cq.summary.syntaxValidTestsRate * 100)}%`
                : '0'}
            </CardTitle>
          </CardHeader>
          <CardContent className="text-xs text-[var(--muted-foreground)]">
            {cq?.summary.generatedTestsTotal ?? 0} generated · {cq?.summary.approvedTestsCount ?? 0}{' '}
            approved
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldAlert className="h-4 w-4 text-red-500" />
              Vulnerabilities by Scanner
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!sec || sec.byScanner.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                Run a Security Scan to populate scanner breakdown metrics.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={sec.byScanner}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="scanner" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar
                      dataKey="count"
                      name="Findings"
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
            <CardTitle className="flex items-center gap-2 text-base">
              <TrendingUp className="h-4 w-4 text-emerald-500" />
              AI Token Consumption by Purpose
            </CardTitle>
          </CardHeader>
          <CardContent>
            {!perf || perf.aiUsageByPurpose.length === 0 ? (
              <p className="py-8 text-center text-sm text-[var(--muted-foreground)]">
                No AI usage records recorded in this workspace yet.
              </p>
            ) : (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={perf.aiUsageByPurpose}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                    <XAxis dataKey="purpose" fontSize={11} />
                    <YAxis allowDecimals={false} fontSize={11} />
                    <Tooltip />
                    <Bar dataKey="totalTokens" name="Tokens" fill="#10b981" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {cq ? (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-sm">
              <Info className="h-4 w-4 text-[var(--primary)]" />
              Code Health Score Formula &amp; Measurement Transparency
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-[var(--muted-foreground)]">
            <p className="font-mono text-[var(--foreground)]">{cq.methodology.formula}</p>
            <ul className="list-disc space-y-1 pl-4">
              {cq.methodology.caveats.map((c, i) => (
                <li key={i}>{c}</li>
              ))}
            </ul>
            <div className="flex flex-wrap gap-2 pt-2">
              <Badge variant="secondary">
                <BarChart3 className="h-3 w-3" />
                {cq.summary.indexedFilesCount} indexed files
              </Badge>
              <Badge variant="secondary">{cq.summary.symbolsCount} AST symbols</Badge>
              <Badge variant="secondary">
                {sec?.summary.totalDependenciesAudited ?? 0} dependencies audited
              </Badge>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
