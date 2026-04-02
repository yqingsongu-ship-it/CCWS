import { Router } from 'express';
import {
  login,
  register,
  logout,
  getCurrentUser,
  refreshToken,
  changePassword,
} from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/auth.middleware.js';

export const authRoutes = Router();

// Public routes
authRoutes.post('/login', login);
authRoutes.post('/register', register);
authRoutes.post('/refresh', refreshToken);

// Protected routes
authRoutes.post('/logout', authenticate, logout);
authRoutes.get('/me', authenticate, getCurrentUser);
authRoutes.put('/password', authenticate, changePassword);
