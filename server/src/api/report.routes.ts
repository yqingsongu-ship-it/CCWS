import { Router } from 'express';
import { authenticate } from '../middleware/auth.middleware.js';
import {
  getReport,
  getDailyReport,
  getWeeklyReport,
  getMonthlyReport,
  getMonitorReport,
} from '../controllers/report.controller.js';

const router = Router();

/**
 * Report Routes
 *
 * All report routes require authentication.
 * Users can only access reports for their own monitors.
 * Admin users can access all reports.
 */

// Get general report with date range
router.get('/', authenticate, getReport);

// Get daily report for a specific date
router.get('/daily', authenticate, getDailyReport);

// Get weekly report for a specific week
router.get('/weekly', authenticate, getWeeklyReport);

// Get monthly report for a specific month
router.get('/monthly', authenticate, getMonthlyReport);

// Get report for a specific monitor
router.get('/monitors/:monitorId', authenticate, getMonitorReport);

export { router as reportRoutes };
