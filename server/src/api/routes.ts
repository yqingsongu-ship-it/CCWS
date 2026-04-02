import { Router } from 'express';
import { monitorRoutes } from './monitor.routes';
import { probeRoutes } from './probe.routes';
import { alertRoutes } from './alert.routes';
import { userRoutes } from './user.routes';
import { authRoutes } from './auth.routes';
import { healthRoutes } from './health.routes';
import { notificationRoutes } from './notification.routes';
import { reportRoutes } from './report.routes';

export const router = Router();

export function setupRoutes(app: Router) {
  app.use('/api/health', healthRoutes);
  app.use('/api/auth', authRoutes);
  app.use('/api/monitors', monitorRoutes);
  app.use('/api/probes', probeRoutes);
  app.use('/api/alerts', alertRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/reports', reportRoutes);
}
