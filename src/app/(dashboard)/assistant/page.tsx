import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';

export default function AssistantRoadmapPage() {
  return (
    <PlannedModuleCard
      title="Repository-Aware AI Coding Assistant"
      phase={3}
      summary="Advisory-only coding assistant powered by commit-scoped retrieval-augmented generation and verified citations."
      capabilities={[
        'Tenant-scoped RAG retrieval anchored to indexed commit SHAs',
        'Streaming SSE responses with validated source file and line number citations',
        'Strict advisory mode with prompt-injection defenses and workspace budget enforcement',
        'Zero autonomous file edits, command execution, or pull request merging',
      ]}
    />
  );
}
