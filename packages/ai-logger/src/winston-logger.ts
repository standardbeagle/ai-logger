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
    silent: process.env.NODE_ENV === 'test'
  };

  static getInstance(options?: WinstonLoggerOptions): winston.Logger {
    if (!WinstonLogger.instance) {
      WinstonLogger.initialize(options);
    }
    return WinstonLogger.instance;
  }

  private static initialize(options?: WinstonLoggerOptions) {
    const opts = { ...WinstonLogger.defaultOptions, ...options };
    const fileFormat = combine(
      timestamp(),
      json()
    );

    const consoleFormat = combine(
      colorize(),
      timestamp(),
      printf(({ level, message, timestamp, ...metadata }) => {
        return `${timestamp} ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
      })
    );

    const transports: winston.transport[] = [
      new winston.transports.Console({
        format: consoleFormat,
        level: opts.logLevel
      })
    ];

    if (opts.logPath) {
      transports.push(
        new winston.transports.File({
          filename: opts.logPath,
          format: fileFormat,
          level: 'error'
        })
      );
    }

    WinstonLogger.instance = winston.createLogger({
      level: opts.logLevel,
      silent: opts.silent,
      transports
    });
  }

  static persistLogs(entries: LogEntry[]): void {
    const logger = WinstonLogger.getInstance();
    
    entries.forEach(entry => {
      const { timestamp, level, message, metadata, requestId } = entry;
      logger.log({
        level,
        message,
        timestamp,
        requestId,
        ...metadata
      });
    });
  }

  static persistError(error: Error, metadata?: Record<string, unknown>): void {
    const logger = WinstonLogger.getInstance();
    logger.error(error.message, {
      stack: error.stack,
      ...metadata
    });
  }
}

export const getWinstonLogger = WinstonLogger.getInstance;
export const persistLogs = WinstonLogger.persistLogs;
export const persistError = WinstonLogger.persistError;