import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';

export default function SecurityRoadmapPage() {
  return (
    <PlannedModuleCard
      title="Security Intelligence"
      phase={3}
      summary="Deterministic static application security testing, dependency vulnerability detection, secret redaction, and risk acceptance workflows."
      capabilities={[
        'Semgrep SAST, Gitleaks secret detection (redacted), OSV-Scanner, ESLint, and Trivy adapters',
        'Deterministic scanner findings clearly separated from unverified AI observations',
        'Finding fingerprints, deduplication, triage workflow, and expiring risk acceptances',
        'Restricted scanner execution with strict timeouts and zero host credential exposure',
      ]}
    />
  );
}
