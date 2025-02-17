import winston from 'winston';
import type { LogEntry } from './types';
interface WinstonLoggerOptions {
    logPath?: string;
    logLevel?: string;
    silent?: boolean;
}
declare class WinstonLogger {
    private static instance;
    private static defaultOptions;
    static getInstance(options?: WinstonLoggerOptions): winston.Logger;
    private static initialize;
    static persistLogs(entries: LogEntry[]): Promise<void>;
    static persistError(error: Error, metadata?: Record<string, unknown>): void;
}
export declare const getWinstonLogger: typeof WinstonLogger.getInstance;
export declare const persistLogs: typeof WinstonLogger.persistLogs;
export declare const persistError: typeof WinstonLogger.persistError;
export {};
