import winston from 'winston';
import type { LogEntry } from './types';

const { combine, timestamp, json, printf, colorize } = winston.format;

interface WinstonLoggerOptions {
  logPath?: string;
  logLevel?: string;
  silent?: boolean;
}

class WinstonLogger {
  private static instance: winston.Logger;
  private static defaultOptions: WinstonLoggerOptions = {
    logPath: 'logs/error.log',
    logLevel: 'info',
    silent: false // Removed test env check
  };

  static getInstance(options?: WinstonLoggerOptions): winston.Logger {
    if (!WinstonLogger.instance) {
      WinstonLogger.initialize(options);
    }
    return WinstonLogger.instance;
  }

  private static initialize(options?: WinstonLoggerOptions): void {
    const opts = { ...WinstonLogger.defaultOptions, ...options };
    
    try {
      const fileFormat = combine(
        timestamp(),
        json()
      );

      const consoleFormat = combine(
        colorize(),
        timestamp(),
        printf(({ level, message, timestamp, ...metadata }) => {
          return `${timestamp} ${level}: ${message} ${
            Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''
          }`;
        })
      );

      const transports: winston.transport[] = [
        new winston.transports.Console({
          format: consoleFormat,
          level: opts.logLevel,
          handleExceptions: true,
          handleRejections: true
        })
      ];

      if (opts.logPath) {
        transports.push(
          new winston.transports.File({
            filename: opts.logPath,
            format: fileFormat,
            level: 'error',
            handleExceptions: true,
            handleRejections: true,
            maxsize: 5242880, // 5MB
            maxFiles: 5,
            tailable: true
          })
        );
      }

      WinstonLogger.instance = winston.createLogger({
        level: opts.logLevel,
        silent: opts.silent,
        transports,
        exitOnError: false
      });

      transports.forEach(transport => {
        transport.on('error', (err: Error) => {
          console.error('Winston transport error:', err);
          if (transport instanceof winston.transports.File) {
            console.error('File transport error - falling back to console');
          }
        });
      });

    } catch (error) {
      console.error('Failed to initialize logger:', error);
      WinstonLogger.instance = winston.createLogger({
        transports: [
          new winston.transports.Console({
            level: 'info',
            handleExceptions: true,
            handleRejections: true
          })
        ]
      });
    }
  }

  static async persistLogs(entries: LogEntry[]): Promise<void> {
    const logger = WinstonLogger.getInstance();
    
    try {
      await Promise.all(entries.map(entry => {
        const { timestamp, level, message, metadata, requestId } = entry;
        return new Promise<void>((resolve, reject) => {
          logger.log(level, message, {
            timestamp,
            requestId,
            ...metadata
          }, (err: Error | undefined) => {
            if (err) reject(err);
            else resolve();
          });
        });
      }));
    } catch (error) {
      console.error('Failed to persist logs:', error);
      throw error;
    }
  }

  static persistError(error: Error, metadata?: Record<string, unknown>): void {
    const logger = WinstonLogger.getInstance();
    logger.error({
      message: error.message,
      error: {
        name: error.name,
        stack: error.stack
      },
      ...metadata
    });
  }
}

export const getWinstonLogger = WinstonLogger.getInstance;
export const persistLogs = WinstonLogger.persistLogs;
export const persistError = WinstonLogger.persistError;