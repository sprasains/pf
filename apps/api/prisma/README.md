# PumpFlix Prisma Database Documentation

This folder stores the Prisma schema, migrations and seed data used by the API.

## Schema Overview

The `schema.prisma` file defines all database models such as users, organizations, workflows and audit logs. It also contains enums for execution status, subscription status and other common values.

## Applying Migrations

Generate and apply migrations with:
```bash
pnpm prisma migrate dev
```
The command uses the configuration from the `.env` file at the project root.

## Seed Data

The `seed.ts` script creates basic records for local development. Run it from the project root:
```bash
pnpm db:seed
```
The script is idempotent and can be executed multiple times.

Extend the seed file with additional sample data as needed for testing.
