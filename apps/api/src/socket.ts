import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { verifyToken } from './utils/auth';
import { prisma } from './lib/prisma';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    orgId: string;
    email: string;
    role: string;
  };
}

export function initializeSocketServer(httpServer: HttpServer) {
  const io = new Server(httpServer, {
    cors: {
      origin: process.env.FRONTEND_URL,
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  // Authentication middleware
  io.use(async (socket: AuthenticatedSocket, next) => {
    try {
      const token = socket.handshake.auth.token;
      if (!token) {
        return next(new Error('Authentication error'));
      }

      const decoded = await verifyToken(token);
      socket.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  // Connection handler
  io.on('connection', (socket: AuthenticatedSocket) => {
    console.log(`Client connected: ${socket.id}`);

    // Join organization room for org-wide updates
    if (socket.user?.orgId) {
      socket.join(`org:${socket.user.orgId}`);
    }

    // Join user's personal room
    if (socket.user?.id) {
      socket.join(`user:${socket.user.id}`);
    }

    // Handle workflow execution events
    socket.on('workflow:subscribe', async (workflowId: string) => {
      try {
        // Verify user has access to this workflow
        const workflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          select: { userId: true, orgId: true },
        });

        if (!workflow) {
          socket.emit('error', { message: 'Workflow not found' });
          return;
        }

        if (workflow.userId !== socket.user?.id && !socket.user?.role.includes('admin')) {
          socket.emit('error', { message: 'Unauthorized' });
          return;
        }

        // Join workflow room
        socket.join(`workflow:${workflowId}`);
        socket.emit('workflow:subscribed', { workflowId });
      } catch (error) {
        console.error('Error subscribing to workflow:', error);
        socket.emit('error', { message: 'Failed to subscribe to workflow' });
      }
    });

    // Handle workflow execution status updates
    socket.on('workflow:status', async (data: {
      workflowId: string;
      status: 'started' | 'completed' | 'failed';
      result?: any;
      error?: string;
    }) => {
      try {
        const { workflowId, status, result, error } = data;

        // Verify user has access to this workflow
        const workflow = await prisma.workflow.findUnique({
          where: { id: workflowId },
          select: { userId: true, orgId: true },
        });

        if (!workflow) {
          socket.emit('error', { message: 'Workflow not found' });
          return;
        }

        // Emit to workflow room
        io.to(`workflow:${workflowId}`).emit('workflow:status', {
          workflowId,
          status,
          result,
          error,
          timestamp: new Date().toISOString(),
        });

        // If completed or failed, update execution record
        if (status === 'completed' || status === 'failed') {
          await prisma.workflowExecution.create({
            data: {
              workflowId,
              status: status === 'completed' ? 'SUCCESS' : 'FAILED',
              result: result || null,
              error: error || null,
              userId: socket.user?.id,
              orgId: workflow.orgId,
            },
          });
        }
      } catch (error) {
        console.error('Error updating workflow status:', error);
        socket.emit('error', { message: 'Failed to update workflow status' });
      }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

// Helper function to emit events to specific rooms
export function emitToRoom(io: Server, room: string, event: string, data: any) {
  io.to(room).emit(event, data);
}

// Helper function to emit events to organization
export function emitToOrg(io: Server, orgId: string, event: string, data: any) {
  io.to(`org:${orgId}`).emit(event, data);
}

// Helper function to emit events to user
export function emitToUser(io: Server, userId: string, event: string, data: any) {
  io.to(`user:${userId}`).emit(event, data);
} 