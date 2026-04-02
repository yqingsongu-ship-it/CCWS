import { Router } from 'express';
import {
  getAllProbes,
  getProbeById,
  getProbeStats,
  createProbe,
  updateProbe,
  deleteProbe,
  toggleProbe,
  probeHeartbeat,
  assignMonitorsToProbe,
  regenerateProbeKey,
} from '../controllers/probe.controller.js';
import { authenticate, requireAdmin } from '../middleware/auth.middleware.js';

export const probeRoutes = Router();

// All routes require authentication
probeRoutes.use(authenticate);

// Probe routes
probeRoutes.get('/', getAllProbes);
probeRoutes.get('/stats', getProbeStats);
probeRoutes.get('/:id', getProbeById);
probeRoutes.post('/', requireAdmin, createProbe);
probeRoutes.put('/:id', requireAdmin, updateProbe);
probeRoutes.delete('/:id', requireAdmin, deleteProbe);
probeRoutes.patch('/:id/toggle', requireAdmin, toggleProbe);

// Probe agent routes (for heartbeats and status updates)
probeRoutes.post('/:id/heartbeat', probeHeartbeat);

// Admin-only routes
probeRoutes.post('/:id/assign', requireAdmin, assignMonitorsToProbe);
probeRoutes.post('/:id/regenerate-key', requireAdmin, regenerateProbeKey);
