import { PrismaClient } from '@prisma/client';
import { AppError } from '../utils/error';

const prisma = new PrismaClient();

export async function startExecution(workflowId: string, userId: string, orgId: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT log_execution_start(
        ${workflowId}::uuid,
        ${userId}::uuid,
        ${orgId}::uuid
      ) as execution_id;
    `;
    
    return (result as any)[0].execution_id;
  } catch (error) {
    throw new AppError('Failed to start execution', 500, error);
  }
}

export async function completeExecution(executionId: string, status: 'SUCCESS' | 'ERROR', error?: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT log_execution_end(
        ${executionId}::uuid,
        ${status}::text,
        ${error}::text
      ) as success;
    `;
    
    if (!(result as any)[0].success) {
      throw new AppError('Execution not found', 404);
    }
    
    return true;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to complete execution', 500, error);
  }
}

export async function recordStateTransition(executionId: string, toStateId: string, metadata?: any) {
  try {
    const result = await prisma.$queryRaw`
      SELECT record_transition(
        ${executionId}::uuid,
        ${toStateId}::uuid,
        ${metadata ? JSON.stringify(metadata) : null}::jsonb
      ) as transition_id;
    `;
    
    return (result as any)[0].transition_id;
  } catch (error) {
    if (error instanceof Error && error.message === 'Invalid state transition') {
      throw new AppError('Invalid state transition', 400);
    }
    throw new AppError('Failed to record state transition', 500, error);
  }
}

export async function getExecutionStates(executionId: string) {
  try {
    const states = await prisma.workflowExecutionState.findMany({
      where: { executionId },
      include: {
        state: true
      },
      orderBy: { timestamp: 'asc' }
    });

    if (!states.length) {
      throw new AppError('Execution not found', 404);
    }

    return states;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get execution states', 500, error);
  }
}

export async function getAllowedTransitions(workflowId: string, stateId: string) {
  try {
    const result = await prisma.$queryRaw`
      SELECT * FROM get_allowed_transitions(
        ${workflowId}::uuid,
        ${stateId}::uuid
      );
    `;
    
    return result;
  } catch (error) {
    throw new AppError('Failed to get allowed transitions', 500, error);
  }
}

export async function getExecutionById(id: string) {
  try {
    const execution = await prisma.workflowExecution.findUnique({
      where: { id },
      include: {
        workflow: true,
        states: {
          include: {
            state: true
          },
          orderBy: { timestamp: 'asc' }
        }
      }
    });

    if (!execution) {
      throw new AppError('Execution not found', 404);
    }

    return execution;
  } catch (error) {
    if (error instanceof AppError) throw error;
    throw new AppError('Failed to get execution', 500, error);
  }
} 