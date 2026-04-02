import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { createLogger } from './utils/logger';
import { setupRoutes } from './api/routes';
import { setupSocketHandlers } from './services/socket.service';
import { connectDatabase, disconnectDatabase } from './database/index';
import { prisma } from './database/index';
import { schedulerService } from './services/scheduler.service';

const logger = createLogger('server');

const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || '0.0.0.0';

// Export io for use in scheduler
export let io: Server;

export class AppServer {
  private app: express.Application;
  private httpServer: ReturnType<typeof createServer>;

  constructor() {
    this.app = express();
    this.httpServer = createServer(this.app);
    io = new Server(this.httpServer, {
      cors: {
        origin: '*',
        methods: ['GET', 'POST'],
      },
    });

    this.setupMiddleware();
    setupRoutes(this.app);
    setupSocketHandlers(io);
  }

  private setupMiddleware() {
    this.app.use(helmet());
    this.app.use(cors());
    this.app.use(compression());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  }

  async start(): Promise<void> {
    try {
      await connectDatabase();

      // Ensure quick-check probe exists with fixed API key
      const quickCheckKey = 'quick-check-secret-key';
      await prisma.probe.upsert({
        where: { id: 'quick-check' },
        update: { apiKey: quickCheckKey, status: 'ONLINE' },
        create: {
          id: 'quick-check',
          name: 'Quick Check Probe',
          status: 'ONLINE',
          capabilities: '[]',
          tags: '[]',
          region: 'local',
          apiKey: quickCheckKey,
        },
      });
      logger.info('Quick-check probe ensured');

      this.httpServer.listen(Number(PORT), HOST, async () => {
        logger.info(`Server started at http://${HOST}:${PORT}`);

        // Start scheduler after server is running
        await schedulerService.start();
        logger.info('Scheduler started');
      });
    } catch (error) {
      logger.error('Failed to start server:', error);
      throw error;
    }
  }

  async stop(): Promise<void> {
    logger.info('Shutting down server...');

    // Stop scheduler first
    await schedulerService.stop();

    this.httpServer.close(() => {
      logger.info('HTTP server closed');
    });

    await disconnectDatabase();
    logger.info('Database connection closed');
  }
}

// Graceful shutdown
const server = new AppServer();

process.on('SIGTERM', async () => {
  await server.stop();
  process.exit(0);
});

process.on('SIGINT', async () => {
  await server.stop();
  process.exit(0);
});

server.start().catch((err) => {
  logger.error('Server startup failed:', err);
  process.exit(1);
});
