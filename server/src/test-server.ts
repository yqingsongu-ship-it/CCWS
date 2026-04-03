import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { setupRoutes } from './api/routes';
import { setupSocketHandlers } from './services/socket.service';
import { connectDatabase, disconnectDatabase } from './database/index';
import { prisma } from './database/index';

export let io: Server;

export class TestAppServer {
  public app: express.Application;
  private httpServer: ReturnType<typeof createServer>;
  private port: number;

  constructor(port: number = 3002) {
    this.app = express();
    this.httpServer = createServer(this.app);
    this.port = port;

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

    return new Promise((resolve, reject) => {
      this.httpServer.on('error', (err) => {
        reject(err);
      });

      this.httpServer.listen(this.port, '127.0.0.1', () => {
        resolve();
      });
    });
  }

  async stop(): Promise<void> {
    await disconnectDatabase();
    return new Promise((resolve) => {
      this.httpServer.close(() => {
        resolve();
      });
    });
  }

  getServerAddress(): string {
    return `http://127.0.0.1:${this.port}`;
  }
}
