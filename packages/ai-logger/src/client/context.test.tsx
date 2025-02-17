import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithLogger, waitForStateUpdate } from '../test/utils';
import { LogProvider, useLogger, __test__ } from './context';
import { uploadLogs } from './api';

// Mock the upload function
vi.mock('./api', () => ({
  uploadLogs: vi.fn().mockImplementation(async (logs) => {
    console.log('[uploadLogs] Mock called with logs:', logs.length);
    return Promise.resolve(undefined);
  }),
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

  test('super basic', () => {
    renderWithLogger(<div/>);
  });

  test('provides logging context', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        logger.info('Test log', { test: true });
      }, [logger]);
      return <div/>;
    }

    const { getLogs } = renderWithLogger(<TestComponent />);
    
    await waitForStateUpdate();
    const logs = getLogs();
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({
      level: 'info',
      message: 'Test log',
      metadata: { test: true }
    });
  });

  test('uploads logs on error', async () => {
    const onError = vi.fn();
    const testError = new Error('Test error');

    function ErrorComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        logger.info('Before error');
        throw testError;
      }, [logger]);
      return <div/>;
    }

    try {
      renderWithLogger(<ErrorComponent />, { onError });
      await waitForStateUpdate();
    } catch (err) {
      expect(err).toBe(testError);
      expect(onError).toHaveBeenCalledWith(
        testError,
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Before error'
          })
        ])
      );
    }
  });

  test('calls onError callback with logs', async () => {
    const onError = vi.fn();
    const testError = new Error('Test error');

    function ErrorComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        logger.info('Before error');
        throw testError;
      }, [logger]);
      return <div/>;
    }

    try {
      renderWithLogger(<ErrorComponent />, { onError });
      await waitForStateUpdate();
    } catch (err) {
      expect(err).toBe(testError);
      expect(onError).toHaveBeenCalledTimes(1);
      expect(onError).toHaveBeenCalledWith(
        testError,
        expect.arrayContaining([
          expect.objectContaining({
            level: 'info',
            message: 'Before error'
          })
        ])
      );
    }
  });

  test('maintains unique request IDs', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        logger.info('Component rendered');
      }, [logger]);
      return <div/>;
    }

    // Create two contexts with different request IDs
    renderWithLogger(
      <>
        <LogProvider requestId="request-1">
          <TestComponent />
        </LogProvider>
        <LogProvider requestId="request-2">
          <TestComponent />
        </LogProvider>
      </>
    );

    await waitForStateUpdate();

    // Get logs and check request IDs
    const logs = __test__.getLogs();
    const requestIds = logs.map(log => log.requestId);

    expect(requestIds).toContain('request-1');
    expect(requestIds).toContain('request-2');
  });

  test('preserves log order', async () => {
    function TestComponent(): JSX.Element {
      const logger = useLogger();
      React.useEffect(() => {
        logger.info('First log');
        logger.warn('Second log');
        logger.error('Third log');
      }, [logger]);
      return <div/>;
    }

    const { getLogs } = renderWithLogger(<TestComponent />);
    await waitForStateUpdate();
    
    const logs = getLogs();
    expect(logs.map(l => l.message)).toEqual([
      'First log',
      'Second log',
      'Third log'
    ]);
    expect(logs.map(l => l.level)).toEqual([
      'info',
      'warn',
      'error'
    ]);
  });
});