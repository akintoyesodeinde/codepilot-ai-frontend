'use client';

import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle2,
  Code2,
  Database,
  FileCode2,
  GitBranch,
  GitCommit,
  Lock,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { CodeSymbolItem, IndexedFileItem, RepositoryDetail } from '@/lib/api-types';
import { formatDateTime, shortSha } from '@/lib/utils';
import { MonacoCodeViewer } from '@/components/code/MonacoCodeViewer';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

export default function RepositoryDetailPage() {
  const params = useParams<{ id: string }>();
  const { activeWorkspaceId, hasPermission } = useSession();
  const canWrite = hasPermission('repository:write');
  const [activeTab, setActiveTab] = useState<'files' | 'symbols' | 'history'>('files');
  const [selectedFileId, setSelectedFileId] = useState<string | null>(null);
  const [selectedBranch, setSelectedBranch] = useState<string>('');
  const [jobFeedback, setJobFeedback] = useState<{
    type: 'success' | 'error';
    text: string;
  } | null>(null);

  const repoQuery = useQuery({
    queryKey: ['repository', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<RepositoryDetail>(`/api/v1/repositories/${params.id}`, {
        workspaceId: activeWorkspaceId,
      });
      return res.data;
    },
  });

  const filesQuery = useQuery({
    queryKey: ['repository-files', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<{ commitSha: string | null; items: IndexedFileItem[] }>(
        `/api/v1/repositories/${params.id}/files`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const symbolsQuery = useQuery({
    queryKey: ['repository-symbols', activeWorkspaceId, params.id],
    enabled: Boolean(activeWorkspaceId && params.id),
    queryFn: async () => {
      const res = await apiRequest<{ commitSha: string | null; items: CodeSymbolItem[] }>(
        `/api/v1/repositories/${params.id}/symbols`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const syncMutation = useMutation({
    mutationFn: async () =>
      apiRequest<{ jobId: string; status: string }>(`/api/v1/repositories/${params.id}/sync`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
      }),
    onSuccess: (res) => {
      setJobFeedback({
        type: 'success',
        text: `Repository sync job queued (Job ID: ${res.data.jobId.slice(0, 8)}). Track progress on the Background Jobs page.`,
      });
    },
    onError: (err) => {
      setJobFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to schedule repository sync.',
      });
    },
  });

  const indexMutation = useMutation({
    mutationFn: async () =>
      apiRequest<{ jobId: string; commitSha: string }>(`/api/v1/repositories/${params.id}/index`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: {},
      }),
    onSuccess: (res) => {
      setJobFeedback({
        type: 'success',
        text: `Tree-sitter AST indexing scheduled for commit ${shortSha(res.data.commitSha)} (Job ID: ${res.data.jobId.slice(0, 8)}).`,
      });
    },
    onError: (err) => {
      setJobFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to schedule indexing job.',
      });
    },
  });

  if (repoQuery.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-80" />
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  if (repoQuery.isError || !repoQuery.data) {
    return (
      <Card>
        <CardContent className="flex items-center justify-between gap-3 p-6 text-sm text-red-600 dark:text-red-400">
          <span className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5" aria-hidden="true" />
            Repository not found or inaccessible in the current workspace.
          </span>
          <Button variant="outline" asChild>
            <Link href="/repositories">Back to repositories</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  const repo = repoQuery.data;
  const indexedFiles = filesQuery.data?.items ?? [];
  const activeFile = indexedFiles.find((f) => f.id === selectedFileId) ?? indexedFiles[0] ?? null;
  const activeBranchName = selectedBranch || repo.defaultBranch;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Button variant="ghost" size="sm" asChild className="-ml-2 mb-2">
            <Link href="/repositories">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              All repositories
            </Link>
          </Button>
          <div className="flex flex-wrap items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{repo.fullName}</h1>
            <Badge variant="secondary">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {repo.visibility}
            </Badge>
            {repo.primaryLanguage ? <Badge variant="default">{repo.primaryLanguage}</Badge> : null}
          </div>
          <p className="mt-1.5 text-sm text-[var(--muted-foreground)]">
            {repo.description || 'No description configured.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Select branch"
            value={activeBranchName}
            onChange={(e) => setSelectedBranch(e.target.value)}
            className="h-9 rounded-lg border border-[var(--border)] bg-[var(--card)] px-3 font-mono text-xs"
          >
            {repo.branches.length > 0 ? (
              repo.branches.map((b) => (
                <option key={b.id} value={b.name}>
                  {b.name} ({shortSha(b.headSha)})
                </option>
              ))
            ) : (
              <option value={repo.defaultBranch}>{repo.defaultBranch}</option>
            )}
          </select>

          {canWrite ? (
            <>
              <Button
                variant="outline"
                size="sm"
                disabled={syncMutation.isPending}
                onClick={() => syncMutation.mutate()}
              >
                <RefreshCw className="h-3.5 w-3.5" aria-hidden="true" />
                {syncMutation.isPending ? 'Scheduling...' : 'Sync GitHub'}
              </Button>
              <Button
                size="sm"
                disabled={indexMutation.isPending}
                onClick={() => indexMutation.mutate()}
              >
                <Database className="h-3.5 w-3.5" aria-hidden="true" />
                {indexMutation.isPending ? 'Scheduling...' : 'Index AST'}
              </Button>
            </>
          ) : null}
        </div>
      </div>

      {jobFeedback ? (
        <div
          role={jobFeedback.type === 'error' ? 'alert' : 'status'}
          className={
            jobFeedback.type === 'success'
              ? 'flex items-center justify-between gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 text-sm text-emerald-700 dark:text-emerald-300'
              : 'flex items-center gap-2 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300'
          }
        >
          <span className="flex items-center gap-2">
            {jobFeedback.type === 'success' ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
            )}
            {jobFeedback.text}
          </span>
          {jobFeedback.type === 'success' ? (
            <Button variant="ghost" size="sm" asChild>
              <Link href="/jobs">View jobs</Link>
            </Button>
          ) : null}
        </div>
      ) : null}

      {/* Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-[var(--border)] pb-3">
        <Button
          variant={activeTab === 'files' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('files')}
        >
          <FileCode2 className="h-4 w-4" aria-hidden="true" />
          File Explorer ({indexedFiles.length})
        </Button>
        <Button
          variant={activeTab === 'symbols' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('symbols')}
        >
          <Code2 className="h-4 w-4" aria-hidden="true" />
          AST Symbols ({symbolsQuery.data?.items.length ?? 0})
        </Button>
        <Button
          variant={activeTab === 'history' ? 'default' : 'ghost'}
          size="sm"
          onClick={() => setActiveTab('history')}
        >
          <GitCommit className="h-4 w-4" aria-hidden="true" />
          Branches &amp; Commits ({repo.recentCommits.length})
        </Button>
      </div>

      {activeTab === 'files' ? (
        indexedFiles.length === 0 ? (
          <EmptyState
            icon={<FileCode2 className="h-6 w-6" />}
            title="Repository not yet indexed"
            description="Trigger an AST indexing job to parse source files with Tree-sitter, extract symbols, and inspect code inside Monaco Editor."
            action={
              canWrite ? (
                <Button onClick={() => indexMutation.mutate()} disabled={indexMutation.isPending}>
                  Index repository commit
                </Button>
              ) : undefined
            }
          />
        ) : (
          <div className="grid gap-4 lg:grid-cols-12">
            <Card className="lg:col-span-4">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm">Indexed Files</CardTitle>
                <CardDescription>
                  Commit{' '}
                  <code className="font-mono">
                    {filesQuery.data?.commitSha ? shortSha(filesQuery.data.commitSha) : 'N/A'}
                  </code>
                </CardDescription>
              </CardHeader>
              <CardContent className="max-h-[460px] overflow-y-auto">
                <ul className="space-y-1">
                  {indexedFiles.map((file) => {
                    const selected = activeFile?.id === file.id;
                    return (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => setSelectedFileId(file.id)}
                          className={`flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left font-mono text-xs transition-colors ${
                            selected
                              ? 'bg-[var(--accent)] font-semibold text-[var(--accent-foreground)]'
                              : 'hover:bg-[var(--muted)]'
                          }`}
                        >
                          <span className="truncate">{file.filePath}</span>
                          <span className="ml-2 shrink-0 text-[10px] opacity-70">
                            {file.lineCount}L
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </CardContent>
            </Card>

            <div className="lg:col-span-8">
              {activeFile ? (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[var(--muted-foreground)]">
                    <span className="font-mono font-semibold text-[var(--foreground)]">
                      {activeFile.filePath}
                    </span>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{activeFile.language}</Badge>
                      <span>{activeFile.lineCount} lines</span>
                      <span>{activeFile.sizeBytes} bytes</span>
                    </div>
                  </div>
                  <MonacoCodeViewer
                    value={activeFile.contentPreview ?? '// File preview unavailable'}
                    language={activeFile.language}
                  />
                </div>
              ) : null}
            </div>
          </div>
        )
      ) : null}

      {activeTab === 'symbols' ? (
        !symbolsQuery.data?.items.length ? (
          <EmptyState
            icon={<Code2 className="h-6 w-6" />}
            title="No AST symbols extracted yet"
            description="Run an AST index job to populate functions, classes, methods, and interfaces parsed via Tree-sitter."
          />
        ) : (
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-[var(--border)] text-xs uppercase text-[var(--muted-foreground)]">
                      <th className="px-4 py-3 font-medium">Symbol</th>
                      <th className="px-4 py-3 font-medium">Kind</th>
                      <th className="px-4 py-3 font-medium">File &amp; Lines</th>
                      <th className="px-4 py-3 font-medium">Visibility</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border)]">
                    {symbolsQuery.data.items.map((sym) => (
                      <tr key={sym.id}>
                        <td className="px-4 py-2.5 font-mono text-xs font-semibold">{sym.name}</td>
                        <td className="px-4 py-2.5">
                          <Badge variant="secondary">{sym.kind}</Badge>
                        </td>
                        <td className="px-4 py-2.5 font-mono text-xs text-[var(--muted-foreground)]">
                          {sym.filePath}:{sym.startLine}-{sym.endLine}
                        </td>
                        <td className="px-4 py-2.5">
                          <Badge variant={sym.exported ? 'success' : 'outline'}>
                            {sym.exported ? 'Exported' : 'Internal'}
                          </Badge>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )
      ) : null}

      {activeTab === 'history' ? (
        <div className="grid gap-6 lg:grid-cols-3">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitBranch className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                Tracked Branches ({repo.branches.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2.5">
                {repo.branches.map((branch) => (
                  <li
                    key={branch.id}
                    className="flex items-center justify-between rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-mono font-medium">{branch.name}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">
                        {shortSha(branch.headSha)}
                      </p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      {branch.isDefault ? <Badge variant="default">Default</Badge> : null}
                      {branch.isProtected ? (
                        <Badge variant="success">
                          <ShieldCheck className="h-3 w-3" aria-hidden="true" />
                          Protected
                        </Badge>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GitCommit className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                Recent Commits ({repo.recentCommits.length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-[var(--border)]">
                {repo.recentCommits.map((commit) => (
                  <li
                    key={commit.id}
                    className="flex items-start justify-between gap-3 py-3 first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <p className="text-sm font-medium">{commit.messageHeadline}</p>
                      <p className="mt-0.5 text-xs text-[var(--muted-foreground)]">
                        {commit.authorName} &middot; {formatDateTime(commit.committedAt)}
                      </p>
                    </div>
                    <code className="shrink-0 rounded bg-[var(--muted)] px-2 py-0.5 font-mono text-xs">
                      {shortSha(commit.sha)}
                    </code>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>
      ) : null}
    </div>
  );
}
