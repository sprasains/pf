# PumpFlix

PumpFlix is a workflow automation platform that uses a monorepo structure. The frontend is a Next.js application and the backend is an Express API powered by Prisma and PostgreSQL. Redis and BullMQ provide caching and background job processing.

## Prerequisites

- Node.js >= 20
- pnpm >= 8
- PostgreSQL >= 14
- Redis >= 6
- Docker (optional for local services)

## Repository Layout

```
pumpflix/
├── apps/
│   ├── api/   # Express + Prisma API
│   └── web/   # Next.js frontend
├── packages/
│   └── shared/  # Shared utilities
├── docs/        # Additional documentation
├── docker-compose.yml
└── ...
```

## Getting Started

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd pumpflix
   ```
2. **Install dependencies**
   ```bash
   pnpm install
   ```
3. **Configure environment variables**
   Copy `apps/api/.env.local` to `.env` and adjust values as needed. The file contains settings for PostgreSQL, Redis, OAuth credentials, JWT secrets and feature flags.
4. **Start required services**
   ```bash
   docker-compose up -d
   ```
5. **Run database migrations**
   ```bash
   pnpm prisma migrate dev
   ```
6. **Seed the database (optional)**
   ```bash
   pnpm db:seed
   ```

## Running the Applications

To start both frontend and backend together:
```bash
pnpm dev:all
```
- Frontend: <http://localhost:3000>
- API: <http://localhost:3001>

Run them individually:
```bash
pnpm --filter @pumpflix/web dev   # Frontend
pnpm --filter @pumpflix/api dev   # Backend
```

## Available Scripts

- `pnpm dev:all` - start frontend and backend in development
- `pnpm build` - build all packages and apps
- `pnpm start` - run apps in production mode
- `pnpm lint` - lint all packages
- `pnpm test` - run unit tests
- `pnpm db:generate` - generate Prisma client
- `pnpm db:seed` - seed the database

- `pnpm dev:all` - Run both frontend and backend in development mode
- `pnpm build` - Build all packages and applications
- `pnpm start` - Start all applications in production mode
- `pnpm lint` - Run linting for all packages
- `pnpm test` - Run tests for all packages
- `pnpm db:generate` - Generate Prisma client
- `pnpm db:push` - Push database schema changes
- `pnpm db:seed` - Seed the database with initial data

## Project Structure

```
workflow/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express backend application
├── packages/
│   └── shared/       # Shared utilities and types
├── prisma/           # Database schema and migrations
└── docs/            # Documentation


## Development

### Frontend (Next.js)
- Located in `apps/web`
- Built with Next.js 13
- Uses Material-UI for UI components
- Features:
  - Modern dashboard
  - Workflow builder
  - Real-time updates
  - Responsive design

### Backend (Express)
- Located in `apps/api`
- Built with Express.js
- Features:
  - RESTful API
  - WebSocket support
  - Authentication
  - Background job processing

### Database
- PostgreSQL with Prisma ORM
- Schema defined in `prisma/schema.prisma`
- Migrations in `prisma/migrations`


## Troubleshooting

- Ensure PostgreSQL and Redis are running and the connection strings are correct.
- If ports are already in use, update them in `.env`.
- Reinstall dependencies with `pnpm install` if builds fail.

## Contributing

1. Create a feature branch.
2. Make your changes.
3. Submit a pull request.

## License



The project is a monorepo managed with PNPM workspaces. It hosts two main applications under apps/ and a shared package under packages/. The root README describes how to run the apps, the available scripts, and the general structure:

workflow/
├── apps/
│   ├── web/          # Next.js frontend application
│   └── api/          # Express backend application
├── packages/
│   └── shared/       # Shared utilities and types
├── prisma/           # Database schema and migrations
└── docs/            # Documentation

The repository provides scripts to run both parts of the system in development or separately. For example:

pnpm --filter @pumpflix/web dev   # start frontend only
pnpm --filter @pumpflix/api dev   # start backend only

