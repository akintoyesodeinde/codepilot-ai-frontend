'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Save, Shield } from 'lucide-react';
import { SESSION_QUERY_KEY, useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { WorkspaceDetail } from '@/lib/api-types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/feedback';
import { Input, Label } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';

function WorkspaceSettingsForm({
  workspace,
  canEdit,
}: {
  workspace: WorkspaceDetail;
  canEdit: boolean;
}) {
  const queryClient = useQueryClient();
  const [name, setName] = useState(workspace.name);
  const [description, setDescription] = useState(workspace.description ?? '');
  const [requireHumanApproval, setRequireHumanApproval] = useState(
    workspace.settings?.requireHumanApproval ?? true,
  );
  const [autoReviewEnabled, setAutoReviewEnabled] = useState(
    workspace.settings?.autoReviewEnabled ?? false,
  );
  const [dataRetentionDays, setDataRetentionDays] = useState(
    workspace.settings?.dataRetentionDays ?? 90,
  );
  const [monthlyAiBudgetUsd, setMonthlyAiBudgetUsd] = useState(
    workspace.usageLimits?.monthlyAiBudgetUsd ?? 25,
  );
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null,
  );

  const saveMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<WorkspaceDetail>(`/api/v1/workspaces/${workspace.id}`, {
        method: 'PATCH',
        body: {
          name,
          description: description.trim() || null,
          settings: {
            requireHumanApproval,
            autoReviewEnabled,
            dataRetentionDays,
          },
          usageLimits: {
            monthlyAiBudgetUsd,
          },
        },
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', text: 'Workspace settings saved successfully.' });
      void queryClient.invalidateQueries({ queryKey: ['workspace-detail', workspace.id] });
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      void queryClient.invalidateQueries({ queryKey: ['analytics', 'overview', workspace.id] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to save workspace settings.',
      });
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        setFeedback(null);
        saveMutation.mutate();
      }}
      className="space-y-6"
    >
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
            <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" aria-hidden="true" />
          )}
          <span>{feedback.text}</span>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>General Information</CardTitle>
          <CardDescription>Slug: {workspace.slug}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="ws-name">Workspace name</Label>
            <Input
              id="ws-name"
              value={name}
              disabled={!canEdit}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="ws-description">Description</Label>
            <Input
              id="ws-description"
              value={description}
              disabled={!canEdit}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>AI Review Governance &amp; Spending Guardrails</CardTitle>
          <CardDescription>
            Controls applied to Phase 2–3 automated reviews and AI assistant workflows.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="human-approval">
                Require human approval before GitHub publication
              </Label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Prevents AI review comments from posting directly to GitHub without engineer
                approval.
              </p>
            </div>
            <Switch
              id="human-approval"
              checked={requireHumanApproval}
              disabled={!canEdit}
              onCheckedChange={setRequireHumanApproval}
            />
          </div>

          <div className="flex items-center justify-between gap-4">
            <div>
              <Label htmlFor="auto-review">Auto-schedule PR reviews on webhook events</Label>
              <p className="text-xs text-[var(--muted-foreground)]">
                Automatically queue pull request analyses when GitHub webhooks arrive (Phase 2).
              </p>
            </div>
            <Switch
              id="auto-review"
              checked={autoReviewEnabled}
              disabled={!canEdit}
              onCheckedChange={setAutoReviewEnabled}
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label htmlFor="retention-days">Audit &amp; artifact retention (days)</Label>
              <Input
                id="retention-days"
                type="number"
                min={7}
                max={365}
                value={dataRetentionDays}
                disabled={!canEdit}
                onChange={(e) => setDataRetentionDays(Number(e.target.value))}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="ai-budget">Monthly AI spend limit (USD)</Label>
              <Input
                id="ai-budget"
                type="number"
                min={0}
                max={10000}
                step="1"
                value={monthlyAiBudgetUsd}
                disabled={!canEdit}
                onChange={(e) => setMonthlyAiBudgetUsd(Number(e.target.value))}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex justify-end">
          <Button type="submit" disabled={saveMutation.isPending}>
            <Save className="h-4 w-4" aria-hidden="true" />
            {saveMutation.isPending ? 'Saving...' : 'Save changes'}
          </Button>
        </div>
      ) : null}
    </form>
  );
}

export default function WorkspaceSettingsPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const canEdit = hasPermission('workspace:update');

  const detailQuery = useQuery({
    queryKey: ['workspace-detail', activeWorkspaceId],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const res = await apiRequest<WorkspaceDetail>(`/api/v1/workspaces/${activeWorkspaceId}`);
      return res.data;
    },
  });

  if (detailQuery.isLoading || !detailQuery.data) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Workspace Settings</h1>
        <p className="mt-1 text-sm text-[var(--muted-foreground)]">
          Configure tenant identity, human-in-the-loop review governance, retention, and AI budget
          caps.
        </p>
      </div>

      {!canEdit ? (
        <Card>
          <CardContent className="flex items-center gap-2.5 p-4 text-sm text-[var(--muted-foreground)]">
            <Shield className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
            Read-only mode. Workspace settings can only be modified by a Workspace Owner.
          </CardContent>
        </Card>
      ) : null}

      <WorkspaceSettingsForm
        key={`${detailQuery.data.id}-${detailQuery.data.updatedAt}`}
        workspace={detailQuery.data}
        canEdit={canEdit}
      />
    </div>
  );
}
