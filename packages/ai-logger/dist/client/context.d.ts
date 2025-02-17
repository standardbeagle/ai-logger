import React from 'react';
import type { LogEntry } from '../types';
interface LogProviderProps {
    children: React.ReactNode;
    requestId?: string;
    onError?: (error: Error, logs: LogEntry[]) => void;
    onLog?: (log: LogEntry) => void;
}
export declare function LogProvider({ children, requestId, onError, onLog }: LogProviderProps): JSX.Element;
interface Logger {
    info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    getRequestId: () => string;
}
export declare function useLogger(): Logger;
export declare const __test__: {
    getLogs: () => LogEntry[];
    clearLogs: () => void;
};
export {};
