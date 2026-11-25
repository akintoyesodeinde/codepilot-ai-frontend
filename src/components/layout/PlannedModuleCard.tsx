import Link from 'next/link';
import { ArrowLeft, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

export function PlannedModuleCard({
  title,
  phase,
  summary,
  capabilities,
}: {
  title: string;
  phase: number;
  summary: string;
  capabilities: string[];
}) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
            <Badge variant="warning">
              <Clock className="h-3 w-3" aria-hidden="true" />
              Scheduled for Phase {phase}
            </Badge>
          </div>
          <p className="mt-1 text-sm text-[var(--muted-foreground)]">{summary}</p>
        </div>
        <Button variant="outline" asChild>
          <Link href="/dashboard">
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back to Overview
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Module Status: Unavailable in Phase 1</CardTitle>
          <CardDescription>
            CodePilot AI is being delivered across four gated engineering phases. This capability is
            intentionally disabled until its backend workers, migrations, and security tests are
            verified in Phase {phase}.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="grid gap-2.5 sm:grid-cols-2">
            {capabilities.map((cap) => (
              <li
                key={cap}
                className="flex items-start gap-2 rounded-lg border border-[var(--border)] bg-[var(--muted)]/40 px-3.5 py-2.5 text-sm"
              >
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[var(--primary)]" />
                <span>{cap}</span>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
