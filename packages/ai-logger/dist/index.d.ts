import { RequestLogger } from './request-logger';
import { getWinstonLogger, persistLogs, persistError } from './winston-logger';
import type { LogEntry, LoggerOptions, RequestContext } from './types';
export type { LogEntry, LoggerOptions, RequestContext };
export { RequestLogger, getWinstonLogger, persistLogs, persistError };
export declare const info: typeof RequestLogger.info, warn: typeof RequestLogger.warn, error: typeof RequestLogger.error, debug: typeof RequestLogger.debug, getCurrentContext: typeof RequestLogger.getCurrentContext, getRequestLogs: typeof RequestLogger.getRequestLogs, clearContext: typeof RequestLogger.clearContext, run: typeof RequestLogger.run;
