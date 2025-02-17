import React from 'react';
import { render, RenderOptions, RenderResult, act } from '@testing-library/react';
import { LogProvider } from '../client/context';
import type { LogEntry } from '../types';

interface WrapperProps {
  children: React.ReactNode;
}

interface LoggerRenderOptions extends Omit<RenderOptions, 'wrapper'> {
  requestId?: string;
  onError?: (error: Error, logs: LogEntry[]) => void;
}

interface LoggerRenderResult extends RenderResult {
  getLogs: () => LogEntry[];
}

// Keep logs between renders in the same test
let testLogs: LogEntry[] = [];

export function renderWithLogger(
  ui: React.ReactElement,
  options: LoggerRenderOptions = {}
): LoggerRenderResult {
  const { requestId, onError, ...renderOptions } = options;

  // Create wrapper with logging context
  const Wrapper = ({ children }: WrapperProps) => (
    <LogProvider 
      requestId={requestId} 
      onError={onError}
      onLog={(log) => testLogs.push(log)}
    >
      {children}
    </LogProvider>
  );

  const result = render(ui, {
    wrapper: Wrapper,
    ...renderOptions
  });

  return {
    ...result,
    getLogs: () => {
      const currentLogs = [...testLogs];
      // Clear logs for next read
      testLogs = [];
      return currentLogs;
    }
  };
}

// Helper to wait for state updates and effects
export async function waitForStateUpdate(timeout = 100) {
  try {
    // Run a synchronous act to flush effects
    await act(async () => {
      await new Promise(resolve => setTimeout(resolve, 0));
    });
  } catch (err) {
    console.error('Error in waitForStateUpdate:', err);
    throw err;
  }
}

// Clear test logs before each test
beforeEach(() => {
  testLogs = [];
});