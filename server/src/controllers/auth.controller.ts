import { Request, Response } from 'express';
import { ApiResponse } from '@synthetic-monitoring/shared';
import {
  generateAccessToken,
  generateRefreshToken,
  verifyToken,
  comparePassword,
  createUser,
  findUserByEmail,
  findUserById,
  updateLastLogin,
  createAuditLog,
  hashPassword,
} from '../services/auth.service.js';
import { prisma } from '../database/index.js';
import { ZodError } from 'zod';
import { z } from 'zod';

// Validation schemas
const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
  remember: z.boolean().optional(),
});

const registerSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  name: z.string().min(1, 'Name is required'),
});

/**
 * POST /api/auth/login
 * User login
 */
export async function login(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const { email, password, remember } = loginSchema.parse(req.body);

    // Find user
    const user = await findUserByEmail(email);
    if (!user) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Check if user is enabled
    if (!user.enabled) {
      res.status(403).json({ success: false, error: 'Account is disabled' });
      return;
    }

    // Verify password
    const isValidPassword = await comparePassword(password, user.password);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Invalid email or password' });
      return;
    }

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.email, user.role);

    // Update last login
    await updateLastLogin(user.id);

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'LOGIN',
      resource: 'user',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: remember ? '30d' : '7d',
        user: userWithoutPassword,
      },
    };
    res.json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    console.error('Login error:', error);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
}

/**
 * POST /api/auth/register
 * User registration
 */
export async function register(req: Request, res: Response): Promise<void> {
  try {
    // Validate request body
    const { email, password, name } = registerSchema.parse(req.body);

    // Create user
    const user = await createUser({ email, password, name });

    // Generate tokens
    const accessToken = generateAccessToken(user.id, user.email, user.role);
    const refreshToken = generateRefreshToken(user.id, user.email, user.role);

    // Create audit log
    await createAuditLog({
      userId: user.id,
      action: 'REGISTER',
      resource: 'user',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken,
        refreshToken,
        expiresIn: '7d',
        user,
      },
    };
    res.status(201).json(response);
  } catch (error) {
    if (error instanceof ZodError) {
      res.status(400).json({ success: false, error: error.errors[0].message });
      return;
    }
    if (error instanceof Error && error.message === 'Email already exists') {
      res.status(409).json({ success: false, error: 'Email already exists' });
      return;
    }
    console.error('Register error:', error);
    res.status(500).json({ success: false, error: 'Registration failed' });
  }
}

/**
 * POST /api/auth/refresh
 * Refresh access token
 */
export async function refreshToken(req: Request, res: Response): Promise<void> {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      res.status(400).json({ success: false, error: 'Refresh token required' });
      return;
    }

    const payload = verifyToken(refreshToken) as RefreshTokenPayload | null;

    if (!payload || payload.type !== 'refresh') {
      res.status(401).json({ success: false, error: 'Invalid refresh token' });
      return;
    }

    // Verify user still exists and is enabled
    const user = await findUserById(payload.userId);
    if (!user || !user.enabled) {
      res.status(401).json({ success: false, error: 'User not found or disabled' });
      return;
    }

    // Generate new access token
    const newAccessToken = generateAccessToken(user.id, user.email, user.role);

    const response: ApiResponse = {
      success: true,
      data: {
        accessToken: newAccessToken,
        expiresIn: '7d',
      },
    };
    res.json(response);
  } catch (error) {
    console.error('Token refresh error:', error);
    res.status(500).json({ success: false, error: 'Token refresh failed' });
  }
}

/**
 * POST /api/auth/logout
 * User logout
 */
export async function logout(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (token) {
      const payload = verifyToken(token);
      if (payload) {
        await createAuditLog({
          userId: payload.userId,
          action: 'LOGOUT',
          resource: 'user',
          ip: req.ip,
          userAgent: req.headers['user-agent'],
        });
      }
    }

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
}

/**
 * GET /api/auth/me
 * Get current user info
 */
export async function getCurrentUser(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Return user data without password
    const { password: _, ...userWithoutPassword } = user;

    const response: ApiResponse = { success: true, data: userWithoutPassword };
    res.json(response);
  } catch (error) {
    console.error('Get current user error:', error);
    res.status(500).json({ success: false, error: 'Failed to get user info' });
  }
}

/**
 * PUT /api/auth/password
 * Change password
 */
export async function changePassword(req: Request, res: Response): Promise<void> {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');
    if (!token) {
      res.status(401).json({ success: false, error: 'Authentication required' });
      return;
    }

    const payload = verifyToken(token);
    if (!payload) {
      res.status(401).json({ success: false, error: 'Invalid token' });
      return;
    }

    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({ success: false, error: 'Current and new password required' });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({ success: false, error: 'Password must be at least 6 characters' });
      return;
    }

    const user = await findUserById(payload.userId);
    if (!user) {
      res.status(404).json({ success: false, error: 'User not found' });
      return;
    }

    // Verify current password
    const isValidPassword = await comparePassword(currentPassword, user.password);
    if (!isValidPassword) {
      res.status(401).json({ success: false, error: 'Current password is incorrect' });
      return;
    }

    // Hash new password and update
    const hashedPassword = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: payload.userId },
      data: { password: hashedPassword },
    });

    await createAuditLog({
      userId: payload.userId,
      action: 'CHANGE_PASSWORD',
      resource: 'user',
      ip: req.ip,
      userAgent: req.headers['user-agent'],
    });

    const response: ApiResponse = { success: true };
    res.json(response);
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ success: false, error: 'Failed to change password' });
  }
}
