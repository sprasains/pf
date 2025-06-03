import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/error';

const prisma = new PrismaClient();

export async function setUserPreference(userId: string, orgId: string, preferences: any) {
  try {
    const result = await prisma.$queryRaw`
      SELECT set_user_preference(
        ${userId}::uuid,
        ${orgId}::uuid,
        ${JSON.stringify(preferences)}::jsonb
      ) as preference_id;
    `;
    
    return (result as any)[0].preference_id;
  } catch (error) {
    throw new AppError('Failed to set user preferences', 500, error);
  }
}

export async function getUserPreferences(userId: string, orgId: string) {
  try {
    const preferences = await prisma.userPreference.findUnique({
      where: {
        userId_orgId: {
          userId,
          orgId
        }
      }
    });

    if (!preferences) {
      throw new AppError('User preferences not found', 404);
    }

    return preferences;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get user preferences', 500, error);
  }
}

export async function logUserAction(userId: string, orgId: string, action: string, context: any) {
  try {
    const result = await prisma.$queryRaw`
      SELECT log_user_action(
        ${userId}::uuid,
        ${orgId}::uuid,
        ${action}::text,
        ${JSON.stringify(context)}::jsonb
      ) as log_id;
    `;
    
    return (result as any)[0].log_id;
  } catch (error) {
    throw new AppError('Failed to log user action', 500, error);
  }
}

export async function getUserUIConfig(userId: string, orgId: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM get_user_ui_config(
        ${userId}::uuid,
        ${orgId}::uuid
      );
    `;
    
    if (!(result as any[]).length) {
      throw new AppError('User UI configuration not found', 404);
    }

    return (result as any)[0];
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get user UI configuration', 500, error);
  }
}

export async function getRecentActivity(userId: string, orgId: string, limit: number = 10) {
  try {
    const activities = await prisma.userActivityLog.findMany({
      where: {
        userId,
        orgId
      },
      orderBy: {
        timestamp: 'desc'
      },
      take: limit
    });

    return activities;
  } catch (error) {
    throw new AppError('Failed to get recent activity', 500, error);
  }
} 