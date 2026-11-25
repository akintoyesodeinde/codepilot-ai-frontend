import Link from 'next/link';
import {
  ArrowRight,
  Bot,
  Code2,
  FlaskConical,
  GitPullRequest,
  Lock,
  Network,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ThemeToggle } from '@/components/ThemeToggle';

const CAPABILITIES = [
  {
    icon: ShieldCheck,
    title: 'Multi-Tenant Security & RBAC',
    badge: 'Live — Phase 1',
    badgeVariant: 'success' as const,
    description:
      'Strict tenant isolation backed by composite MySQL keys, Argon2id sessions, refresh token rotation, CSRF protection, and four-role workspace RBAC.',
  },
  {
    icon: GitPullRequest,
    title: 'Automated PR Review Engine',
    badge: 'Live — Phase 2',
    badgeVariant: 'success' as const,
    description:
      'GitHub App webhook ingestion, SQS asynchronous workers, Tree-sitter indexing, provider-agnostic AI orchestration, and human-approved GitHub publishing.',
  },
  {
    icon: Lock,
    title: 'Deterministic Security Intelligence',
    badge: 'Phase 3',
    badgeVariant: 'secondary' as const,
    description:
      'Semgrep SAST, Gitleaks secret redaction, OSV-Scanner dependency auditing, ESLint, and Trivy scanning strictly separated from advisory AI insights.',
  },
  {
    icon: Network,
    title: 'Software Architecture Explorer',
    badge: 'Phase 3',
    badgeVariant: 'secondary' as const,
    description:
      'Deterministic dependency graph analysis detecting circular dependencies, architectural layer violations, and coupling hotspots in React Flow.',
  },
  {
    icon: Bot,
    title: 'Repository-Aware AI Assistant',
    badge: 'Phase 3',
    badgeVariant: 'secondary' as const,
    description:
      'Commit-scoped RAG with verified file and line citations, workspace spend limits, and strict prompt-injection isolation.',
  },
  {
    icon: FlaskConical,
    title: 'AI Test Studio',
    badge: 'Phase 3',
    badgeVariant: 'secondary' as const,
    description:
      'Syntax-validated unit, integration, and regression test suggestions with boundary condition checks and zero untrusted code execution on host.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-[var(--background)]">
      <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--card)]/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <Link href="/" className="flex items-center gap-2.5 font-bold tracking-tight">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--primary)] text-white">
              <Code2 className="h-4 w-4" aria-hidden="true" />
            </span>
            <span>CodePilot AI</span>
          </Link>

          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Button variant="ghost" asChild>
              <Link href="/login">Sign in</Link>
            </Button>
            <Button asChild>
              <Link href="/register">Get started</Link>
            </Button>
          </div>
        </div>
      </header>

      <main>
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-[var(--border)]">
          <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:py-28">
            <div className="max-w-3xl">
              <Badge variant="default" className="mb-4">
                Intelligent Code Review Platform
              </Badge>
              <h1 className="text-4xl font-bold tracking-tight sm:text-5xl lg:text-6xl">
                Production-grade AI code intelligence with{' '}
                <span className="text-[var(--primary)]">security-first isolation</span>.
              </h1>
              <p className="mt-6 text-lg leading-relaxed text-[var(--muted-foreground)]">
                CodePilot AI unifies GitHub repository management, automated pull request reviews,
                deterministic vulnerability scanning, architecture analysis, and AI-assisted testing
                inside a multi-tenant engineering workspace.
              </p>
              <div className="mt-8 flex flex-wrap items-center gap-3">
                <Button size="lg" asChild>
                  <Link href="/register">
                    Create engineering workspace
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link href="/login">Sign in to dashboard</Link>
                </Button>
              </div>
              <div className="mt-10 flex flex-wrap gap-6 text-sm text-[var(--muted-foreground)]">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-500" aria-hidden="true" />
                  Argon2id + HttpOnly Sessions
                </span>
                <span className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-[var(--primary)]" aria-hidden="true" />
                  4-Role Workspace RBAC
                </span>
                <span className="flex items-center gap-2">
                  <Lock className="h-4 w-4 text-amber-500" aria-hidden="true" />
                  Zero Cross-Tenant Leakage
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Capabilities */}
        <section className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:py-24">
          <div className="mb-10 max-w-2xl">
            <h2 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Engineered in four verifiable production phases
            </h2>
            <p className="mt-2 text-[var(--muted-foreground)]">
              Phases 1 and 2 deliver the multi-tenant REST API, MySQL 8.4 foundation, GitHub App
              integrations, asynchronous SQS workers, Tree-sitter indexing, and automated PR reviews
              with human-approved publishing. Upcoming Phase 3 modules are clearly labeled until
              their analyzers and evaluation suites pass CI.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {CAPABILITIES.map((cap) => {
              const Icon = cap.icon;
              return (
                <Card key={cap.title} className="flex flex-col justify-between">
                  <CardHeader>
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--accent)] text-[var(--accent-foreground)]">
                        <Icon className="h-5 w-5" aria-hidden="true" />
                      </span>
                      <Badge variant={cap.badgeVariant}>{cap.badge}</Badge>
                    </div>
                    <CardTitle>{cap.title}</CardTitle>
                    <CardDescription className="leading-relaxed">{cap.description}</CardDescription>
                  </CardHeader>
                  <CardContent />
                </Card>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="border-t border-[var(--border)] bg-[var(--card)] py-8">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 text-sm text-[var(--muted-foreground)] sm:flex-row sm:px-6">
          <p>CodePilot AI — Standalone Next.js Frontend &amp; Headless REST API</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-[var(--foreground)]">
              Sign in
            </Link>
            <Link href="/register" className="hover:text-[var(--foreground)]">
              Register
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
