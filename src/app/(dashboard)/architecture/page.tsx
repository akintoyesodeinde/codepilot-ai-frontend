import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';

export default function ArchitectureRoadmapPage() {
  return (
    <PlannedModuleCard
      title="Software Architecture Explorer"
      phase={3}
      summary="Deterministic module dependency analysis and interactive React Flow visualization."
      capabilities={[
        'Dependency Cruiser and deterministic graph algorithms for circular dependency detection',
        'Configurable architectural layer boundary rules and coupling hotspot analysis',
        'Interactive React Flow graph with zooming, node filtering, and violation highlighting',
        'AI-assisted architecture remediation recommendations backed by file-level evidence',
      ]}
    />
  );
}
