'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  FileDiff,
  Flag,
  Play,
  Send,
  ShieldAlert,
  ThumbsDown,
  ThumbsUp,
  XCircle,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type {
  CodeReviewDetail,
  PullRequestDetail,
  PullRequestDiffFile,
  ReviewFindingItem,
} from '@/lib/api-types';
import { formatDateTime, shortSha } from '@/lib/utils';
import { UnifiedDiffViewer } from '@/components/code/UnifiedDiffViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

const SEVERITIES = ['ALL', 'CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO'] as const;

function severityBadgeVariant(sev: string) {
  switch (sev) {
    case 'CRITICAL':
    case 'HIGH':
      return 'destructive' as const;
    case 'MEDIUM':
      return 'warning' as const;
    case 'LOW':
      return 'default' as const;
    default:
      return 'secondary' as const;
  }
}

export default function PullRequestDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('repository:write');

  const [activeTab, setActiveTab] = useState<'review' | 'diff'>('review');
  const [severityFilter, setSeverityFilter] = useState<string>('ALL');
  const [selectedReviewId, setSelectedReviewId] = useState<string | null>(null);
  const [actionBanner, setActionBanner] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const prQuery = useQuery({
    queryKey: ['pull-request', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<PullRequestDetail>(`/api/v1/pull-requests/${params.id}`, {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  const diffQuery = useQuery({
    queryKey: ['pull-request-diff', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<{ headSha: string; files: PullRequestDiffFile[] }>(
        `/api/v1/pull-requests/${params.id}/diff`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const activeReviewId = selectedReviewId ?? prQuery.data?.reviews[0]?.id ?? null;

  const reviewQuery = useQuery({
    queryKey: ['code-review', activeWorkspaceId, activeReviewId],
    enabled: Boolean(activeWorkspaceId && activeReviewId),
    refetchInterval: (q) => {
      const st = q.state.data?.status;
      return st && ['QUEUED', 'FETCHING_CONTEXT', 'ANALYZING', 'VALIDATING'].includes(st)
        ? 3000
        : false;
    },
    queryFn: async () => {
      const res = await apiRequest<CodeReviewDetail>(`/api/v1/reviews/${activeReviewId}`, {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  const findingsQuery = useQuery({
    queryKey: ['review-findings', activeWorkspaceId, activeReviewId, severityFilter],
    enabled: Boolean(activeWorkspaceId && activeReviewId),
    queryFn: async () => {
      const suffix = severityFilter !== 'ALL' ? `?severity=${severityFilter}` : '';
      const res = await apiRequest<{ items: ReviewFindingItem[] }>(
        `/api/v1/reviews/${activeReviewId}/findings${suffix}`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const triggerReviewMutation = useMutation({
    mutationFn: async () =>
      apiRequest<{ reviewId: string; jobId: string; deduplicated: boolean }>(
        `/api/v1/pull-requests/${params.id}/reviews`,
        {
          method: 'POST',
          workspaceId: activeWorkspaceId,
          body: { policyVersion: 'v1' },
        },
      ),
    onSuccess: (res) => {
      setSelectedReviewId(res.data.reviewId);
      setActionBanner({
        type: 'success',
        text: res.data.deduplicated
          ? 'An automated review for this commit SHA already exists.'
          : `Automated PR review queued (Job ID: ${res.data.jobId.slice(0, 8)}).`,
      });
      void queryClient.invalidateQueries({
        queryKey: ['pull-request', activeWorkspaceId, params.id],
      });
      void queryClient.invalidateQueries({ queryKey: ['code-review'] });
    },
    onError: (err) => {
      setActionBanner({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to trigger review.',
      });
    },
  });

  const approveMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/v1/reviews/${activeReviewId}/approve`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
      }),
    onSuccess: () => {
      setActionBanner({
        type: 'success',
        text: 'Review approved. You can now publish validated findings to GitHub.',
      });
      void queryClient.invalidateQueries({
        queryKey: ['code-review', activeWorkspaceId, activeReviewId],
      });
      void queryClient.invalidateQueries({
        queryKey: ['pull-request', activeWorkspaceId, params.id],
      });
    },
    onError: (err) => {
      setActionBanner({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to approve review.',
      });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: async () =>
      apiRequest(`/api/v1/reviews/${activeReviewId}/reject`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: { reason: 'Rejected by workspace reviewer' },
      }),
    onSuccess: () => {
      setActionBanner({
        type: 'success',
        text: 'Review marked as REJECTED and blocked from publishing.',
      });
      void queryClient.invalidateQueries({
        queryKey: ['code-review', activeWorkspaceId, activeReviewId],
      });
    },
    onError: (err) => {
      setActionBanner({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to reject review.',
      });
    },
  });

  const publishMutation = useMutation({
    mutationFn: async () =>
      apiRequest<{ publishedCommentsCount: number; alreadyPublished: boolean }>(
        `/api/v1/reviews/${activeReviewId}/publish`,
        {
          method: 'POST',
          workspaceId: activeWorkspaceId,
        },
      ),
    onSuccess: (res) => {
      setActionBanner({
        type: 'success',
        text: res.data.alreadyPublished
          ? 'This review was already published to GitHub.'
          : `Published ${res.data.publishedCommentsCount} validated review comment(s) to GitHub.`,
      });
      void queryClient.invalidateQueries({
        queryKey: ['code-review', activeWorkspaceId, activeReviewId],
      });
      void queryClient.invalidateQueries({ queryKey: ['review-findings'] });
    },
    onError: (err) => {
      setActionBanner({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to publish review to GitHub.',
      });
    },
  });

  const feedbackMutation = useMutation({
    mutationFn: async (input: {
      findingId: string;
      vote: 'HELPFUL' | 'NOT_HELPFUL' | 'FALSE_POSITIVE';
    }) =>
      apiRequest(`/api/v1/findings/${input.findingId}/feedback`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: { vote: input.vote },
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['review-findings'] });
    },
  });

  if (prQuery.isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-96" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (prQuery.isError || !prQuery.data) {
    return (
      <Card>
        <CardContent className="p-6 text-sm text-red-600 dark:text-red-400">
          Pull request not found in this workspace.
        </CardContent>
      </Card>
    );
  }

  const pr = prQuery.data;
  const review = reviewQuery.data ?? null;
  const findings = findingsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/pull-requests">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All pull requests
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant={pr.state === 'OPEN' ? 'success' : 'secondary'}>{pr.state}</Badge>
            <span className="font-mono text-xs text-[var(--muted-foreground)]">
              {pr.repository.fullName}#{pr.prNumber}
            </span>
          </div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight">{pr.title}</h1>
          <p className="mt-1 text-xs text-[var(--muted-foreground)]">
            <code className="font-mono">
              {pr.headBranch} &rarr; {pr.baseBranch}
            </code>{' '}
            &middot; HEAD <code className="font-mono">{shortSha(pr.headSha)}</code> &middot; Author{' '}
            {pr.authorLogin}
          </p>
        </div>

        {canWrite ? (
          <Button
            onClick={() => triggerReviewMutation.mutate()}
            disabled={triggerReviewMutation.isPending}
          >
            <Play className="h-4 w-4" aria-hidden="true" />
            {triggerReviewMutation.isPending ? 'Scheduling...' : 'Run AI Review'}
          </Button>
        ) : null}
      </div>

      {actionBanner ? (
        <div
          role={actionBanner.type === 'error' ? 'alert' : 'status'}
          className={
            actionBanner.type === 'success'
              ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
              : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          {actionBanner.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{actionBanner.text}</span>
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <Button
          variant={activeTab === 'review' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('review')}
        >
          <ShieldAlert className="h-4 w-4" aria-hidden="true" />
          AI Review &amp; Findings ({review?.findingsCount ?? 0})
        </Button>
        <Button
          variant={activeTab === 'diff' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('diff')}
        >
          <FileDiff className="h-4 w-4" aria-hidden="true" />
          Changed Files Diff ({diffQuery.data?.files.length ?? 0})
        </Button>
      </div>

      {activeTab === 'diff' ? (
        <UnifiedDiffViewer files={diffQuery.data?.files ?? []} />
      ) : !review ? (
        <EmptyState
          icon={<ShieldAlert className="h-6 w-6" />}
          title="No automated review yet"
          description="Schedule an asynchronous deterministic + AI code review for this pull request head commit."
          action={
            canWrite ? (
              <Button onClick={() => triggerReviewMutation.mutate()}>Run AI Review</Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-6">
          {/* Review Lifecycle & Controls */}
          <Card>
            <CardHeader>
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-2">
                  <CardTitle>Review Status: {review.status}</CardTitle>
                  {review.overallRisk ? (
                    <Badge variant={severityBadgeVariant(review.overallRisk)}>
                      Risk: {review.overallRisk}
                    </Badge>
                  ) : null}
                  {review.rejectedFindingsCount > 0 ? (
                    <Badge variant="warning">
                      {review.rejectedFindingsCount} hallucinated ref(s) filtered
                    </Badge>
                  ) : null}
                </div>

                {canWrite ? (
                  <div className="flex flex-wrap items-center gap-2">
                    {review.status === 'AWAITING_APPROVAL' ? (
                      <>
                        <Button
                          size="sm"
                          disabled={approveMutation.isPending}
                          onClick={() => approveMutation.mutate()}
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={rejectMutation.isPending}
                          onClick={() => rejectMutation.mutate()}
                        >
                          <XCircle className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </Button>
                      </>
                    ) : null}

                    {review.status === 'COMPLETED' ||
                    review.status === 'COMPLETED_WITH_WARNINGS' ? (
                      <Button
                        size="sm"
                        disabled={publishMutation.isPending}
                        onClick={() => publishMutation.mutate()}
                      >
                        <Send className="h-3.5 w-3.5" aria-hidden="true" />
                        {publishMutation.isPending ? 'Publishing...' : 'Publish to GitHub'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}
              </div>
              <CardDescription>
                Commit <code className="font-mono">{shortSha(review.headSha)}</code> &middot; Policy{' '}
                <code className="font-mono">{review.policyVersion}</code> &middot; Updated{' '}
                {formatDateTime(review.updatedAt)}
                {review.publishedAt ? ` · Published ${formatDateTime(review.publishedAt)}` : ''}
              </CardDescription>
            </CardHeader>
            {review.summaryMarkdown ? (
              <CardContent>
                <p className="whitespace-pre-wrap text-sm leading-relaxed">
                  {review.summaryMarkdown}
                </p>
              </CardContent>
            ) : null}
          </Card>

          {/* Severity Filter */}
          <div className="flex flex-wrap items-center gap-2">
            {SEVERITIES.map((sev) => (
              <Button
                key={sev}
                size="sm"
                variant={severityFilter === sev ? 'default' : 'outline'}
                onClick={() => setSeverityFilter(sev)}
              >
                {sev}
              </Button>
            ))}
          </div>

          {/* Findings List */}
          {findings.length === 0 ? (
            <EmptyState
              icon={<CheckCircle2 className="h-6 w-6" />}
              title="No findings matching filter"
              description="Either no defects were identified or no findings match the selected severity filter."
            />
          ) : (
            <div className="space-y-3">
              {findings.map((finding) => (
                <Card key={finding.id} className="p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1 space-y-2">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant={severityBadgeVariant(finding.severity)}>
                          {finding.severity}
                        </Badge>
                        <Badge variant={finding.source === 'DETERMINISTIC' ? 'success' : 'default'}>
                          {finding.source}
                        </Badge>
                        <Badge variant="secondary">{finding.category}</Badge>
                        <h3 className="text-sm font-semibold">{finding.title}</h3>
                      </div>

                      <p className="font-mono text-xs text-[var(--muted-foreground)]">
                        {finding.filePath}:{finding.startLine}
                        {finding.endLine !== finding.startLine ? `-${finding.endLine}` : ''}
                      </p>

                      <p className="text-sm text-[var(--foreground)]">{finding.description}</p>

                      {finding.evidenceSnippet ? (
                        <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/60 p-2.5 font-mono text-xs">
                          {finding.evidenceSnippet}
                        </pre>
                      ) : null}

                      {finding.suggestion ? (
                        <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3 text-xs">
                          <span className="font-semibold text-emerald-700 dark:text-emerald-300">
                            Recommended fix:{' '}
                          </span>
                          {finding.suggestion}
                        </div>
                      ) : null}
                    </div>

                    <div className="flex shrink-0 items-center gap-1.5">
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Mark finding helpful"
                        onClick={() =>
                          feedbackMutation.mutate({ findingId: finding.id, vote: 'HELPFUL' })
                        }
                      >
                        <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{finding.feedbackSummary.helpful}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Mark finding not helpful"
                        onClick={() =>
                          feedbackMutation.mutate({ findingId: finding.id, vote: 'NOT_HELPFUL' })
                        }
                      >
                        <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{finding.feedbackSummary.notHelpful}</span>
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        aria-label="Flag false positive"
                        onClick={() =>
                          feedbackMutation.mutate({
                            findingId: finding.id,
                            vote: 'FALSE_POSITIVE',
                          })
                        }
                      >
                        <Flag className="h-3.5 w-3.5" aria-hidden="true" />
                        <span>{finding.feedbackSummary.falsePositive}</span>
                      </Button>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
