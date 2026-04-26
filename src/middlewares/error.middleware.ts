import type { Request, Response, NextFunction } from 'express';
import { logError } from '../utils/logger.js';

export function errorMiddleware(
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) {
  logError('Error middleware', error);

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? error.message : 'Something went wrong'
  });
}

export function validationMiddleware(req: Request, res: Response, next: NextFunction) {
  // Implementar validación básica
  if (!req.body) {
    return res.status(400).json({ error: 'Request body is required' });
  }
  next();
}