import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';

export default function PullRequestsRoadmapPage() {
  return (
    <PlannedModuleCard
      title="Automated Pull Request Reviews"
      phase={2}
      summary="GitHub App webhooks, asynchronous SQS analysis workers, Monaco diff viewer, and human-approved GitHub comment publication."
      capabilities={[
        'Least-privilege GitHub App installation and raw-body HMAC-SHA256 webhook ingestion',
        'Transactional outbox + Amazon SQS workers with dead-letter queues and idempotent job state',
        '12-state pull request review lifecycle with stale head-SHA verification',
        'Provider-agnostic AI orchestration (OpenAI, Anthropic, Bedrock, deterministic CI mock)',
      ]}
    />
  );
}
