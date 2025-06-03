import { PrismaClient } from '@prisma/client';
import { Tenant } from '@prisma/client';

const prisma = new PrismaClient();

interface WorkflowStats {
  totalWorkflows: number;
  activeWorkflows: number;
  totalExecutions: number;
  successfulExecutions: number;
  failedExecutions: number;
  averageExecutionTime: number;
}

interface TenantStats {
  workflows: WorkflowStats;
  users: {
    total: number;
    active: number;
    byRole: {
      ADMIN: number;
      USER: number;
    };
  };
  executions: {
    total: number;
    byStatus: {
      success: number;
      failure: number;
      pending: number;
    };
    byTimeRange: {
      today: number;
      thisWeek: number;
      thisMonth: number;
    };
  };
}

export async function getTenantStats(tenant: Tenant): Promise<TenantStats> {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  // Get workflow stats
  const workflows = await prisma.workflow.findMany({
    where: { tenantId: tenant.id },
    include: {
      executions: true,
    },
  });

  const workflowStats: WorkflowStats = {
    totalWorkflows: workflows.length,
    activeWorkflows: workflows.filter((w) => w.isActive).length,
    totalExecutions: workflows.reduce((sum, w) => sum + w.executions.length, 0),
    successfulExecutions: workflows.reduce(
      (sum, w) =>
        sum + w.executions.filter((e) => e.status === 'success').length,
      0
    ),
    failedExecutions: workflows.reduce(
      (sum, w) =>
        sum + w.executions.filter((e) => e.status === 'failure').length,
      0
    ),
    averageExecutionTime:
      workflows.reduce(
        (sum, w) =>
          sum +
          w.executions.reduce(
            (execSum, e) => execSum + (e.duration || 0),
            0
          ),
        0
      ) / workflows.reduce((sum, w) => sum + w.executions.length, 0) || 0,
  };

  // Get user stats
  const users = await prisma.user.findMany({
    where: { tenantId: tenant.id },
  });

  const userStats = {
    total: users.length,
    active: users.filter((u) => u.lastLoginAt).length,
    byRole: {
      ADMIN: users.filter((u) => u.role === 'ADMIN').length,
      USER: users.filter((u) => u.role === 'USER').length,
    },
  };

  // Get execution stats
  const executions = await prisma.execution.findMany({
    where: {
      workflow: {
        tenantId: tenant.id,
      },
    },
  });

  const executionStats = {
    total: executions.length,
    byStatus: {
      success: executions.filter((e) => e.status === 'success').length,
      failure: executions.filter((e) => e.status === 'failure').length,
      pending: executions.filter((e) => e.status === 'pending').length,
    },
    byTimeRange: {
      today: executions.filter((e) => e.createdAt >= startOfDay).length,
      thisWeek: executions.filter((e) => e.createdAt >= startOfWeek).length,
      thisMonth: executions.filter((e) => e.createdAt >= startOfMonth).length,
    },
  };

  return {
    workflows: workflowStats,
    users: userStats,
    executions: executionStats,
  };
}

export async function getTenantTrends(tenant: Tenant, days: number = 30) {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  const executions = await prisma.execution.findMany({
    where: {
      workflow: {
        tenantId: tenant.id,
      },
      createdAt: {
        gte: startDate,
      },
    },
    orderBy: {
      createdAt: 'asc',
    },
  });

  // Group executions by date
  const executionsByDate = executions.reduce((acc, execution) => {
    const date = execution.createdAt.toISOString().split('T')[0];
    if (!acc[date]) {
      acc[date] = {
        total: 0,
        success: 0,
        failure: 0,
        averageDuration: 0,
        durations: [],
      };
    }
    acc[date].total++;
    if (execution.status === 'success') acc[date].success++;
    if (execution.status === 'failure') acc[date].failure++;
    if (execution.duration) acc[date].durations.push(execution.duration);
    return acc;
  }, {} as Record<string, any>);

  // Calculate averages and format data
  return Object.entries(executionsByDate).map(([date, stats]) => ({
    date,
    total: stats.total,
    success: stats.success,
    failure: stats.failure,
    averageDuration:
      stats.durations.reduce((sum: number, duration: number) => sum + duration, 0) /
      stats.durations.length || 0,
  }));
} 