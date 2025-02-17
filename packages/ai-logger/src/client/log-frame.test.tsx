import React from 'react';
import { describe, test, expect, vi, beforeEach } from 'vitest';
import { renderWithLogger, waitForStateUpdate } from '../test/utils';
import { LogFrame, useLogFrame, withLogging, __test__ } from './log-frame';
import { __test__ as contextTest } from './context';
import type { LogEntry } from '../types';

describe('LogFrame', () => {
  let consoleError: typeof console.error;

  beforeEach(() => {
    vi.clearAllMocks();
    // Clear logs and reset frame counter
    contextTest.clearLogs();
    __test__.resetFrameCounter();
    // Suppress React error boundary logs
    consoleError = console.error;
    console.error = vi.fn();
  });

  afterEach(() => {
    console.error = consoleError;
  });

  test('creates nested logging context', async () => {
    const frames: { frameId: string; parentFrameId?: string }[] = [];
    
    function TestComponent(): JSX.Element {
      const frameLogger = useLogFrame();
      React.useEffect(() => {
        frames.push({
          frameId: frameLogger.frameId,
          parentFrameId: frameLogger.parentFrameId
        });
      }, [frameLogger.frameId, frameLogger.parentFrameId]);
      return <div/>;
    }

    const { unmount } = renderWithLogger(
      <LogFrame name="parent">
        <TestComponent />
        <LogFrame name="child">
          <TestComponent />
        </LogFrame>
      </LogFrame>
    );

    await waitForStateUpdate();
    expect(frames).toHaveLength(2);
    expect(frames[0].parentFrameId).toBeUndefined();
    expect(frames[1].parentFrameId).toBe(frames[0].frameId);

    unmount();
  });

  test('logs frame entry and exit', async () => {
    const { getLogs, unmount } = renderWithLogger(
      <LogFrame name="test-frame" metadata={{ custom: 'value' }}>
        <div>Test content</div>
      </LogFrame>
    );

    await waitForStateUpdate();
    
    // Check enter logs
    const logs = getLogs();
    const enterLogs = logs.filter(log => 
      log.message.includes('Enter frame: test-frame')
    );
    expect(enterLogs).toHaveLength(1);
    expect(enterLogs[0].metadata).toMatchObject({
      custom: 'value',
      frameId: 'frame-0'
    });

    // Unmount to trigger exit logs
    unmount();
    await waitForStateUpdate();
    
    // Check exit logs
    const exitLogs = getLogs().filter(log => 
      log.message.includes('Exit frame: test-frame')
    );
    expect(exitLogs).toHaveLength(1);
    expect(exitLogs[0].metadata).toMatchObject({
      custom: 'value',
      frameId: 'frame-0'
    });
  });

  test('wraps component with LogFrame using HOC', async () => {
    function TestComponent(): JSX.Element {
      const frameLogger = useLogFrame();
      React.useEffect(() => {
        frameLogger.info('Component mounted');
      }, [frameLogger]);
      return <div>Test</div>;
    }

    const WrappedComponent = withLogging(TestComponent, {
      name: 'TestComponent',
      metadata: { type: 'test' }
    });

    const { container, getLogs } = renderWithLogger(<WrappedComponent />);
    await waitForStateUpdate();
    
    expect(container.textContent).toBe('Test');
    
    const logs = getLogs();
    expect(logs.some(log => log.message === 'Component mounted')).toBe(true);
    expect(logs.some(log => log.message === 'Enter frame: TestComponent')).toBe(true);
  });

  test('throws when useLogFrame used outside LogFrame', () => {
    function TestComponent(): JSX.Element {
      useLogFrame();
      return <div/>;
    }

    expect(() => {
      const { unmount } = renderWithLogger(<TestComponent />);
      unmount();
    }).toThrow('useLogFrame must be used within a LogFrame');
  });

  test('handles nested logging calls', async () => {
    function TestComponent(): JSX.Element {
      const frameLogger = useLogFrame();
      React.useEffect(() => {
        frameLogger.info('Test log');
      }, [frameLogger]);
      return <div/>;
    }

    const { getLogs, unmount } = renderWithLogger(
      <LogFrame name="outer">
        <LogFrame name="inner">
          <TestComponent />
        </LogFrame>
      </LogFrame>
    );

    await waitForStateUpdate();
    const logs = getLogs();
    
    // Check enter log sequence
    const enterFrameLogs = logs
      .filter(log => log.message.startsWith('Enter frame:'))
      .map(log => log.message.replace('Enter frame: ', ''));

    expect(enterFrameLogs).toEqual(['outer', 'inner']);

    // Check frame hierarchy
    const innerFrameLog = logs.find(log => log.message === 'Enter frame: inner');
    expect(innerFrameLog?.metadata).toMatchObject({
      frameId: 'frame-1',
      parentFrameId: 'frame-0'
    });

    unmount();
  });
});