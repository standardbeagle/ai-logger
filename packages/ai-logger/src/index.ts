// Server-side exports
import { RequestLogger } from './request-logger';
export { RequestLogger } from './request-logger';
export { getWinstonLogger, persistLogs, persistError } from './winston-logger';
export { loggerMiddleware, withLogger } from './middleware';
export type { LogEntry, LoggerOptions, RequestContext } from './types';

// Client-side exports
export { LogProvider, useLogger } from './client/context';
export { LogFrame, withLogging, useLogFrame } from './client/log-frame';

// Re-export commonly used functions for convenience
export const {
  info,
  warn,
  error,
  debug,
  getCurrentContext,
  getRequestLogs,
  clearContext,
  run
} = RequestLogger;