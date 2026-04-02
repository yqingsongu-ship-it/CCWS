import { Router } from 'express';
import {
  getAllMonitors,
  getMonitorById,
  createMonitor,
  updateMonitor,
  deleteMonitor,
  toggleMonitor,
  getMonitorResults,
  submitCheckResult,
  getMonitorStats,
  quickCheck,
} from '../controllers/monitor.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const monitorRoutes = Router();

monitorRoutes.use(authenticate);
monitorRoutes.get('/', getAllMonitors);
monitorRoutes.get('/:id', getMonitorById);
monitorRoutes.post('/', createMonitor);
monitorRoutes.put('/:id', updateMonitor);
monitorRoutes.delete('/:id', deleteMonitor);
monitorRoutes.post('/:id/toggle', toggleMonitor);
monitorRoutes.post('/:id/quick-check', quickCheck);
monitorRoutes.get('/:id/results', getMonitorResults);
monitorRoutes.get('/:id/stats', getMonitorStats);

// Submit check result (called by probe agents)
monitorRoutes.post('/:id/results', submitCheckResult);
