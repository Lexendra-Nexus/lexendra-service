import pino from 'pino';

// Usar transporte simple para desarrollo/producción
const isProduction = process.env.NODE_ENV === 'production';

export const logger = isProduction
  ? pino({
      level: process.env.LOG_LEVEL || 'info',
      transport: {
        target: 'pino-pretty',
        options: {
          colorize: true
        }
      }
    })
  : pino({
      level: process.env.LOG_LEVEL || 'info'
    });

export const logError = (message: string, error?: any) => {
  if (error instanceof Error) {
    console.error(`[ERROR] ${message}`, error.message, error);
  } else if (typeof error !== 'undefined') {
    console.error(`[ERROR] ${message}`, error);
  } else {
    console.error(`[ERROR] ${message}`);
  }
};

export const logInfo = (message: string, meta?: unknown) => {
  if (typeof meta !== 'undefined') {
    console.log(`[INFO] ${message}`, meta);
  } else {
    console.log(`[INFO] ${message}`);
  }
};

export const logWarn = (message: string, meta?: unknown) => {
  if (typeof meta !== 'undefined') {
    logger.warn({ meta }, message);
  } else {
    logger.warn(message);
  }
};