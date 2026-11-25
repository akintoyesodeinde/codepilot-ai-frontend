import { PlannedModuleCard } from '@/components/layout/PlannedModuleCard';

export default function TestStudioRoadmapPage() {
  return (
    <PlannedModuleCard
      title="AI Test Studio"
      phase={3}
      summary="Syntax-validated automated test generation for TypeScript/JavaScript with extensible Python, Java, C#, and Go adapters."
      capabilities={[
        'Unit, integration, boundary-condition, and regression test suggestions',
        'Clear distinction between generated, syntax-validated, and sandbox-executed tests',
        'Test preview, engineer approval, and download workflows',
        'Zero execution of untrusted repository code on the API host',
      ]}
    />
  );
}
