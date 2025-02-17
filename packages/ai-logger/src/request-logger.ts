import { AsyncLocalStorage } from 'async_hooks';
import { persistLogs } from './winston-logger';
import type { LogEntry, LoggerOptions, RequestContext } from './types';

export class RequestLogger {
  private static storage = new AsyncLocalStorage<RequestContext>();
  private static defaultLogLevel: LogEntry['level'] = 'info';

  static setDefaultLogLevel(level: LogEntry['level']): void {
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

  static log(level: LogEntry['level'], message: string, metadata?: Record<string, unknown>): LogEntry {
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

  static info(message: string, metadata?: Record<string, unknown>): LogEntry {
    return RequestLogger.log('info', message, metadata);
  }

  static warn(message: string, metadata?: Record<string, unknown>): LogEntry {
    return RequestLogger.log('warn', message, metadata);
  }

  static error(message: string, metadata?: Record<string, unknown>): LogEntry {
    return RequestLogger.log('error', message, metadata);
  }

  static debug(message: string, metadata?: Record<string, unknown>): LogEntry {
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
    const parentContext = RequestLogger.getCurrentContext();

    let result: T;
    try {
      // Create new context
      result = await RequestLogger.storage.run(context, async () => {
        try {
          // Log context creation if nested
          if (parentContext) {
            RequestLogger.debug('Created nested logging context', {
              parentRequestId: parentContext.requestId,
              childRequestId: context.requestId
            });
          }

          const fnResult = await Promise.resolve(fn());

          // If we get here, the function completed successfully
          // Merge logs into parent if nested
          if (parentContext) {
            parentContext.logs.push(
              ...context.logs.map(log => ({
                ...log,
                metadata: {
                  ...log.metadata,
                  parentRequestId: parentContext.requestId
                }
              }))
            );
          }

          return fnResult;
        } catch (error) {
          // Log the error
          RequestLogger.error('Error in logging context', {
            error: error instanceof Error ? error.message : String(error),
            stack: error instanceof Error ? error.stack : undefined
          });

          // Persist logs before throwing
          await persistLogs(context.logs);

          throw error;
        }
      });

      return result;
    } catch (error) {
      // Error was already handled and logs were persisted in inner catch
      throw error;
    }
  }

  static clearContext(): void {
    const context = RequestLogger.getCurrentContext();
    if (context) {
      // Create empty context to clear the current one
      const emptyContext: RequestContext = {
        requestId: 'cleanup',
        startTime: new Date(),
        logs: []
      };
      
      // Run with empty context to clear the current one
      RequestLogger.storage.run(emptyContext, () => {
        context.logs = [];
      });
    }
  }
}