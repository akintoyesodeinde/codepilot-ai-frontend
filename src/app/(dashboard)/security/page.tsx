'use client';

import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertCircle, CheckCircle2, Play, ShieldAlert, ShieldCheck, ShieldOff } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type { RepositoryItem, SecurityScanItem, VulnerabilityItem } from '@/lib/api-types';
import { formatRelativeTime, shortSha } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';
import { Input } from '@/components/ui/input';

function severityVariant(sev: string): 'destructive' | 'warning' | 'secondary' | 'default' {
  if (sev === 'CRITICAL' || sev === 'HIGH') return 'destructive';
  if (sev === 'MEDIUM') return 'warning';
  return 'secondary';
}

export default function SecurityIntelligencePage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canScan = hasPermission('repository:write');
  const canAcceptRisk = hasPermission('workspace:update');

  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [severityFilter, setSeverityFilter] = useState<string>('');
  const [scannerFilter, setScannerFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [riskModalVulnId, setRiskModalVulnId] = useState<string | null>(null);
  const [riskReason, setRiskReason] = useState('');
  const [riskControls, setRiskControls] = useState('');
  const [riskDays, setRiskDays] = useState('30');
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

  const scansQuery = useQuery({
    queryKey: ['security-scans', activeWorkspaceId, activeRepoId],
    enabled: Boolean(activeWorkspaceId && activeRepoId),
    queryFn: async () => {
      const res = await apiRequest<{ items: SecurityScanItem[] }>(
        `/api/v1/repositories/${activeRepoId}/security-scans`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const vulnsQuery = useQuery({
    queryKey: [
      'vulnerabilities',
      activeWorkspaceId,
      selectedRepoId,
      severityFilter,
      scannerFilter,
      statusFilter,
    ],
    enabled: Boolean(activeWorkspaceId),
    queryFn: async () => {
      const qs = new URLSearchParams();
      if (selectedRepoId) qs.set('repositoryId', selectedRepoId);
      if (severityFilter) qs.set('severity', severityFilter);
      if (scannerFilter) qs.set('scanner', scannerFilter);
      if (statusFilter) qs.set('status', statusFilter);
      const res = await apiRequest<{ items: VulnerabilityItem[] }>(
        `/api/v1/security/vulnerabilities${qs.toString() ? `?${qs.toString()}` : ''}`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const triggerScanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ scanId: string; jobId: string }>(
        `/api/v1/repositories/${activeRepoId}/security-scans`,
        {
          method: 'POST',
          workspaceId: activeWorkspaceId,
          body: {},
        },
      );
    },
    onSuccess: (res) => {
      setFeedback({
        type: 'success',
        text: `Deterministic security scan queued (Job ${res.data.jobId.slice(0, 8)}). Semgrep, Gitleaks, OSV-Scanner, ESLint, and Trivy will run asynchronously.`,
      });
      void queryClient.invalidateQueries({ queryKey: ['security-scans'] });
      void queryClient.invalidateQueries({ queryKey: ['jobs'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to queue security scan.',
      });
    },
  });

  const triageMutation = useMutation({
    mutationFn: async (input: {
      id: string;
      status: 'OPEN' | 'TRIAGED' | 'FALSE_POSITIVE' | 'FIXED';
    }) => {
      return apiRequest(`/api/v1/security/vulnerabilities/${input.id}`, {
        method: 'PATCH',
        workspaceId: activeWorkspaceId,
        body: { status: input.status },
      });
    },
    onSuccess: () => {
      setFeedback({ type: 'success', text: 'Vulnerability triage status updated and audited.' });
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Failed to triage vulnerability.',
      });
    },
  });

  const riskAcceptMutation = useMutation({
    mutationFn: async () => {
      if (!riskModalVulnId) return;
      const days = Math.max(1, Math.min(365, Number.parseInt(riskDays, 10) || 30));
      const expiresAt = new Date(Date.now() + days * 86400_000).toISOString();
      return apiRequest(`/api/v1/security/vulnerabilities/${riskModalVulnId}/risk-acceptance`, {
        method: 'POST',
        workspaceId: activeWorkspaceId,
        body: {
          reason: riskReason,
          mitigatingControls: riskControls || undefined,
          expiresAt,
        },
      });
    },
    onSuccess: () => {
      setRiskModalVulnId(null);
      setRiskReason('');
      setRiskControls('');
      setFeedback({
        type: 'success',
        text: 'Time-bound risk acceptance recorded and written to immutable workspace audit logs.',
      });
      void queryClient.invalidateQueries({ queryKey: ['vulnerabilities'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text:
          err instanceof ApiProblemError
            ? err.message
            : 'Risk acceptance failed (requires Workspace Owner).',
      });
    },
  });

  const vulns = vulnsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Security Intelligence</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Deterministic SAST (Semgrep), secret redaction (Gitleaks), dependency CVEs (OSV), ESLint
            security rules, and Trivy checks strictly separated from advisory AI.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Repository for security scan"
            value={activeRepoId}
            onChange={(e) => setSelectedRepoId(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
          >
            {(reposQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
          {canScan && activeRepoId ? (
            <Button
              onClick={() => triggerScanMutation.mutate()}
              disabled={triggerScanMutation.isPending}
            >
              <Play className="h-4 w-4" aria-hidden="true" />
              {triggerScanMutation.isPending ? 'Queueing...' : 'Run Security Scan'}
            </Button>
          ) : null}
        </div>
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

      {/* Recent scans summary */}
      {scansQuery.data && scansQuery.data.length > 0 ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {scansQuery.data.slice(0, 4).map((scan) => (
            <Card key={scan.id}>
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between gap-2">
                  <Badge
                    variant={
                      scan.status === 'COMPLETED'
                        ? 'success'
                        : scan.status === 'FAILED'
                          ? 'destructive'
                          : 'warning'
                    }
                  >
                    {scan.status}
                  </Badge>
                  <code className="font-mono text-xs text-[var(--muted-foreground)]">
                    {shortSha(scan.commitSha)}
                  </code>
                </div>
                <CardTitle className="mt-2 text-lg">{scan.findingsCount} findings</CardTitle>
                <CardDescription className="text-xs">
                  {scan.criticalCount} critical · {scan.highCount} high · {scan.dependenciesCount}{' '}
                  deps audited
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-0 text-[11px] text-[var(--muted-foreground)]">
                {formatRelativeTime(scan.createdAt)}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Filters */}
      <Card>
        <CardContent className="flex flex-wrap items-center gap-3 p-4">
          <select
            aria-label="Filter by severity"
            value={severityFilter}
            onChange={(e) => setSeverityFilter(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs"
          >
            <option value="">All severities</option>
            <option value="CRITICAL">CRITICAL</option>
            <option value="HIGH">HIGH</option>
            <option value="MEDIUM">MEDIUM</option>
            <option value="LOW">LOW</option>
          </select>
          <select
            aria-label="Filter by scanner"
            value={scannerFilter}
            onChange={(e) => setScannerFilter(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs"
          >
            <option value="">All scanners</option>
            <option value="SEMGREP">Semgrep SAST</option>
            <option value="GITLEAKS">Gitleaks Secrets</option>
            <option value="OSV_SCANNER">OSV Dependencies</option>
            <option value="ESLINT">ESLint Security</option>
            <option value="TRIVY">Trivy Container/IaC</option>
          </select>
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--background)] px-3 text-xs"
          >
            <option value="">All statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="TRIAGED">TRIAGED</option>
            <option value="RISK_ACCEPTED">RISK_ACCEPTED</option>
            <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
            <option value="FIXED">FIXED</option>
          </select>
        </CardContent>
      </Card>

      {/* Risk Acceptance inline panel */}
      {riskModalVulnId ? (
        <Card className="border-amber-500/40 bg-amber-500/5">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ShieldOff className="h-4 w-4 text-amber-600" />
              Record Time-Bound Risk Acceptance (Workspace Owner)
            </CardTitle>
            <CardDescription>
              Accepted risks automatically expire and are logged immutably in workspace audit logs.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <label className="text-xs font-medium">Justification (min 10 characters)</label>
              <Input
                value={riskReason}
                onChange={(e) => setRiskReason(e.target.value)}
                placeholder="Explain compensating controls and remediation timeline..."
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="text-xs font-medium">Mitigating Controls (optional)</label>
                <Input
                  value={riskControls}
                  onChange={(e) => setRiskControls(e.target.value)}
                  placeholder="Private VPC subnet, WAF rule, isolated credentials..."
                />
              </div>
              <div>
                <label className="text-xs font-medium">Expiration (days from today)</label>
                <Input
                  type="number"
                  min={1}
                  max={365}
                  value={riskDays}
                  onChange={(e) => setRiskDays(e.target.value)}
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={() => riskAcceptMutation.mutate()}
                disabled={riskAcceptMutation.isPending || riskReason.trim().length < 10}
              >
                Confirm Risk Acceptance
              </Button>
              <Button size="sm" variant="outline" onClick={() => setRiskModalVulnId(null)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Vulnerability findings list */}
      {vulnsQuery.isLoading ? (
        <Skeleton className="h-56 w-full" />
      ) : vulns.length === 0 ? (
        <EmptyState
          icon={<ShieldCheck className="h-6 w-6 text-emerald-500" />}
          title="No vulnerabilities matching current filters"
          description="Run a deterministic Security Scan on a repository to inspect SAST, secret redaction, dependency CVE, and Dockerfile findings."
        />
      ) : (
        <div className="space-y-3">
          {vulns.map((v) => (
            <Card key={v.id}>
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge variant={severityVariant(v.severity)}>{v.severity}</Badge>
                      <Badge variant="default">{v.scanner}</Badge>
                      <Badge variant="secondary">{v.source}</Badge>
                      <Badge variant={v.status === 'OPEN' ? 'warning' : 'success'}>
                        {v.status}
                      </Badge>
                      {v.cweId ? <Badge variant="secondary">{v.cweId}</Badge> : null}
                      {v.cveId ? <Badge variant="destructive">{v.cveId}</Badge> : null}
                    </div>
                    <h2 className="text-base font-semibold">{v.title}</h2>
                    <p className="font-mono text-xs text-[var(--muted-foreground)]">
                      {v.repository.fullName} &middot; {v.filePath}:{v.startLine}
                    </p>
                  </div>

                  {canScan ? (
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        aria-label={`Triage status for ${v.title}`}
                        value={v.status === 'RISK_ACCEPTED' ? 'TRIAGED' : v.status}
                        onChange={(e) =>
                          triageMutation.mutate({
                            id: v.id,
                            status: e.target.value as
                              'OPEN' | 'TRIAGED' | 'FALSE_POSITIVE' | 'FIXED',
                          })
                        }
                        className="h-8 rounded-md border border-[var(--border)] bg-[var(--background)] px-2 text-xs"
                      >
                        <option value="OPEN">OPEN</option>
                        <option value="TRIAGED">TRIAGED</option>
                        <option value="FALSE_POSITIVE">FALSE_POSITIVE</option>
                        <option value="FIXED">FIXED</option>
                      </select>
                      {canAcceptRisk ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRiskModalVulnId(v.id)}
                        >
                          <ShieldAlert className="h-3.5 w-3.5" aria-hidden="true" />
                          Accept Risk
                        </Button>
                      ) : null}
                    </div>
                  ) : null}
                </div>

                <p className="text-sm text-[var(--muted-foreground)]">{v.description}</p>

                {v.redactedSnippet ? (
                  <pre className="overflow-x-auto rounded-lg border border-[var(--border)] bg-[var(--muted)]/50 p-3 font-mono text-xs">
                    {v.redactedSnippet}
                  </pre>
                ) : null}

                {v.remediation ? (
                  <p className="text-xs text-emerald-700 dark:text-emerald-300">
                    <strong>Remediation:</strong> {v.remediation}
                  </p>
                ) : null}

                {v.activeRiskAcceptance ? (
                  <p className="rounded-md bg-amber-500/10 p-2 text-xs text-amber-800 dark:text-amber-200">
                    <strong>
                      Risk Accepted until {v.activeRiskAcceptance.expiresAt.slice(0, 10)}:
                    </strong>{' '}
                    {v.activeRiskAcceptance.reason}
                  </p>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
