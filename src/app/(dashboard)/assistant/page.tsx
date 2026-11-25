'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Bot, FileCode2, Plus, Send, ShieldCheck, Sparkles, Wrench } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type {
  AiConversationDetail,
  AiConversationSummary,
  RepositoryItem,
  VerifiedCodeCitation,
} from '@/lib/api-types';
import { formatRelativeTime } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';

export default function AiAssistantPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canWrite = hasPermission('repository:write');

  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [activeConversationId, setActiveConversationId] = useState<string>('');
  const [promptInput, setPromptInput] = useState('');
  const [streamPreview, setStreamPreview] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'chat' | 'explain' | 'refactor'>('chat');
  const [targetFilePath, setTargetFilePath] = useState('src/infrastructure/sql-ledger-repo.ts');
  const [analysisOutput, setAnalysisOutput] = useState<{
    title: string;
    body: string;
    citations: VerifiedCodeCitation[];
  } | null>(null);
  const [errorText, setErrorText] = useState<string | null>(null);

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

  const conversationsQuery = useQuery({
    queryKey: ['ai-conversations', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<{ items: AiConversationSummary[] }>('/api/v1/ai/conversations', {
        workspaceId: activeWorkspaceId,
      });
      return res.data.items;
    },
  });

  const selectedConvId = activeConversationId || conversationsQuery.data?.[0]?.id || '';

  const detailQuery = useQuery({
    queryKey: ['ai-conversation-detail', activeWorkspaceId, selectedConvId],
    enabled: Boolean(activeWorkspaceId && selectedConvId),
    queryFn: async () => {
      const res = await apiRequest<AiConversationDetail>(
        `/api/v1/ai/conversations/${selectedConvId}`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const createConvMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<AiConversationSummary>('/api/v1/ai/conversations', {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: {
          repositoryId: activeRepoId || null,
          title: 'Repository Advisory Session',
        },
      });
    },
    onSuccess: (res) => {
      setActiveConversationId(res.data.id);
      setErrorText(null);
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
    },
    onError: (err) => {
      setErrorText(err instanceof ApiProblemError ? err.message : 'Unable to start conversation.');
    },
  });

  const sendMessageMutation = useMutation({
    mutationFn: async () => {
      let convId = selectedConvId;
      if (!convId) {
        const created = await apiRequest<AiConversationSummary>('/api/v1/ai/conversations', {
          method: 'POST',
          workspaceId: activeWorkspaceId,
          body: { repositoryId: activeRepoId || null, title: promptInput.slice(0, 80) },
        });
        convId = created.data.id;
        setActiveConversationId(convId);
      }
      const res = await apiRequest<{
        assistantMessage: { content: string; citations: VerifiedCodeCitation[] };
      }>(`/api/v1/ai/conversations/${convId}/messages`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: { content: promptInput },
      });
      return { convId, data: res.data };
    },
    onSuccess: async ({ convId }) => {
      setPromptInput('');
      setErrorText(null);
      setStreamPreview('');
      // Stream verified tokens over SSE endpoint
      try {
        const res = await fetch(
          `/api/v1/ai/conversations/${convId}/events?workspaceId=${encodeURIComponent(activeWorkspaceId ?? '')}`,
          { credentials: 'include' },
        );
        if (res.ok && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let acc = '';
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            const text = decoder.decode(value, { stream: true });
            for (const line of text.split('\n')) {
              if (line.startsWith('data: ')) {
                try {
                  const parsed = JSON.parse(line.slice(6)) as { delta?: string };
                  if (parsed.delta) {
                    acc += parsed.delta;
                    setStreamPreview(acc);
                  }
                } catch {
                  // Ignore partial frame
                }
              }
            }
          }
        }
      } catch {
        // Fallback to persisted message refresh
      }
      void queryClient.invalidateQueries({ queryKey: ['ai-conversation-detail'] });
      void queryClient.invalidateQueries({ queryKey: ['ai-conversations'] });
      setStreamPreview('');
    },
    onError: (err) => {
      setErrorText(err instanceof ApiProblemError ? err.message : 'Unable to send prompt.');
    },
  });

  const explainMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{
        explanationMarkdown: string;
        citations: VerifiedCodeCitation[];
      }>('/api/v1/ai/explain-code', {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: {
          repositoryId: activeRepoId,
          filePath: targetFilePath,
        },
      });
    },
    onSuccess: (res) => {
      setErrorText(null);
      setAnalysisOutput({
        title: `Code Explanation — ${targetFilePath}`,
        body: res.data.explanationMarkdown,
        citations: res.data.citations,
      });
    },
    onError: (err) => {
      setErrorText(err instanceof ApiProblemError ? err.message : 'Unable to explain file.');
    },
  });

  const refactorMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{
        suggestions: Array<{ title: string; category: string; rationale: string }>;
        citations: VerifiedCodeCitation[];
      }>('/api/v1/ai/suggest-refactoring', {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: {
          repositoryId: activeRepoId,
          filePath: targetFilePath,
        },
      });
    },
    onSuccess: (res) => {
      setErrorText(null);
      setAnalysisOutput({
        title: `Refactoring Recommendations — ${targetFilePath}`,
        body: res.data.suggestions
          .map((s, idx) => `${idx + 1}. [${s.category}] ${s.title}\n   ${s.rationale}`)
          .join('\n\n'),
        citations: res.data.citations,
      });
    },
    onError: (err) => {
      setErrorText(
        err instanceof ApiProblemError ? err.message : 'Unable to suggest refactorings.',
      );
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Repository-Aware AI Assistant</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Commit-scoped RAG with verified file and line citations, workspace spend controls, and
            prompt-injection boundaries.
          </p>
        </div>

        <Badge variant="success">
          <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
          Advisory Read-Only Mode (Zero Autonomous Writes)
        </Badge>
      </div>

      {errorText ? (
        <div
          role="alert"
          className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-700 dark:text-red-300"
        >
          {errorText}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={activeTab === 'chat' ? 'default' : 'outline'}
          onClick={() => setActiveTab('chat')}
        >
          <Bot className="h-4 w-4" aria-hidden="true" />
          Repository Chat (SSE)
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'explain' ? 'default' : 'outline'}
          onClick={() => setActiveTab('explain')}
        >
          <Sparkles className="h-4 w-4" aria-hidden="true" />
          Explain Code
        </Button>
        <Button
          size="sm"
          variant={activeTab === 'refactor' ? 'default' : 'outline'}
          onClick={() => setActiveTab('refactor')}
        >
          <Wrench className="h-4 w-4" aria-hidden="true" />
          Suggest Refactoring
        </Button>
        <select
          aria-label="Target repository"
          value={activeRepoId}
          onChange={(e) => setSelectedRepoId(e.target.value)}
          className="ml-auto h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-xs"
        >
          {(reposQuery.data ?? []).map((r) => (
            <option key={r.id} value={r.id}>
              {r.fullName}
            </option>
          ))}
        </select>
      </div>

      {activeTab === 'chat' ? (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="lg:col-span-1">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm">Sessions</CardTitle>
              {canWrite ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => createConvMutation.mutate()}
                  disabled={createConvMutation.isPending}
                >
                  <Plus className="h-3.5 w-3.5" />
                  New
                </Button>
              ) : null}
            </CardHeader>
            <CardContent className="space-y-1.5">
              {(conversationsQuery.data ?? []).length === 0 ? (
                <p className="text-xs text-[var(--muted-foreground)]">
                  Start a conversation to query indexed code with verified citations.
                </p>
              ) : (
                (conversationsQuery.data ?? []).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setActiveConversationId(c.id)}
                    className={`w-full rounded-lg border p-2.5 text-left text-xs transition-colors ${
                      c.id === selectedConvId
                        ? 'border-[var(--primary)] bg-[var(--primary)]/10'
                        : 'border-[var(--border)] hover:bg-[var(--muted)]/50'
                    }`}
                  >
                    <p className="truncate font-medium">{c.title}</p>
                    <p className="mt-0.5 text-[11px] text-[var(--muted-foreground)]">
                      {c.messageCount} messages &middot; {formatRelativeTime(c.updatedAt)}
                    </p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="flex flex-col lg:col-span-3">
            <CardHeader className="border-b border-[var(--border)] pb-3">
              <CardTitle className="text-base">
                {detailQuery.data?.title ?? 'CodePilot AI Advisory Console'}
              </CardTitle>
              <CardDescription className="text-xs">
                Responses are strictly read-only and cite only files verified inside your active
                workspace index.
              </CardDescription>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4 p-5">
              <div className="max-h-[420px] space-y-4 overflow-y-auto pr-1">
                {(detailQuery.data?.messages ?? []).map((m) => (
                  <div
                    key={m.id}
                    className={`rounded-xl border p-4 text-sm ${
                      m.role === 'USER'
                        ? 'ml-8 border-[var(--primary)]/30 bg-[var(--primary)]/10'
                        : 'mr-8 border-[var(--border)] bg-[var(--muted)]/40'
                    }`}
                  >
                    <div className="mb-1.5 flex items-center justify-between text-xs text-[var(--muted-foreground)]">
                      <span className="font-semibold">
                        {m.role === 'USER' ? 'You' : 'CodePilot AI (Advisory)'}
                      </span>
                      <span>{m.tokensUsed} tokens</span>
                    </div>
                    <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                      {m.content}
                    </pre>
                    {m.citations.length > 0 ? (
                      <div className="mt-3 flex flex-wrap gap-1.5 border-t border-[var(--border)] pt-2">
                        {m.citations.map((cit, i) => (
                          <span
                            key={`${cit.filePath}-${i}`}
                            className="inline-flex items-center gap-1 rounded bg-[var(--card)] px-2 py-0.5 font-mono text-[11px] text-[var(--primary)]"
                          >
                            <FileCode2 className="h-3 w-3" />
                            {cit.filePath}:{cit.startLine}-{cit.endLine}
                          </span>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ))}

                {streamPreview ? (
                  <div className="mr-8 rounded-xl border border-indigo-500/30 bg-indigo-500/5 p-4 text-sm">
                    <p className="mb-1 text-xs font-semibold text-indigo-600 dark:text-indigo-300">
                      Streaming verified SSE tokens...
                    </p>
                    <pre className="whitespace-pre-wrap font-sans text-sm">{streamPreview}</pre>
                  </div>
                ) : null}
              </div>

              {canWrite ? (
                <form
                  className="flex gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (promptInput.trim().length >= 2) {
                      sendMessageMutation.mutate();
                    }
                  }}
                >
                  <Input
                    value={promptInput}
                    onChange={(e) => setPromptInput(e.target.value)}
                    placeholder="Ask about repository architecture, SQL queries, or security risks..."
                  />
                  <Button
                    type="submit"
                    disabled={sendMessageMutation.isPending || promptInput.trim().length < 2}
                  >
                    <Send className="h-4 w-4" aria-hidden="true" />
                    Send
                  </Button>
                </form>
              ) : null}
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {activeTab === 'explain'
                ? 'Explain Indexed Source File'
                : 'Generate Advisory Refactoring Plan'}
            </CardTitle>
            <CardDescription>
              Provide an indexed repository file path to inspect AST symbols and receive verified
              advisory guidance.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              <Input
                value={targetFilePath}
                onChange={(e) => setTargetFilePath(e.target.value)}
                placeholder="src/ledger/transfer-service.ts"
                className="max-w-lg font-mono text-xs"
              />
              {activeTab === 'explain' ? (
                <Button
                  onClick={() => explainMutation.mutate()}
                  disabled={explainMutation.isPending || !activeRepoId}
                >
                  Explain File
                </Button>
              ) : (
                <Button
                  onClick={() => refactorMutation.mutate()}
                  disabled={refactorMutation.isPending || !activeRepoId}
                >
                  Suggest Refactorings
                </Button>
              )}
            </div>

            {analysisOutput ? (
              <div className="space-y-3 rounded-xl border border-[var(--border)] bg-[var(--muted)]/40 p-4">
                <h2 className="font-semibold">{analysisOutput.title}</h2>
                <pre className="whitespace-pre-wrap font-sans text-sm leading-relaxed">
                  {analysisOutput.body}
                </pre>
                <div className="flex flex-wrap gap-1.5">
                  {analysisOutput.citations.map((c, i) => (
                    <Badge key={i} variant="secondary" className="font-mono text-[11px]">
                      {c.filePath}:{c.startLine}-{c.endLine} (verified)
                    </Badge>
                  ))}
                </div>
              </div>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
