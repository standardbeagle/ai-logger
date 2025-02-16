import { AsyncLocalStorage } from 'async_hooks';
import type { LogEntry, LoggerOptions, RequestContext } from './types';

export class RequestLogger {
  private static storage = new AsyncLocalStorage<RequestContext>();
  private static defaultLogLevel: LogEntry['level'] = 'info';

  static setDefaultLogLevel(level: LogEntry['level']) {
    RequestLogger.defaultLogLevel = level;
  }

  static createContext(options: LoggerOptions): RequestContext {
    return {
      requestId: options.requestId,
      startTime: new Date(),
      logs: []
    };
  }

  static getCurrentContext(): RequestContext | undefined {
    return RequestLogger.storage.getStore();
  }

  static log(level: LogEntry['level'], message: string, metadata?: Record<string, unknown>) {
    const context = RequestLogger.getCurrentContext();
    if (!context) {
      throw new Error('No logging context found. Ensure logging is initialized for this request.');
    }

    const entry: LogEntry = {
      timestamp: new Date(),
      level,
      message,
      metadata,
      requestId: context.requestId
    };

    context.logs.push(entry);
    return entry;
  }

  static info(message: string, metadata?: Record<string, unknown>) {
    return RequestLogger.log('info', message, metadata);
  }

  static warn(message: string, metadata?: Record<string, unknown>) {
    return RequestLogger.log('warn', message, metadata);
  }

  static error(message: string, metadata?: Record<string, unknown>) {
    return RequestLogger.log('error', message, metadata);
  }

  static debug(message: string, metadata?: Record<string, unknown>) {
    return RequestLogger.log('debug', message, metadata);
  }

  static getRequestLogs(): LogEntry[] {
    const context = RequestLogger.getCurrentContext();
    if (!context) {
      return [];
    }
    return [...context.logs];
  }

  static async run<T>(
    options: LoggerOptions,
    fn: () => Promise<T> | T
  ): Promise<T> {
    const context = RequestLogger.createContext(options);
    return RequestLogger.storage.run(context, fn);
  }

  static clearContext() {
    const context = RequestLogger.getCurrentContext();
    if (context) {
      context.logs = [];
    }
  }
}