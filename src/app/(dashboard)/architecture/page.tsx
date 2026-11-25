'use client';

import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Background, Controls, MiniMap, ReactFlow, type Edge, type Node } from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { AlertCircle, AlertTriangle, CheckCircle2, Network, Play } from 'lucide-react';
import { useSession } from '@/hooks/useSession';
import { ApiProblemError, apiRequest } from '@/lib/api-client';
import type {
  ArchitectureGraphNode,
  ArchitectureGraphResponse,
  ArchitectureViolationItem,
  RepositoryItem,
} from '@/lib/api-types';
import { shortSha } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { EmptyState, Skeleton } from '@/components/ui/feedback';

const LAYER_ORDER = ['presentation', 'application', 'domain', 'infrastructure', 'shared', 'tests'];
const LAYER_COLORS: Record<string, string> = {
  presentation: '#3b82f6',
  application: '#8b5cf6',
  domain: '#10b981',
  infrastructure: '#f59e0b',
  shared: '#64748b',
  tests: '#ec4899',
};

export default function ArchitectureExplorerPage() {
  const { activeWorkspaceId, hasPermission } = useSession();
  const queryClient = useQueryClient();
  const canScan = hasPermission('repository:write');

  const [selectedRepoId, setSelectedRepoId] = useState<string>('');
  const [selectedNode, setSelectedNode] = useState<ArchitectureGraphNode | null>(null);
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

  const graphQuery = useQuery({
    queryKey: ['architecture-graph', activeWorkspaceId, activeRepoId],
    enabled: Boolean(activeWorkspaceId && activeRepoId),
    queryFn: async () => {
      const res = await apiRequest<ArchitectureGraphResponse>(
        `/api/v1/repositories/${activeRepoId}/architecture/graph`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data;
    },
  });

  const violationsQuery = useQuery({
    queryKey: ['architecture-violations', activeWorkspaceId, activeRepoId],
    enabled: Boolean(activeWorkspaceId && activeRepoId),
    queryFn: async () => {
      const res = await apiRequest<{ items: ArchitectureViolationItem[] }>(
        `/api/v1/repositories/${activeRepoId}/architecture/violations`,
        { workspaceId: activeWorkspaceId },
      );
      return res.data.items;
    },
  });

  const scanMutation = useMutation({
    mutationFn: async () => {
      return apiRequest<{ scanId: string; jobId: string }>(
        `/api/v1/repositories/${activeRepoId}/architecture-scans`,
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
        text: `Architecture graph scan queued (Job ${res.data.jobId.slice(0, 8)}).`,
      });
      void queryClient.invalidateQueries({ queryKey: ['architecture-graph'] });
      void queryClient.invalidateQueries({ queryKey: ['architecture-violations'] });
    },
    onError: (err) => {
      setFeedback({
        type: 'error',
        text: err instanceof ApiProblemError ? err.message : 'Unable to start architecture scan.',
      });
    },
  });

  const { flowNodes, flowEdges } = useMemo(() => {
    const rawNodes = graphQuery.data?.nodes ?? [];
    const rawEdges = graphQuery.data?.edges ?? [];
    const perLayerCounter = new Map<string, number>();

    const nodes: Node[] = rawNodes.map((n) => {
      const layerIdx = Math.max(0, LAYER_ORDER.indexOf(n.layer));
      const rowIdx = perLayerCounter.get(n.layer) ?? 0;
      perLayerCounter.set(n.layer, rowIdx + 1);
      const borderColor = n.isHotspot ? '#ef4444' : (LAYER_COLORS[n.layer] ?? '#6366f1');

      return {
        id: n.id,
        position: { x: layerIdx * 240, y: rowIdx * 105 },
        data: { label: `${n.label}\n[${n.layer}]` },
        style: {
          border: `2px solid ${borderColor}`,
          borderRadius: 10,
          padding: 10,
          fontSize: 12,
          fontWeight: 600,
          background: 'var(--card)',
          color: 'var(--foreground)',
          width: 200,
          whiteSpace: 'pre-line',
        },
      };
    });

    const edges: Edge[] = rawEdges.map((e) => ({
      id: e.id,
      source: e.source,
      target: e.target,
      animated: e.isCircular || e.isViolation,
      label: e.isCircular ? 'cycle' : e.isViolation ? 'boundary' : undefined,
      style: {
        stroke: e.isCircular ? '#ef4444' : e.isViolation ? '#f59e0b' : '#64748b',
        strokeWidth: e.isCircular || e.isViolation ? 2.5 : 1.5,
      },
    }));

    return { flowNodes: nodes, flowEdges: edges };
  }, [graphQuery.data]);

  const scan = graphQuery.data?.scan;
  const violations = violationsQuery.data ?? [];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Software Architecture Explorer</h1>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">
            Interactive dependency graph detecting circular imports (Tarjan SCC), layer boundary
            violations, coupling hotspots, and orphan modules.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            aria-label="Repository for architecture explorer"
            value={activeRepoId}
            onChange={(e) => {
              setSelectedRepoId(e.target.value);
              setSelectedNode(null);
            }}
            className="h-9 rounded-md border border-[var(--border)] bg-[var(--card)] px-3 text-sm"
          >
            {(reposQuery.data ?? []).map((r) => (
              <option key={r.id} value={r.id}>
                {r.fullName}
              </option>
            ))}
          </select>
          {canScan && activeRepoId ? (
            <Button onClick={() => scanMutation.mutate()} disabled={scanMutation.isPending}>
              <Play className="h-4 w-4" aria-hidden="true" />
              {scanMutation.isPending ? 'Queueing...' : 'Run Architecture Scan'}
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

      {scan ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Modules</p>
              <p className="mt-1 text-2xl font-bold">{scan.nodesCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Dependencies</p>
              <p className="mt-1 text-2xl font-bold">{scan.edgesCount}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Circular Cycles</p>
              <p className="mt-1 text-2xl font-bold text-red-600 dark:text-red-400">
                {scan.circularDepsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Total Violations</p>
              <p className="mt-1 text-2xl font-bold text-amber-600 dark:text-amber-400">
                {scan.violationsCount}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-[var(--muted-foreground)]">Commit SHA</p>
              <p className="mt-1 font-mono text-lg font-semibold">{shortSha(scan.commitSha)}</p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {graphQuery.isLoading ? (
        <Skeleton className="h-[460px] w-full" />
      ) : flowNodes.length === 0 ? (
        <EmptyState
          icon={<Network className="h-6 w-6" />}
          title="No architecture dependency graph computed yet"
          description="Trigger an Architecture Scan to build an interactive module dependency graph and evaluate layer boundary rules."
        />
      ) : (
        <div className="grid gap-6 lg:grid-cols-4">
          <Card className="overflow-hidden lg:col-span-3">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">Interactive Dependency Graph</CardTitle>
              <CardDescription>
                Red animated edges mark circular dependencies; amber edges mark layer boundary
                violations. Click a node to inspect coupling metrics.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <div className="h-[440px] w-full border-t border-[var(--border)]">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  fitView
                  onNodeClick={(_, node) => {
                    const found = graphQuery.data?.nodes.find((n) => n.id === node.id) ?? null;
                    setSelectedNode(found);
                  }}
                >
                  <Background />
                  <Controls />
                  <MiniMap />
                </ReactFlow>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Module Inspector</CardTitle>
              <CardDescription>Coupling &amp; instability telemetry</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-xs">
              {selectedNode ? (
                <>
                  <p className="break-all font-mono font-semibold">{selectedNode.filePath}</p>
                  <div className="flex flex-wrap gap-1.5">
                    <Badge variant="default">{selectedNode.layer}</Badge>
                    <Badge variant="secondary">{selectedNode.language}</Badge>
                    {selectedNode.isHotspot ? <Badge variant="destructive">Hotspot</Badge> : null}
                    {selectedNode.isOrphan ? <Badge variant="warning">Orphan</Badge> : null}
                  </div>
                  <dl className="space-y-2 pt-2">
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted-foreground)]">Fan-In (Afferent)</dt>
                      <dd className="font-mono font-semibold">{selectedNode.fanIn}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted-foreground)]">Fan-Out (Efferent)</dt>
                      <dd className="font-mono font-semibold">{selectedNode.fanOut}</dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted-foreground)]">Martin Instability (I)</dt>
                      <dd className="font-mono font-semibold">
                        {selectedNode.instability.toFixed(2)}
                      </dd>
                    </div>
                    <div className="flex justify-between">
                      <dt className="text-[var(--muted-foreground)]">Lines of Code</dt>
                      <dd className="font-mono font-semibold">{selectedNode.linesOfCode}</dd>
                    </div>
                  </dl>
                </>
              ) : (
                <p className="text-[var(--muted-foreground)]">
                  Select any module node in the graph to inspect its fan-in, fan-out, instability
                  score, and layer classification.
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

      {/* Violations list */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <AlertTriangle className="h-4 w-4 text-amber-500" aria-hidden="true" />
            Detected Architectural Violations ({violations.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {violations.length === 0 ? (
            <p className="text-sm text-[var(--muted-foreground)]">
              No architecture violations detected in the latest completed scan.
            </p>
          ) : (
            <ul className="divide-y divide-[var(--border)]">
              {violations.map((v) => (
                <li key={v.id} className="space-y-1 py-3 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={
                        v.severity === 'CRITICAL' || v.severity === 'HIGH'
                          ? 'destructive'
                          : 'warning'
                      }
                    >
                      {v.severity}
                    </Badge>
                    <Badge variant="secondary">{v.violationType}</Badge>
                    <code className="font-mono text-xs">{v.ruleName}</code>
                  </div>
                  <p className="text-sm">{v.message}</p>
                  <p className="font-mono text-xs text-[var(--muted-foreground)]">
                    {v.sourcePath}
                    {v.targetPath ? ` -> ${v.targetPath}` : ''}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
