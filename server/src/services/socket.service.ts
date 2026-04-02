import { Server, Socket } from 'socket.io';
import { createLogger } from '../utils/logger.js';
import { JwtPayload, verifyToken } from '../services/auth.service.js';
import { prisma } from '../database/index.js';
import type { CheckResult } from '@synthetic-monitoring/shared';

const logger = createLogger('socket');

// Store connected clients by user ID
const connectedClients: Map<string, Set<Socket>> = new Map();

// Store connected probes by probe ID
const connectedProbes: Map<string, Socket> = new Map();

// Room types for different data streams
type RoomType = 'monitor' | 'user' | 'alert' | 'probe';

interface AuthenticatedSocket extends Socket {
  user?: JwtPayload;
}

export function setupSocketHandlers(io: Server): void {
  // Middleware for authentication
  io.use((socket: AuthenticatedSocket, next) => {
    const token = socket.handshake.auth.token || socket.handshake.query.token as string;
    const probeKey = socket.handshake.auth.probeKey;

    // Check for probe authentication
    if (probeKey) {
      socket.data.probeKey = probeKey;
      return next();
    }

    if (!token) {
      return next(new Error('Authentication required'));
    }

    const payload = verifyToken(token);
    if (!payload) {
      return next(new Error('Invalid token'));
    }

    socket.user = payload;
    socket.data.userId = payload.userId;
    next();
  });

  io.on('connection', (socket: AuthenticatedSocket) => {
    logger.info(`Client connected: ${socket.id}`, {
      userId: socket.user?.userId,
      role: socket.user?.role
    });

    // Handle user client connections
    if (socket.user) {
      handleUserConnection(socket);
    }

    // Handle probe connections
    if (socket.data.probeKey) {
      handleProbeConnection(socket);
    }

    socket.on('disconnect', () => {
      logger.info(`Client disconnected: ${socket.id}`);
      handleDisconnect(socket);
    });

    // Error handling
    socket.on('error', (error: Error) => {
      logger.error(`Socket error: ${error.message}`, { socketId: socket.id });
    });
  });
}

/**
 * Handle user client WebSocket connections
 */
function handleUserConnection(socket: AuthenticatedSocket): void {
  const userId = socket.data.userId as string;

  // Add socket to user's connections
  if (!connectedClients.has(userId)) {
    connectedClients.set(userId, new Set());
  }
  connectedClients.get(userId)!.add(socket);

  // Auto-join user's personal room
  socket.join(`user:${userId}`);
  logger.info(`User ${userId} connected, total connections: ${connectedClients.get(userId)?.size}`);

  // Subscribe to user's monitors rooms
  subscribeToUserMonitors(socket, userId);

  // Socket operations
  socket.on('subscribe', (data: { room: string; type: RoomType }) => {
    handleSubscription(socket, data.room, data.type);
  });

  socket.on('unsubscribe', (data: { room: string }) => {
    socket.leave(data.room);
    logger.debug(`Client unsubscribed from: ${data.room}`);
  });

  // Get connected clients count (for dashboard)
  socket.on('getStats', (callback: (stats: SocketStats) => void) => {
    callback({
      connectedClients: getTotalConnectedClients(),
      connectedProbes: connectedProbes.size,
    });
  });
}

/**
 * Handle probe agent WebSocket connections
 */
function handleProbeConnection(socket: AuthenticatedSocket): void {
  const probeKey = socket.data.probeKey as string;

  // Try to find probe by id first, then by apiKey if schema has it
  prisma.probe.findUnique({
    where: { id: probeKey }
  }).then((probe) => {
    if (!probe) {
      // Try by apiKey if available
      return prisma.probe.findUnique({ where: { apiKey: probeKey } });
    }
    return probe;
  }).then((probe) => {
    if (!probe) {
      socket.emit('error', { message: 'Invalid probe key' });
      socket.disconnect();
      return;
    }

    // Register probe
    connectedProbes.set(probe.id, socket);
    socket.join(`probe:${probe.id}`);

    // Send acknowledgment with probe ID
    socket.emit('probe:registered', {
      id: probe.id,
      name: probe.name,
      status: probe.status,
      region: probe.region,
    });

    logger.info(`Probe connected: ${probe.name} (${probe.id})`);

    // Handle probe heartbeat
    socket.on('probe:heartbeat', async (data: { probeId: string; metrics?: unknown }) => {
      logger.debug(`Heartbeat from probe: ${data.probeId}`);

      // Update probe last seen and mark as ONLINE
      await prisma.probe.update({
        where: { id: data.probeId },
        data: {
          lastSeenAt: new Date(),
          status: 'ONLINE'
        },
      }).catch(() => {});
    });

    // Handle task acknowledgment from probe
    socket.on('probe:task:ack', async (data: { taskId: string; probeId: string; accepted: boolean }) => {
      logger.debug(`Task ack from probe ${data.probeId} for ${data.taskId}: ${data.accepted}`);
    });

    // Handle monitor check results from probe
    socket.on('monitor:result', async (data: { taskId: string; result: CheckResult }) => {
      logger.debug(`Check result from probe ${probe.id} for monitor ${data.taskId}`);

      // Broadcast result to interested clients
      io.to(`monitor:${data.taskId}`).emit('monitor:result', {
        taskId: data.taskId,
        result: data.result,
        probeId: probe.id,
        timestamp: new Date().toISOString(),
      });

      // Also emit to user room for real-time updates
      try {
        const monitor = await prisma.monitor.findUnique({
          where: { id: data.taskId },
          select: { userId: true },
        });
        if (monitor) {
          io.to(`user:${monitor.userId}`).emit('monitor:update', {
            taskId: data.taskId,
            result: data.result,
          });
        }
      } catch (error) {
        logger.error('Failed to broadcast monitor result:', error);
      }
    });
  }).catch((error) => {
    logger.error('Failed to verify probe:', error);
    socket.emit('error', { message: 'Failed to verify probe' });
    socket.disconnect();
  });
}

