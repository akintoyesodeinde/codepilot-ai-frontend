# CodePilot AI — Frontend Dashboard

Standalone React and Next.js App Router engineering intelligence dashboard for **CodePilot AI — Intelligent Code Review Platform**.

## Architecture Boundary

- Consumes the standalone backend REST API (`akintoyesodeinde/copilot-ai-backend`) over HTTP (`/api/v1/*`).
- Contains zero database credentials, zero GitHub App private keys, and zero AI provider credentials.
- Uses HttpOnly cookie sessions issued by the backend with automatic `X-CSRF-Token` header attachment and silent single-flight refresh rotation.

## Tech Stack

- React 19, Next.js 16 App Router (`output: 'standalone'`), strict TypeScript
- Tailwind CSS v4, Radix UI / shadcn-style accessible components, Lucide icons, `next-themes` (dark & light)
- TanStack Query, Zustand, React Hook Form, Zod, Recharts
- Vitest + Testing Library, Playwright E2E smoke suite, Multi-stage non-root Docker

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
