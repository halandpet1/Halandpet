# HaLand PetCare

HaLand PetCare is a veterinary ERP platform built with Next.js, Prisma, PostgreSQL, and TypeScript. The repository already contains the core enterprise modules for authentication, clinical workflows, inventory, hotel, POS, reporting, and customer/enterprise operations.

## Production readiness status

The repository is currently verified locally with:

- npm run lint
- npm run typecheck
- npm run test
- npm run test:coverage
- npm run test:e2e
- npm run build
- npx prisma generate
- npx prisma validate

These checks were run successfully in the current workspace.

## Architecture summary

- App Router frontend and API routes in src/app
- Server actions for domain workflows in src/actions
- Shared runtime, auth, session, and logging helpers in src/lib
- Prisma schema and migrations in prisma/
- Container and deployment assets at the repository root and in kubernetes/

## Getting started

1. Copy [.env.example](.env.example) to .env.local and fill in the required values.
2. Start PostgreSQL and run Prisma migrations.
3. Install dependencies with npm ci.
4. Run the development server with npm run dev.

```bash
cp .env.example .env.local
npm ci
npx prisma migrate dev
npm run dev
```

## Container and orchestration

- Build the image with docker build -t halandpet .
- Run the stack locally with docker compose up --build
- Apply Kubernetes manifests from kubernetes/deployment.yaml

## Quality gates

The CI workflow in [.github/workflows/ci.yml](.github/workflows/ci.yml) runs linting, unit tests, Playwright smoke tests, type-checking, and a production build.
