import { RequestLogger } from './request-logger';
import { getWinstonLogger, persistLogs, persistError } from './winston-logger';
import type { LogEntry, LoggerOptions, RequestContext } from './types';

// Export main types and classes
export type { LogEntry, LoggerOptions, RequestContext };
export { RequestLogger, getWinstonLogger, persistLogs, persistError };

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