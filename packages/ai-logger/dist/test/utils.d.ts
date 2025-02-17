import React from 'react';
import { RenderOptions, RenderResult } from '@testing-library/react';
import type { LogEntry } from '../types';
interface LoggerRenderOptions extends Omit<RenderOptions, 'wrapper'> {
    requestId?: string;
    onError?: (error: Error, logs: LogEntry[]) => void;
}
interface LoggerRenderResult extends Omit<RenderResult, 'unmount'> {
    getLogs: () => LogEntry[];
    unmount: () => Promise<void>;
    container: HTMLElement;
}
export declare function renderWithLogger(ui: React.ReactElement, options?: LoggerRenderOptions): LoggerRenderResult;
export declare function waitForStateUpdate(timeout?: number): Promise<void>;
export {};
