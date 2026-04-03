import { Request, Response } from 'express';
import { ApiResponse, Probe } from '@synthetic-monitoring/shared';
import { prisma } from '../database/index.js';
import { createAuditLog } from '../services/auth.service.js';
import { ZodError } from 'zod';
import { z } from 'zod';

// Validation schemas
const createProbeSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  region: z.string().min(1, 'Region is required'),
  location: z.object({
    country: z.string(),
    city: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  provider: z.string().optional(),
  tags: z.array(z.string()).optional(),
});

const updateProbeSchema = z.object({
  name: z.string().optional(),
  region: z.string().optional(),
  location: z.object({
    country: z.string(),
    city: z.string(),
    latitude: z.number().optional(),
    longitude: z.number().optional(),
  }).optional(),
  provider: z.string().optional(),
  tags: z.array(z.string()).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/probes
 * Get all probes with filtering
 */
export async function getAllProbes(req: Request, res: Response): Promise<void> {
  try {
    const region = req.query.region as string;
    const status = req.query.status as Probe['status'];
    const provider = req.query.provider as string;

    const where: Record<string, unknown> = {};

    if (region) {
      where.region = region;
    }

    if (status) {
      where.status = status;
    }

    if (provider) {
      where.provider = provider;
    }

    const probes = await prisma.probe.findMany({
      where,
      include: {
        assignedMonitors: {
          select: { id: true, name: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const response: ApiResponse = { success: true, data: probes };
    res.json(response);
  } catch (error) {
    console.error('Get probes error:', error);
    res.status(500).json({ success: false, error: 'Failed to get probes' });
  }
}

/**
 * GET /api/probes/:id
 * Get probe by ID
 */
export async function getProbeById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const probe = await prisma.probe.findUnique({
      where: { id },
      include: {
        assignedMonitors: {
          select: { id: true, name: true, type: true, target: true },
        },
      },
    });

    if (!probe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    const response: ApiResponse = { success: true, data: probe };
    res.json(response);
  } catch (error) {
    console.error('Get probe error:', error);
    res.status(500).json({ success: false, error: 'Failed to get probe' });
  }
}

/**
 * GET /api/probes/stats
 * Get probe statistics
 */
export async function getProbeStats(req: Request, res: Response): Promise<void> {
  try {
    const [total, online, busy, totalMonitors] = await Promise.all([
      prisma.probe.count(),
      prisma.probe.count({ where: { status: 'ONLINE' } }),
      prisma.probe.count({ where: { status: 'BUSY' } }),
      prisma.probe.aggregate({
        _sum: { assignedTaskCount: true },
      }),
    ]);

    const stats = {
      total,
      online,
      offline: total - online,
      busy,
      idle: online - busy,
      totalAssignedMonitors: totalMonitors._sum.assignedTaskCount || 0,
    };

    const response: ApiResponse = { success: true, data: stats };
    res.json(response);
  } catch (error) {
    console.error('Get probe stats error:', error);
    res.status(500).json({ success: false, error: 'Failed to get probe statistics' });
  }
}

/**
 * POST /api/probes
 * Create new probe (generates API key)
 */
export async function createProbe(req: Request, res: Response): Promise<void> {
  try {
    const data = createProbeSchema.parse(req.body);

    // Generate unique API key for probe authentication
    const apiKey = `probe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const apiKeyHash = await hashToken(apiKey);

    const probe = await prisma.probe.create({
      data: {
        name: data.name,
        region: data.region,
        location: data.location ? JSON.stringify(data.location) : null,
        capabilities: '[]',
        tags: data.tags ? JSON.stringify(data.tags) : '[]',
        apiKey: apiKeyHash,
        status: 'OFFLINE',
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_PROBE',
      resource: 'probe',
      resourceId: probe.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return probe with the raw API key (only shown once)
    const response: ApiResponse = {
      success: true,
      data: {
        ...probe,
        apiKey, // Only returned once for initial setup
      },
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Create probe error:', error);
    res.status(500).json({ success: false, error: 'Failed to create probe' });
  }
}

/**
 * PUT /api/probes/:id
 * Update probe
 */
export async function updateProbe(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateProbeSchema.parse(req.body);

    const existingProbe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!existingProbe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    const probe = await prisma.probe.update({
      where: { id },
      data,
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_PROBE',
      resource: 'probe',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: probe };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Update probe error:', error);
    res.status(500).json({ success: false, error: 'Failed to update probe' });
  }
}

/**
 * DELETE /api/probes/:id
 * Delete probe
 */
export async function deleteProbe(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const existingProbe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!existingProbe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    await prisma.probe.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'DELETE_PROBE',
      resource: 'probe',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Delete probe error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete probe' });
  }
}

/**
 * PATCH /api/probes/:id/toggle
 * Toggle probe enabled status
 */
export async function toggleProbe(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const probe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!probe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    const updatedProbe = await prisma.probe.update({
      where: { id },
      data: { enabled: !probe.enabled },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'TOGGLE_PROBE',
      resource: 'probe',
      resourceId: id,
      details: { enabled: updatedProbe.enabled },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: updatedProbe };
    res.json(response);
  } catch (error) {
    console.error('Toggle probe error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle probe' });
  }
}

/**
 * POST /api/probes/:id/heartbeat
 * Update probe heartbeat (called by probe agent)
 */
export async function probeHeartbeat(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { metrics, version, currentTasks } = req.body;

    const probe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!probe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    // Update probe status and last seen
    await prisma.probe.update({
      where: { id },
      data: {
        lastSeenAt: new Date(),
        status: 'ONLINE',
        version: version || probe.version,
        assignedTaskCount: currentTasks?.length || probe.assignedTaskCount,
        ...(metrics ? { location: metrics as Record<string, unknown> } : {}),
      },
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Probe heartbeat error:', error);
    res.status(500).json({ success: false, error: 'Failed to process heartbeat' });
  }
}

/**
 * POST /api/probes/:id/assign
 * Assign monitors to probe
 */
export async function assignMonitorsToProbe(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { monitorIds } = req.body;

    if (!Array.isArray(monitorIds)) {
      res.status(400).json({ success: false, error: 'monitorIds must be an array' });
      return;
    }

    const probe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!probe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    // Verify monitors exist
    const monitors = await prisma.monitor.findMany({
      where: { id: { in: monitorIds } },
      select: { id: true },
    });

    if (monitors.length !== monitorIds.length) {
      res.status(400).json({ success: false, error: 'Some monitors not found' });
      return;
    }

    // Update probe with assigned monitors count
    const updatedProbe = await prisma.probe.update({
      where: { id },
      data: {
        assignedTaskCount: monitorIds.length,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'ASSIGN_MONITORS_TO_PROBE',
      resource: 'probe',
      resourceId: id,
      details: { monitorIds },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: updatedProbe };
    res.json(response);
  } catch (error) {
    console.error('Assign monitors error:', error);
    res.status(500).json({ success: false, error: 'Failed to assign monitors' });
  }
}

/**
 * Regenerate probe API key
 */
export async function regenerateProbeKey(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const probe = await prisma.probe.findUnique({
      where: { id },
    });

    if (!probe) {
      res.status(404).json({ success: false, error: 'Probe not found' });
      return;
    }

    // Generate new API key
    const apiKey = `probe_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
    const apiKeyHash = await hashToken(apiKey);

    await prisma.probe.update({
      where: { id },
      data: { apiKey: apiKeyHash },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'REGENERATE_PROBE_KEY',
      resource: 'probe',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return the new key (only shown once)
    const response: ApiResponse = {
      success: true,
      data: { apiKey },
    };
    res.json(response);
  } catch (error) {
    console.error('Regenerate probe key error:', error);
    res.status(500).json({ success: false, error: 'Failed to regenerate probe key' });
  }
}

/**
 * Hash token using bcrypt
 */
async function hashToken(token: string): Promise<string> {
  const bcrypt = await import('bcryptjs');
  return bcrypt.hash(token, 10);
}
