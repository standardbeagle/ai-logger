import type { LogEntry, LoggerOptions, RequestContext } from './types';
export declare class RequestLogger {
    private static storage;
    private static defaultLogLevel;
    static setDefaultLogLevel(level: LogEntry['level']): void;
    static createContext(options: LoggerOptions): RequestContext;
    static getCurrentContext(): RequestContext | undefined;
    static log(level: LogEntry['level'], message: string, metadata?: Record<string, unknown>): LogEntry;
    static info(message: string, metadata?: Record<string, unknown>): LogEntry;
    static warn(message: string, metadata?: Record<string, unknown>): LogEntry;
    static error(message: string, metadata?: Record<string, unknown>): LogEntry;
    static debug(message: string, metadata?: Record<string, unknown>): LogEntry;
    static getRequestLogs(): LogEntry[];
    static run<T>(options: LoggerOptions, fn: () => Promise<T> | T): Promise<T>;
    static clearContext(): void;
}
