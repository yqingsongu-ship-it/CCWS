import { Router } from 'express';
import {
  getAllAlerts,
  getAlertById,
  acknowledgeAlert,
  getAlertStats,
  getAlertRulesByMonitorId,
  createAlertRule,
  updateAlertRule,
  deleteAlertRule,
  toggleAlertRule,
  testAlertRule,
  createGlobalAlertRule,
  getAllAlertRules,
} from '../controllers/alert.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const alertRoutes = Router();

// All routes require authentication
alertRoutes.use(authenticate);

// Alert routes
alertRoutes.get('/', getAllAlerts);
alertRoutes.get('/stats', getAlertStats);
alertRoutes.get('/:id', getAlertById);
alertRoutes.post('/:id/acknowledge', acknowledgeAlert);

// Global alert rule routes (for general alert management)
alertRoutes.get('/rules', getAllAlertRules);
alertRoutes.post('/rules', createGlobalAlertRule);

// Monitor-based alert rule routes
alertRoutes.get('/monitors/:monitorId/rules', getAlertRulesByMonitorId);
alertRoutes.post('/monitors/:monitorId/rules', createAlertRule);

// Alert rule routes
alertRoutes.put('/rules/:id', updateAlertRule);
alertRoutes.delete('/rules/:id', deleteAlertRule);
alertRoutes.patch('/rules/:id/toggle', toggleAlertRule);
alertRoutes.post('/rules/:id/test', testAlertRule);
