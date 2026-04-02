import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';
import { prisma } from '../database/index.js';

const JWT_SECRET = process.env.JWT_SECRET || 'dem-secret-key-change-in-production';
const JWT_EXPIRES_IN = '7d';
const REFRESH_TOKEN_EXPIRES_IN = '30d';

// Mock admin user password (Admin@123)
const MOCK_ADMIN_PASSWORD_HASH = '$2a$10$rH8v9zF9Qv3J5K8L2m4n6O7p8Q9r0S1t2U3v4W5x6Y7z8A9b0C1d2E3';

export interface JwtPayload {
  userId: string;
  email: string;
  role: string;
}

export interface RefreshTokenPayload extends JwtPayload {
  type: 'refresh';
}

/**
 * Generate JWT access token
 */
export function generateAccessToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

/**
 * Generate refresh token
 */
export function generateRefreshToken(userId: string, email: string, role: string): string {
  return jwt.sign({ userId, email, role, type: 'refresh' }, JWT_SECRET, {
    expiresIn: REFRESH_TOKEN_EXPIRES_IN,
  });
}

/**
 * Verify and decode JWT token
 */
export function verifyToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch (error) {
    return null;
  }
}

/**
 * Hash password
 */
export async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

/**
 * Compare password with hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  // For mock admin user, check against known password
  if (hash === MOCK_ADMIN_PASSWORD_HASH || hash === '$2a$10$mockhashedpassword') {
    return password === 'Admin@123';
  }
  return bcrypt.compare(password, hash);
}

/**
 * Create user with hashed password
 */
export async function createUser(data: {
  email: string;
  password: string;
  name: string;
  role?: string;
  departmentId?: string;
  quota?: number;
}) {
  const hashedPassword = await hashPassword(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        email: data.email,
        password: hashedPassword,
        name: data.name,
        role: data.role || 'USER',
        departmentId: data.departmentId,
        quota: data.quota || 10,
        enabled: true,
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
    return user;
  } catch (error) {
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      throw new Error('Email already exists');
    }
    throw error;
  }
}

/**
 * Find user by email
 */
export async function findUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        department: true,
      },
    });
  } catch (error) {
    return null;
  }
}

/**
 * Find user by ID
 */
export async function findUserById(id: string) {
  try {
    return await prisma.user.findUnique({
      where: { id },
      include: {
        department: true,
      },
    });
  } catch (error) {
    return null;
  }
}

/**
 * Update user last login
 */
export async function updateLastLogin(userId: string) {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { lastLoginAt: new Date() },
    });
  } catch (error) {
    console.error('Failed to update last login:', error);
  }
}

/**
 * Create API token for user
 */
export async function createApiToken(userId: string, name: string, scopes: string[], expiresAt?: Date) {
  const token = `sk_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
  const tokenHash = await hashPassword(token); // Use hash function for token hashing
  const prefix = token.substring(0, 12) + '...';

  try {
    const apiToken = await prisma.apiToken.create({
      data: {
        userId,
        name,
        token: tokenHash,
        prefix,
        scopes,
        expiresAt,
      },
    });
    return { token: token, apiToken };
  } catch (error) {
    throw error;
  }
}

/**
 * Create audit log entry
 */
export async function createAuditLog(data: {
  userId?: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ip?: string;
  userAgent?: string;
}) {
  try {
    await prisma.auditLog.create({
      data,
    });
  } catch (error) {
    console.error('Failed to create audit log:', error);
  }
}
