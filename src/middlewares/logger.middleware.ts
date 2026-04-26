import type { Request, Response, NextFunction } from 'express';
import { logInfo } from '../utils/logger.js';

export function loggerMiddleware(req: Request, res: Response, next: NextFunction) {
  const start = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - start;
    logInfo(`${req.method} ${req.url} ${res.statusCode} - ${duration}ms`);
  });

  next();
}