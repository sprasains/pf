import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

type User = Awaited<ReturnType<typeof prisma.user.findUnique>>;
type Organization = Awaited<ReturnType<typeof prisma.organization.findUnique>>;
type Tenant = Awaited<ReturnType<typeof prisma.tenant.findUnique>>;
type Subscription = Awaited<ReturnType<typeof prisma.subscription.findUnique>>;

declare global {
  namespace Express {
    interface Request {
      user?: User;
      org?: Organization;
      tenant?: Tenant;
      subscription?: Subscription & {
        plan: {
          executionLimit: number;
        };
      };
    }
  }
} 