import { Request, Response } from 'express';
import { ApiResponse } from '@synthetic-monitoring/shared';

export function healthCheck(req: Request, res: Response): void {
  const response: ApiResponse = {
    success: true,
    data: {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
    },
  };
  res.json(response);
}