Core Components
Frontend (apps/web)

Next.js 13 application with Material‑UI and Ant Design components.

Uses React Query, contexts, and custom hooks (e.g., useApi, useAuth).

Code is organized in src/ with pages like Dashboard.tsx and hooks such as useApi.ts that wraps API calls with logging.

TypeScript configuration lives in tsconfig.json, and Vite is used for development.

Backend (apps/api)

Express server configured in src/index.ts with middleware for security (helmet, cors), sessions, Passport authentication, and rate limiting.

Extensive route set under src/routes/ (auth, workflow, billing, metrics, etc.).

Services under src/services/ implement business logic, for example WorkflowService handles stored procedure calls to create or execute workflows:

export class WorkflowService {
  static async createWorkflow(orgId: string, userId: string, input: WorkflowInput) {
    await prisma.$executeRaw`
      CALL create_workflow(${orgId}::uuid, ${userId}::uuid,
        ${input.name}::text, ${input.description || ''}::text,
        ${input.jsonSchema}::jsonb, NULL::uuid);
    `;
    ...
  }
}

Background jobs handled via BullMQ queues defined in src/jobs/queue.ts.

Shared Package (packages/shared)

Provides Zod schemas and TypeScript types shared across web and API:

export const organizationSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).regex(/^[a-z0-9-]+$/),
});

Documentation
The docs/ directory contains detailed guides:

ARCHITECTURE.md – describes the overall system, listing core components (Next.js frontend, Express API, PostgreSQL/Redis, n8n workflow engine) and includes a diagram of how they interact.

DATABASE.md – explains the PostgreSQL schema. Tables for organizations, users, workflows, credentials, etc., are defined in SQL blocks.

QUICKSTART.md, DEPLOYMENT.md, MONITORING.md, SECURITY.md, PERFORMANCE.md, and TECHNICAL_IMPLEMENTATION.md offer step-by-step instructions for setup, deployment, monitoring, and security best practices.

Project Highlights
Authentication & Authorization

Implemented with Passport strategies (local, Google, Facebook). JWT tokens are used for sessions.

Middleware in apps/api/src/middleware/auth.ts performs token verification and role/permission checks.

Workflow Operations

Prisma stored procedures handle workflow creation, execution, cloning, and template generation.

Execution and credential usage are logged for auditing.

Caching & Metrics

Redis is used for caching templates and rate limiting.

Custom Prometheus metrics and Grafana dashboards are configured (see docs/MONITORING.md).

Background Jobs

BullMQ queues manage tasks such as exports or workflow execution. Queue configuration is shared across services.

Next Steps for a New Contributor
Set Up Environment

Follow the quick start instructions in docs/QUICKSTART.md to install dependencies, configure environment variables, and run docker-compose up -d and pnpm dev:all.

Understand the API

Review docs/API.md for available endpoints and apps/api/src/routes to see how each route is implemented.

Explore WorkflowService and related services to learn how stored procedures are called via Prisma.

Explore the Database Schema

Examine apps/api/prisma/schema.prisma for model definitions and docs/DATABASE.md for SQL references.

Run Prisma migrations and seed data using pnpm db:generate and pnpm db:seed.

Run and Modify the Frontend

Start the frontend with pnpm --filter @pumpflix/web dev.

Check pages under apps/web/src/pages to understand the UI flow. Hooks like useAuth.ts show how authentication state is handled.

Learn the Workflow Engine

The architecture docs discuss how the system integrates with the n8n engine. Investigate apps/api/src/utils/n8n.ts for API interactions.

Study Security and Monitoring

The security guide (docs/SECURITY.md) covers JWT authentication, role-based access control, CORS configuration, and more.

docs/MONITORING.md explains how Prometheus and Grafana are set up for metrics and alerts.

By reading through the documentation and exploring the code structure above, a newcomer can gain a comprehensive understanding of how the PumpFlix platform is organized and how to contribute effectively.

