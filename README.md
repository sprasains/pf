# PumpFlix

A modern workflow automation platform built with Next.js, Express, and Prisma.

## Prerequisites

- Node.js >= 20.0.0
- PNPM >= 8.0.0
- PostgreSQL >= 14.0
- Redis (for background jobs and caching)

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

3. **Set up environment variables**
   Create a `.env` file in the root directory with the following variables:
   ```env
   # Database
   DATABASE_URL="postgresql://postgres:postgres@localhost:5432/pumpflix?schema=public"

   # Redis
   REDIS_URL="redis://localhost:6379"

   # JWT
   JWT_SECRET="your-jwt-secret"

   # API
   PORT=3001
   NODE_ENV=development

   # Frontend
   NEXT_PUBLIC_API_URL="http://localhost:3001"
   ```

4. **Start the database**
   ```bash
   # Using Docker
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

## Running the Application

### Development Mode

To run both frontend and backend concurrently:
```bash
pnpm dev:all
```

This will start:
- Frontend: http://localhost:3000
- Backend API: http://localhost:3001

### Running Separately

To run frontend only:
```bash
pnpm --filter @pumpflix/web dev
```

To run backend only:
```bash
pnpm --filter @pumpflix/api dev
```

## Available Scripts

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
```

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

1. **Database Connection Issues**
   - Ensure PostgreSQL is running
   - Check DATABASE_URL in .env
   - Run `pnpm prisma generate` to update Prisma client

2. **Port Conflicts**
   - Frontend runs on port 3000
   - Backend runs on port 3001
   - Ensure these ports are available

3. **Dependencies Issues**
   - Run `pnpm install` to reinstall dependencies
   - Clear node_modules: `rm -rf node_modules && pnpm install`

## Contributing

1. Create a new branch
2. Make your changes
3. Submit a pull request

## License

[Your License Here] 