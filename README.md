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
- TanStack Query, Zustand, React Hook Form, Zod, Recharts
- Vitest + Testing Library, Playwright E2E smoke suite, Multi-stage non-root Docker

## Implemented Workflows (Phases 1 & 2)

- **Authentication & Multi-Tenancy:** Register, login, HttpOnly cookie sessions, CSRF protection, workspace switching, RBAC team management, notifications, audit logs, workspace AI budget & retention settings.
- **GitHub Integrations (`/integrations`):** Connect GitHub App installations, manage installation status, and inspect webhook configuration.
- **Repository Code & Symbol Explorer (`/repositories/[id]`):** Sync repositories, trigger Tree-sitter indexing jobs, inspect branches/commits, browse indexed source files in Monaco Editor, and search extracted AST symbols.
- **Automated Pull Request Reviews (`/pull-requests`, `/pull-requests/[id]`):** Filter PRs, inspect unified code diffs, trigger asynchronous AI reviews, inspect verified findings by severity/category, submit helpful/false-positive feedback, approve or reject reviews, and publish human-approved reviews to GitHub.
- **AI Spend & Background Jobs (`/ai-usage`, `/jobs`):** Track workspace token consumption and USD spend against monthly budgets, and inspect/cancel asynchronous SQS analysis jobs.

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
