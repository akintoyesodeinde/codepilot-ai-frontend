'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  AlertCircle,
  CheckCircle2,
  Download,
  FlaskConical,
  Play,
  ShieldCheck,
  ThumbsDown,
  ThumbsUp,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type {
  RepositoryItem,
  TestGenerationJobDetail,
  TestGenerationJobSummary,
} from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/utils';
import { MonacoCodeViewer } from '@/components/code/MonacoCodeViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';

const LANGUAGE_FRAMEWORKS: Record<string, string[]> = {
  typescript: ['vitest', 'jest'],
  javascript: ['vitest', 'jest'],
  python: ['pytest', 'unittest'],
  java: ['junit5'],
  c_sharp: ['xunit'],
  go: ['testing'],
};

export default function AiTestStudioPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canGenerate = hasPermission('repository:write');

  const [selectedRepoId, setSelectedRepoId] = useState('');
  const [targetFilePath, setTargetFilePath] = useState('src/ledger/transfer-service.ts');
  const [language, setLanguage] = useState<string>('typescript');
  const [framework, setFramework] = useState<string>('vitest');
  const [selectedJobId, setSelectedJobId] = useState<string>('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const reposQuery = useQuery({
    queryKey: ['repositories', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{ items: RepositoryItem[] }>('/api/v1/repositories', {
        workspaceId: activeWorkspaceId,
      });
      return res.data.items;
    },
  });

  const activeRepoId = selectedRepoId || reposQuery.data?.[0]?.id || '';

  const jobsQuery = useQuery({
    queryKey: ['test-gen-jobs', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{ items: TestGenerationJobSummary[] }>(
        '/api/v1/test-generation/jobs',
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const activeJobId = selectedJobId || jobsQuery.data?.[0]?.id || '';

  const detailQuery = useQuery({
    queryKey: ['test-gen-job-detail', activeWorkspaceId, activeJobId],
    enabled: Boolean(activeWorkspaceId && activeJobId),
    queryFn: async () => {
      const res = await apiRequest<TestGenerationJobDetail>(
        `/api/v1/test-generation/jobs/${activeJobId}`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const generateMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ testGenerationJobId: string }>(
        `/api/v1/repositories/${activeRepoId}/test-generation`,
        {
          method: 'POST',
          workspaceId: activeWorkspaceId,
          body: {
            targetFilePath,
            language,
            framework,
            testTypes: ['UNIT', 'SECURITY', 'REGRESSION'],
          },
        },
      );
    },
    onSuccess: (res) => {
      setSelectedJobId(res.data.testGenerationJobId);
      setFeedback({
        type: 'success',
        text: 'Test generation job queued. Syntax validation runs safely in Tree-sitter WASM without executing untrusted repository code.',
      });
      void queryClient.invalidateQueries({ queryKey: ['test-gen-jobs'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to schedule test generation.',
      });
    },
  });

  const approvalMutation = useMutation({
    mutationFn: async (input: { id: string; approvalStatus: 'APPROVED' | 'REJECTED' }) => {
      return apiRequest(`/api/v1/generated-tests/${input.id}`, {
        method: 'PATCH',
        workspaceId: activeWorkspaceId,
        body: { approvalStatus: input.approvalStatus },
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', text: 'Generated test approval recorded.' });
      void queryClient.invalidateQueries({ queryKey: ['test-gen-job-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['test-gen-jobs'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to update test approval.',
      });
    },
  });

  function downloadTestFile(filename: string, code: string) {
    const blob = new Blob([code], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename.split('/').pop() ?? 'generated.test.ts';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">AI Test Studio</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Generate unit, security, and regression test suites for TypeScript/JavaScript (primary)
            plus Python, Java, C#, and Go with Tree-sitter WASM syntax verification.
          </p>
        </div>
        <Badge variant="success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Static AST Validation Only (Zero Host Execution)
        </Badge>
      </div>

      {feedback ? (
        <div
          role={feedback.type === 'error' ? 'alert' : 'status'}
          className={
            feedback.type === 'success'
              ? 'flex items-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
              : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          {feedback.type === 'success' ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      {/* Generator controls */}
      {canGenerate ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Generate New Test Suite</CardTitle>
            <CardDescription>
              Select repository, target source path, language adapter, and test framework.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-5">
            <select
              aria-label="Repository"
              value={activeRepoId}
              onChange={(e) => setSelectedRepoId(e.target.value)}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
            >
              {(reposQuery.data ?? []).map((r) => (
                <option key={r.id} value={r.id}>
                  {r.fullName}
                </option>
              ))}
            </select>
            <Input
              value={targetFilePath}
              onChange={(e) => setTargetFilePath(e.target.value)}
              placeholder="src/ledger/transfer-service.ts"
              className="font-mono text-xs md:col-span-2"
            />
            <select
              aria-label="Target language"
              value={language}
              onChange={(e) => {
                const nextLang = e.target.value;
                setLanguage(nextLang);
                setFramework(LANGUAGE_FRAMEWORKS[nextLang]?.[0] ?? 'vitest');
              }}
              className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
            >
              <option value="typescript">TypeScript (Vitest / Jest)</option>
              <option value="javascript">JavaScript (Vitest / Jest)</option>
              <option value="python">Python (pytest)</option>
              <option value="java">Java (JUnit 5)</option>
              <option value="c_sharp">C# (xUnit)</option>
              <option value="go">Go (testing)</option>
            </select>
            <Button
              onClick={() => generateMutation.mutate()}
              disabled={generateMutation.isPending || !activeRepoId || !targetFilePath.trim()}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {generateMutation.isPending ? 'Queueing...' : 'Generate Tests'}
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-4">
        <Card className="lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-sm">Generation Jobs</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {jobsQuery.isLoading ? (
              <Skeleton className="h-32 w-full" />
            ) : (jobsQuery.data ?? []).length === 0 ? (
              <p className="text-xs text-[var(--muted-foreground)]">
                No test generation jobs recorded yet.
              </p>
            ) : (
              (jobsQuery.data ?? []).map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors ${
                    job.id === activeJobId
                      ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                      : 'border-[var(--border)] hover:bg-[var(--muted)]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <Badge
                      variant={
                        job.status === 'COMPLETED'
                          ? 'success'
                          : job.status === 'FAILED'
                            ? 'destructive'
                            : 'warning'
                      }
                    >
                      {job.status}
                    </Badge>
                    <span className="font-mono text-[10px] uppercase">{job.framework}</span>
                  </div>
                  <p className="mt-1 truncate font-mono font-medium">{job.targetFilePath}</p>
                  <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                    {job.syntaxValidCount}/{job.generatedTestsCount} syntax valid &middot;{' '}
                    {formatRelativeTime(job.createdAt)}
                  </p>
                </button>
              ))
            )}
          </CardContent>
        </Card>

        <div className="space-y-4 lg:col-span-3">
          {detailQuery.isLoading ? (
            <Skeleton className="h-64 w-full" />
          ) : !detailQuery.data || detailQuery.data.generatedTests.length === 0 ? (
            <EmptyState
              icon={<FlaskConical className="h-6 w-6" />}
              title="Select or generate a test suite"
              description="Generated test code is syntax-validated with Tree-sitter WASM and awaits explicit engineer approval before download."
            />
          ) : (
            detailQuery.data.generatedTests.map((t) => (
              <Card key={t.id}>
                <CardHeader className="flex flex-wrap flex-row items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant="default">{t.testType}</Badge>
                      <Badge variant="secondary">
                        {t.language} / {t.framework}
                      </Badge>
                      <Badge variant={t.syntaxValid ? 'success' : 'destructive'}>
                        {t.syntaxValid ? 'Syntax Verified (WASM AST)' : 'Syntax Diagnostics Found'}
                      </Badge>
                      <Badge
                        variant={
                          t.approvalStatus === 'APPROVED'
                            ? 'success'
                            : t.approvalStatus === 'REJECTED'
                              ? 'destructive'
                              : 'warning'
                        }
                      >
                        {t.approvalStatus}
                      </Badge>
                    </div>
                    <CardTitle className="mt-2 text-base">{t.title}</CardTitle>
                    <CardDescription className="font-mono text-xs">
                      Suggested path: {t.suggestedTestPath}
                    </CardDescription>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {canGenerate ? (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            approvalMutation.mutate({ id: t.id, approvalStatus: 'APPROVED' })
                          }
                        >
                          <ThumbsUp className="h-3.5 w-3.5" aria-hidden="true" />
                          Approve
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            approvalMutation.mutate({ id: t.id, approvalStatus: 'REJECTED' })
                          }
                        >
                          <ThumbsDown className="h-3.5 w-3.5" aria-hidden="true" />
                          Reject
                        </Button>
                      </>
                    ) : null}
                    <Button
                      size="sm"
                      onClick={() => downloadTestFile(t.suggestedTestPath, t.testCode)}
                    >
                      <Download className="h-3.5 w-3.5" aria-hidden="true" />
                      Download
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="space-y-3">
                  {t.boundaryConditions.length > 0 ? (
                    <div className="rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 p-3 text-xs">
                      <p className="font-semibold">Covered Boundary Conditions:</p>
                      <ul className="mt-1 list-disc space-y-0.5 pl-4 text-[var(--muted-foreground)]">
                        {t.boundaryConditions.map((b, i) => (
                          <li key={i}>{b}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}

                  <MonacoCodeViewer value={t.testCode} language={t.language} height="280px" />

                  {t.validationResult ? (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {t.validationResult.summary}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