/**
 * Handle client disconnection
 */
function handleDisconnect(socket: AuthenticatedSocket): void {
  // Remove from connected clients
  const userId = socket.data.userId as string;
  if (userId && connectedClients.has(userId)) {
    const userSockets = connectedClients.get(userId)!;
    userSockets.delete(socket);

    if (userSockets.size === 0) {
      connectedClients.delete(userId);
      logger.info(`User ${userId} fully disconnected`);
    }
  }

  // Remove from connected probes
  for (const [probeId, probeSocket] of connectedProbes.entries()) {
    if (probeSocket === socket) {
      connectedProbes.delete(probeId);
      logger.info(`Probe ${probeId} disconnected`);
      break;
    }
  }
}

/**
 * Handle room subscription
 */
function handleSubscription(socket: AuthenticatedSocket, room: string, type: RoomType): void {
  const userId = socket.data.userId as string;

  // Validate room format
  const parts = room.split(':');
  if (parts.length !== 2) {
    socket.emit('error', { message: 'Invalid room format. Use type:id' });
    return;
  }

  const [roomType, roomId] = parts;

  // Permission checks based on room type
  switch (roomType) {
    case 'monitor':
      validateMonitorAccess(userId, roomId).then((allowed) => {
        if (allowed) {
          socket.join(room);
          logger.debug(`Client subscribed to ${room}`);
          socket.emit('subscribed', { room });
        } else {
          socket.emit('error', { message: 'Access denied to monitor' });
        }
      });
      break;

    case 'alert':
      validateAlertAccess(userId, roomId).then((allowed) => {
        if (allowed) {
          socket.join(room);
          logger.debug(`Client subscribed to ${room}`);
          socket.emit('subscribed', { room });
        } else {
          socket.emit('error', { message: 'Access denied to alert' });
        }
      });
      break;

    case 'user':
      // Users can only subscribe to their own room
      if (roomId === userId) {
        socket.join(room);
        socket.emit('subscribed', { room });
      } else {
        socket.emit('error', { message: 'Access denied' });
      }
      break;

    case 'probe':
      // Only admins can subscribe to probe rooms
      if (socket.user?.role === 'SUPER_ADMIN' || socket.user?.role === 'ADMIN') {
        socket.join(room);
        socket.emit('subscribed', { room });
      } else {
        socket.emit('error', { message: 'Access denied. Admin privileges required.' });
      }
      break;

    default:
      socket.emit('error', { message: `Unknown room type: ${roomType}` });
  }
}

/**
 * Subscribe socket to all user's monitors
 */
async function subscribeToUserMonitors(socket: AuthenticatedSocket, userId: string): Promise<void> {
  try {
    let where: Record<string, unknown> = { userId };

    // Admins see all monitors
    if (socket.user?.role === 'SUPER_ADMIN' || socket.user?.role === 'ADMIN') {
      where = {};
    }

    const monitors = await prisma.monitor.findMany({
      where,
      select: { id: true },
    });

    for (const monitor of monitors) {
      socket.join(`monitor:${monitor.id}`);
    }

    logger.debug(`Subscribed to ${monitors.length} monitor rooms`);
  } catch (error) {
    logger.error('Failed to subscribe to monitor rooms:', error);
  }
}

/**
 * Validate user has access to monitor
 */
async function validateMonitorAccess(userId: string, monitorId: string): Promise<boolean> {
  const monitor = await prisma.monitor.findUnique({
    where: { id: monitorId },
    select: { userId: true },
  });

  if (!monitor) return false;

  // Users can access their own monitors
  if (monitor.userId === userId) return true;

  // Admins can access all monitors
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });

  return user?.role === 'SUPER_ADMIN' || user?.role === 'ADMIN';
}

/**
 * Validate user has access to alert
 */
async function validateAlertAccess(userId: string, alertId: string): Promise<boolean> {
  const alert = await prisma.alert.findUnique({
    where: { id: alertId },
    select: { taskId: true },
  });

  if (!alert) return false;

  return validateMonitorAccess(userId, alert.taskId);
}

/**
 * Get total connected clients count
 */
function getTotalConnectedClients(): number {
  let count = 0;
  for (const sockets of connectedClients.values()) {
    count += sockets.size;
  }
  return count;
}

/**
 * Emit event to specific user
 */
export function emitToUser(userId: string, event: string, data: unknown): void {
  const sockets = connectedClients.get(userId);
  if (sockets) {
    sockets.forEach((socket) => {
      socket.emit(event, data);
    });
  }
}

/**
 * Emit event to all clients in a room
 */
export function emitToRoom(room: string, event: string, data: unknown): void {
  // This would need access to the io instance
  // For now, emitToUser is the primary method
}

/**
 * Broadcast alert to user
 */
export function broadcastAlert(userId: string, alert: {
  id: string;
  taskId: string;
  type: string;
  severity: string;
  message: string;
}): void {
  emitToUser(userId, 'alert:triggered', alert);
}

/**
 * Get socket statistics
 */
export interface SocketStats {
  connectedClients: number;
  connectedProbes: number;
}

export function getSocketStats(): SocketStats {
  return {
    connectedClients: getTotalConnectedClients(),
    connectedProbes: connectedProbes.size,
  };
}
