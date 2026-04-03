import { Request, Response } from 'express';
import { ApiResponse, UserRole } from '@synthetic-monitoring/shared';
import { prisma } from '../database/index.js';
import { hashPassword, createAuditLog } from '../services/auth.service.js';
import { ZodError } from 'zod';
import { z } from 'zod';

// Validation schemas
const createUserSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
  departmentId: z.string().optional(),
  quota: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

const updateUserSchema = z.object({
  name: z.string().optional(),
  email: z.string().email().optional(),
  role: z.enum(['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'USER', 'VIEWER']).optional(),
  departmentId: z.string().optional(),
  quota: z.number().min(0).optional(),
  enabled: z.boolean().optional(),
});

/**
 * GET /api/users
 * Get all users with pagination and filtering
 */
export async function getAllUsers(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string;
    const role = req.query.role as UserRole;
    const departmentId = req.query.departmentId as string;

    const where: Record<string, unknown> = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (role) {
      where.role = role;
    }

    if (departmentId) {
      where.departmentId = departmentId;
    }

    const [users, total] = await Promise.all([
      prisma.user.findMany({
        where,
        skip: (page - 1) * pageSize,
        take: pageSize,
        include: {
          department: true,
        },
        orderBy: { createdAt: 'desc' },
      }),
      prisma.user.count({ where }),
    ]);

    // Remove password from response and add usedQuota
    const usersWithoutPassword = users.map(({ password, ...user }) => ({
      ...user,
      usedQuota: 0, // TODO: Calculate from monitors
    }));

    const response: ApiResponse = {
      success: true,
      data: {
        items: usersWithoutPassword,
        total,
        page,
        pageSize,
        totalPages: Math.ceil(total / pageSize),
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ success: false, error: 'Failed to get users' });
  }
}

/**
 * GET /api/users/:id
 * Get user by ID
 */
export async function getUserById(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
        monitors: {
          select: { id: true, name: true, status: true },
        },
        apiTokens: {
          select: { id: true, name: true, prefix: true, createdAt: true, lastUsedAt: true },
        },
      },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Remove password from response
    const { password, ...userWithoutPassword } = user;

    const response: ApiResponse = { success: true, data: userWithoutPassword };
    res.json(response);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user' });
  }
}

/**
 * POST /api/users
 * Create new user
 */
export async function createUser(req: Request, res: Response): Promise<void> {
  try {
    const data = createUserSchema.parse(req.body);

    // Check if email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
    });

    if (existingUser) {
      res.status(409).json({ success: false, error: 'Email already exists' });
      return;
    }

    // Hash password
    const hashedPassword = await hashPassword(data.password);

    // Create user
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'USER',
        departmentId: data.departmentId,
        quota: data.quota || 10,
        enabled: data.enabled ?? true,
      },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        quota: true,
        enabled: true,
        createdAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'CREATE_USER',
      resource: 'user',
      resourceId: user.id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: user };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Create user error:', error);
    res.status(500).json({ success: false, error: 'Failed to create user' });
  }
}

/**
 * PUT /api/users/:id
 * Update user
 */
export async function updateUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const data = updateUserSchema.parse(req.body);

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Check if email is being changed and already exists
    if (data.email && data.email !== existingUser.email) {
      const emailExists = await prisma.user.findUnique({
        where: { email: data.email },
      });

      if (emailExists) {
        res.status(409).json({ success: false, error: 'Email already exists' });
        return;
      }
    }

    // Update user
    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        departmentId: true,
        quota: true,
        enabled: true,
        updatedAt: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'UPDATE_USER',
      resource: 'user',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: user };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Update user error:', error);
    res.status(500).json({ success: false, error: 'Failed to update user' });
  }
}

/**
 * DELETE /api/users/:id
 * Delete user
 */
export async function deleteUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    // Check if user exists
    const existingUser = await prisma.user.findUnique({
      where: { id },
    });

    if (!existingUser) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Prevent self-deletion
    if (id === req.user?.userId) {
      res.status(400).json({ success: false, error: 'Cannot delete your own account' });
      return;
    }

    // Delete user
    await prisma.user.delete({
      where: { id },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'DELETE_USER',
      resource: 'user',
      resourceId: id,
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete user' });
  }
}

/**
 * PATCH /api/users/:id/toggle
 * Toggle user enabled status
 */
export async function toggleUser(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { enabled: !user.enabled },
      select: {
        id: true,
        email: true,
        name: true,
        enabled: true,
      },
    });

    // Create audit log
    await createAuditLog({
      userId: req.user?.userId,
      action: 'TOGGLE_USER',
      resource: 'user',
      resourceId: id,
      details: { enabled: updatedUser.enabled },
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true, data: updatedUser };
    res.json(response);
  } catch (error) {
    console.error('Toggle user error:', error);
    res.status(500).json({ success: false, error: 'Failed to toggle user' });
  }
}

/**
 * GET /api/departments
 * Get all departments
 */
export async function getAllDepartments(req: Request, res: Response): Promise<void> {
  try {
    const departments = await prisma.department.findMany({
      include: {
        parent: true,
        _count: {
          select: { users: true },
        },
      },
      orderBy: { name: 'asc' },
    });

    const response: ApiResponse = { success: true, data: departments };
    res.json(response);
  } catch (error) {
    console.error('Get departments error:', error);
    res.status(500).json({ success: false, error: 'Failed to get departments' });
  }
}

/**
 * POST /api/departments
 * Create or update department
 */
export async function saveDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id, name, parentId, path } = req.body;

    if (!name) {
      res.status(400).json({ success: false, error: 'Department name is required' });
      return;
    }

    let department;

    if (id) {
      // Update existing
      department = await prisma.department.update({
        where: { id },
        data: { name, parentId, path },
      });
    } else {
      // Create new
      department = await prisma.department.create({
        data: { name, parentId, path: path || `/${name}` },
      });
    }

    const response: ApiResponse = { success: true, data: department };
    res.json(response);
  } catch (error) {
    console.error('Save department error:', error);
    res.status(500).json({ success: false, error: 'Failed to save department' });
  }
}

/**
 * DELETE /api/departments/:id
 * Delete department
 */
export async function deleteDepartment(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;

    await prisma.department.delete({
      where: { id },
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Delete department error:', error);
    res.status(500).json({ success: false, error: 'Failed to delete department' });
  }
}
