import { User as PrismaUser, Organization, Tenant } from '@prisma/client';

declare global {
  namespace Express {
    interface Request {
      user: PrismaUser;
      org: Organization;
      tenant: Tenant;
    }
  }
} 