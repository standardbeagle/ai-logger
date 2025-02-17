import React from 'react';
import { render, RenderOptions, RenderResult, act } from '@testing-library/react';
import { LogProvider } from '../client/context';
import type { LogEntry } from '../types';
import { __test__ as contextTest } from '../client/context';

interface WrapperProps {
  children: React.ReactNode;
}

interface LoggerRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  requestId?: string;
  onError?: (error: Error, logs: LogEntry[]) => void;
}

interface LoggerRenderResult extends Omit<RenderResult, 'unmount'> {
  getLogs: () => LogEntry[];
  unmount: () => Promise<void>;
  container: HTMLElement;
}

// Global log queue with promise-based handling
const logQueue: LogEntry[] = [];
let logPromise = Promise.resolve();
let isProcessingLogs = false;

async function processLogQueue(): Promise<void> {
  if (isProcessingLogs) return;
  isProcessingLogs = true;
  try {
    await logPromise;
  } finally {
    isProcessingLogs = false;
  }
}

function safeAct<T>(callback: () => T | Promise<T>): T {
  let result: T;
  act(() => {
    const maybePromise = callback();
    if (maybePromise instanceof Promise) {
      throw new Error('Synchronous act() received a promise; use await act() instead');
    }
    result = maybePromise;
  });
  return result!;
}

export function renderWithLogger(
  ui: React.ReactElement,
  options: LoggerRenderOptions = {}
): LoggerRenderResult {
  const { requestId, onError, ...renderOptions } = options;

  // Create wrapper with logging context
  const Wrapper = ({ children }: WrapperProps): JSX.Element => (
    <LogProvider 
      requestId={requestId} 
      onError={onError}
      onLog={(log: LogEntry) => {
        logQueue.push(log);
        logPromise = logPromise.then(() => Promise.resolve());
      }}
    >
      {children}
    </LogProvider>
  );

  const result = safeAct(() => 
    render(ui, {
      wrapper: Wrapper,
      ...renderOptions
    })
  );

  return {
    ...result,
    getLogs: () => {
      const currentLogs = [...logQueue];
      logQueue.length = 0;
      return currentLogs;
    },
    unmount: async () => {
      let unmountError: Error | undefined;
      await act(async () => {
        try {
          result.unmount();
          await waitForStateUpdate();
        } catch (error) {
          unmountError = error as Error;
        }
      });
      if (unmountError) throw unmountError;
    }
  };
}

// Helper to wait for state updates and effects
export async function waitForStateUpdate(timeout = 100): Promise<void> {
  try {
    await act(async () => {
      // Wait for any pending log operations
      await processLogQueue();
      // Wait for React effects and async operations
      await new Promise(resolve => setTimeout(resolve, timeout));
    });
  } catch (error) {
    if (error instanceof Error && 
        error.message !== 'Should not already be working.' &&
        !error.message.includes('nested act')) {
      console.error('Error in waitForStateUpdate:', error);
      throw error;
    }
    // Ignore React concurrent mode warnings
  }
}

// Cleanup before each test
beforeEach(() => {
  contextTest.clearLogs();
  logQueue.length = 0;
  logPromise = Promise.resolve();
  isProcessingLogs = false;
});