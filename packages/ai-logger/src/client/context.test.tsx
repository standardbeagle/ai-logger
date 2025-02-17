import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithLogger, waitForStateUpdate } from '../test/utils';
import { LogProvider, useLogger, __test__ } from './context';
import { uploadLogs } from './api';
import type { LogEntry } from '../types';

// Mock needs to be before imports
vi.mock('./api', () => ({
  uploadLogs: vi.fn().mockResolvedValue(undefined)
}));

describe('LogProvider', () => {
  let consoleError: typeof console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear logs before each test
    __test__.clearLogs();
    // Suppress React error boundary logs
    consoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = consoleError;
  });

  test('super basic', async () => {
    const { unmount } = renderWithLogger(<div/>);
    await unmount();
  });

  test('provides logging context', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        void logger.info('Test log', { test: true });
      }, [logger]);
      return <div/>;
    }

    const { getLogs, unmount } = renderWithLogger(<TestComponent />);
    
    await waitForStateUpdate();
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: 'info',
      message: 'Test log',
      metadata: { test: true }
    });

    await unmount();
  });

  test('uploads logs on error', async () => {
    const onError = vi.fn();
    const testError = new Error('Test error');
    const uploadLogsMock = vi.mocked(uploadLogs);
    uploadLogsMock.mockResolvedValue(undefined);

    function ErrorComponent(): JSX.Element {
      const logger = useLogger();
      
      // Throw error synchronously during render
      if (!React.useRef(false).current) {
        React.useRef(false).current = true;
        void logger.info('Before error');
        throw testError;
      }
      return <div/>;
    }

    try {
      renderWithLogger(<ErrorComponent />, { onError });
    } catch (err) {
      expect(err).toBe(testError);
    }

    // Wait for error handling to complete
    await waitForStateUpdate(200);

    expect(onError).toHaveBeenCalledWith(
      testError,
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          message: 'Before error'
        })
      ])
    );

    expect(uploadLogsMock).toHaveBeenCalledTimes(1);
    const uploadedLogs = uploadLogsMock.mock.calls[0][0];
    expect(uploadedLogs).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          level: 'info',
          message: 'Before error'
        })
      ])
    );
  });

  test('maintains unique request IDs', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        void logger.info('Component rendered');
      }, [logger]);
      return <div/>;
    }

    // Create providers with explicit request IDs
    const requestId1 = 'request-1';
    const requestId2 = 'request-2';

    const { unmount: unmount1 } = renderWithLogger(
      <LogProvider requestId={requestId1}>
        <TestComponent />
      </LogProvider>
    );

    await waitForStateUpdate();

    const { unmount: unmount2 } = renderWithLogger(
      <LogProvider requestId={requestId2}>
        <TestComponent />
      </LogProvider>
    );

    await waitForStateUpdate();

    // Get logs from store
    const allLogs = __test__.getLogs();
    const requestIds = allLogs.map((log: LogEntry) => log.requestId);

    expect(requestIds).toContain(requestId1);
    expect(requestIds).toContain(requestId2);

    await unmount1();
    await unmount2();
  });

  test('preserves log order', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        void Promise.resolve().then(async () => {
          await logger.info('First log');
          await logger.warn('Second log');
          await logger.error('Third log');
        });
      }, [logger]);
      return <div/>;
    }

    const { getLogs, unmount } = renderWithLogger(<TestComponent />);
    await waitForStateUpdate(200); // Wait longer for async logs
    
    const logs = getLogs();
    expect(logs.map((l: LogEntry) => l.message)).toEqual([
      'First log',
      'Second log',
      'Third log'
    ]);
    expect(logs.map((l: LogEntry) => l.level)).toEqual([
      'info',
      'warn',
      'error'
    ]);

    await unmount();
  });
});