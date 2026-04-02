import { Request, Response } from 'express';
import { ApiResponse } from '@synthetic-monitoring/shared';
import { reportService } from '../services/report.service.js';
import { prisma } from '../database/index.js';

/**
 * GET /api/reports
 * Get report with custom date range
 */
export async function getReport(req: Request, res: Response): Promise<void> {
  try {
    const { startDate, endDate, period = 'daily' } = req.query;

    if (!startDate || !endDate) {
      res.status(400).json({
        success: false,
        error: 'startDate and endDate are required',
      });
      return;
    }

    const start = new Date(startDate as string);
    const end = new Date(endDate as string);

    // Validate date range
    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      res.status(400).json({
        success: false,
        error: 'Invalid date format',
      });
      return;
    }

    const report = await reportService.generateReport(
      period as 'daily' | 'weekly' | 'monthly',
      start,
      end
    );

    const response: ApiResponse = { success: true, data: report };
    res.json(response);
  } catch (error) {
    console.error('Get report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate report' });
  }
}

/**
 * GET /api/reports/daily
 * Get daily report for a specific date
 */
export async function getDailyReport(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();
    targetDate.setHours(0, 0, 0, 0);

    const startDate = new Date(targetDate);
    const endDate = new Date(targetDate);
    endDate.setDate(endDate.getDate() + 1);

    const report = await reportService.generateReport('daily', startDate, endDate);

    const response: ApiResponse = { success: true, data: report };
    res.json(response);
  } catch (error) {
    console.error('Get daily report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate daily report' });
  }
}

/**
 * GET /api/reports/weekly
 * Get weekly report
 */
export async function getWeeklyReport(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();

    // Get start of week (Monday)
    const startDate = new Date(targetDate);
    const day = startDate.getDay();
    const diff = startDate.getDate() - day + (day === 0 ? -6 : 1);
    startDate.setDate(diff);
    startDate.setHours(0, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    const report = await reportService.generateReport('weekly', startDate, endDate);

    const response: ApiResponse = { success: true, data: report };
    res.json(response);
  } catch (error) {
    console.error('Get weekly report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate weekly report' });
  }
}

/**
 * GET /api/reports/monthly
 * Get monthly report
 */
export async function getMonthlyReport(req: Request, res: Response): Promise<void> {
  try {
    const { date } = req.query;

    const targetDate = date ? new Date(date as string) : new Date();

    const startDate = new Date(targetDate.getFullYear(), targetDate.getMonth(), 1);
    const endDate = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0, 23, 59, 59);

    const report = await reportService.generateReport('monthly', startDate, endDate);

    const response: ApiResponse = { success: true, data: report };
    res.json(response);
  } catch (error) {
    console.error('Get monthly report error:', error);
    res.status(500).json({ success: false, error: 'Failed to generate monthly report' });
  }
}

/**
 * GET /api/reports/monitors/:monitorId
 * Get report for a specific monitor
 */
export async function getMonitorReport(req: Request, res: Response): Promise<void> {
  try {
    const { monitorId } = req.params;
    const { period = 'daily', date } = req.query;

    // Verify monitor exists and user has access
    const monitor = await prisma.monitor.findUnique({
      where: { id: monitorId },
    });

    if (!monitor) {
      res.status(404).json({ success: false, error: 'Monitor not found' });
      return;
    }

    // Check permissions (simplified - in production, verify user owns monitor or is admin)
    // This would use the same permission check pattern as other endpoints

    const targetDate = date ? new Date(date as string) : new Date();
    const reportData = await reportService.getReportData(
      monitorId,
      period as 'daily' | 'weekly' | 'monthly',
      targetDate
    );

    if (!reportData) {
      res.status(404).json({ success: false, error: 'Report data not found' });
      return;
    }

    const response: ApiResponse = { success: true, data: reportData };
    res.json(response);
  } catch (error) {
    console.error('Get monitor report error:', error);
    res.status(500).json({ success: false, error: 'Failed to get monitor report' });
  }
}
