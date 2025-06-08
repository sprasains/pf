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

## Troubleshooting

- Ensure PostgreSQL and Redis are running and the connection strings are correct.
- If ports are already in use, update them in `.env`.
- Reinstall dependencies with `pnpm install` if builds fail.

## Contributing

1. Create a feature branch.
2. Make your changes.
3. Submit a pull request.

## License

[Your License Here]
