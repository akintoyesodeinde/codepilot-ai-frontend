# CodePilot AI — Frontend Dashboard

Standalone React and Next.js App Router engineering intelligence dashboard for **CodePilot AI — Intelligent Code Review Platform**.

## Architecture Boundary

- Consumes the standalone backend REST API (`akintoyesodeinde/copilot-ai-backend`) over HTTP (`/api/v1/*`).
- Contains zero database credentials, zero GitHub App private keys, and zero AI provider credentials.
- Uses HttpOnly cookie sessions issued by the backend with automatic `X-CSRF-Token` header attachment and silent single-flight refresh rotation.

## Tech Stack

- React 19, Next.js 16 App Router (`output: 'standalone'`), strict TypeScript
- Tailwind CSS v4, Radix UI / shadcn-style accessible components, Lucide icons, `next-themes` (dark & light)
- Monaco Editor (`@monaco-editor/react`) read-only source explorer and unified PR diff viewer
- React Flow (`@xyflow/react`) interactive dependency graph explorer
- TanStack Query, Zustand, React Hook Form, Zod, Recharts
- Vitest + Testing Library, Playwright E2E smoke suite, Multi-stage non-root Docker

## Implemented Workflows (Phases 1–3 Complete)

- **Authentication & Multi-Tenancy:** Register, login, HttpOnly cookie sessions, CSRF protection, CSP/HSTS security headers, workspace switching, RBAC team management, notifications, audit logs, workspace AI budget & retention settings.
- **GitHub Integrations (`/integrations`):** Connect GitHub App installations, manage installation status, and inspect least-privilege scopes.
- **Repository Code & Symbol Explorer (`/repositories/[id]`):** Sync repositories, trigger Tree-sitter indexing jobs, inspect branches/commits, browse indexed source files in Monaco Editor, and search extracted AST symbols.
- **Automated Pull Request Reviews (`/pull-requests`, `/pull-requests/[id]`):** Filter PRs, inspect unified code diffs, trigger asynchronous AI reviews, inspect verified findings by severity/category, submit helpful/false-positive feedback, approve or reject reviews, and publish human-approved reviews to GitHub.
- **Security Intelligence (`/security`):** Trigger deterministic security scans (Semgrep, Gitleaks secret redaction, OSV-Scanner dependency CVEs, ESLint security rules, Trivy), triage findings, and record Workspace Owner time-bound risk acceptances.
- **Software Architecture Explorer (`/architecture`):** Interactive React Flow dependency graph with layer coloring, Tarjan SCC circular dependency highlighting, coupling/instability node inspector, and architectural violation reports.
- **Repository-Aware Advisory AI Assistant (`/assistant`):** Commit-scoped RAG chat with SSE streaming, verified file/line citations, code explanation, and refactoring recommendations in strict read-only advisory mode.
- **AI Test Studio (`/test-studio`):** Multi-language unit/security/regression test generation (TypeScript/JavaScript primary + Python, Java, C#, Go), Tree-sitter WASM syntax diagnostics (zero host execution), approval workflow, and downloadable test files.
- **Engineering Analytics & Platform Admin (`/analytics`, `/ai-usage`, `/jobs`, `/admin`):** Real MySQL-backed Code Quality, Security Posture, Review Performance, AI Spend, background job status, and anonymized Platform Admin operational metrics.

## Local Development Startup

```bash
# 1. Copy environment template
cp .env.example .env.local

# 2. Ensure backend API is running on http://localhost:4000
# 3. Install dependencies and start frontend on http://localhost:3000
npm ci
npm run dev
```

## Verification Commands

```bash
npm run format:check
npm run lint
npm run typecheck
npm run test:unit
npm run test:components
npm run build
npm run test:e2e
```
