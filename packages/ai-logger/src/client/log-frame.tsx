import React, { createContext, useContext, useCallback, useRef, useEffect, useLayoutEffect } from 'react';
import { flushSync } from 'react-dom';
import type { LogEntry } from '../types';
import { useLogger } from './context';

interface FrameContextType {
  frameId: string;
  parentFrameId?: string;
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId' | 'metadata'>) => void;
}

const FrameContext = createContext<FrameContextType | null>(null);

interface LogFrameProps {
  children: React.ReactNode;
  name: string;
  metadata?: Record<string, unknown>;
}

// Frame tracking
const frameCounter = {
  count: 0,
  reset() { this.count = 0; },
  next() { return `frame-${this.count++}`; }
};

export function LogFrame({ children, name, metadata = {} }: LogFrameProps) {
  const logger = useLogger();
  const parentFrame = useContext(FrameContext);
  
  // Create frame ID synchronously
  const frameRef = useRef<string>();
  if (!frameRef.current) {
    frameRef.current = frameCounter.next();
  }
  const frameId = frameRef.current;

  // Store metadata ref to prevent updates
  const metadataRef = useRef(metadata);
  metadataRef.current = metadata;

  // Track frame hierarchy
  const frameContext = React.useMemo(() => ({
    frameId,
    parentFrameId: parentFrame?.frameId,
    // Log with frame context
    addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId' | 'metadata'>) => {
      logger.info(entry.message, {
        ...entry,
        frameId,
        parentFrameId: parentFrame?.frameId,
        ...metadataRef.current
      });
    }
  }), [frameId, parentFrame?.frameId, logger]);

  // Track mounting state
  const mountedRef = useRef(false);

  // Log frame lifecycle
  useLayoutEffect(() => {
    // If parent frame exists, delay logging until next tick to ensure parent logs first
    if (parentFrame) {
      Promise.resolve().then(() => {
        frameContext.addLog({
          level: 'info',
          message: `Enter frame: ${name}`
        });
        mountedRef.current = true;
      });
    } else {
      // No parent frame, log immediately
      frameContext.addLog({
        level: 'info',
        message: `Enter frame: ${name}`
      });
      mountedRef.current = true;
    }

    return () => {
      if (mountedRef.current) {
        frameContext.addLog({
          level: 'info',
          message: `Exit frame: ${name}`
        });
      }
    };
  }, [frameContext, name, parentFrame]);

  return (
    <FrameContext.Provider value={frameContext}>
      {children}
    </FrameContext.Provider>
  );
}

export function useLogFrame() {
  const frame = useContext(FrameContext);
  if (!frame) {
    throw new Error('useLogFrame must be used within a LogFrame');
  }

  const { frameId, parentFrameId, addLog } = frame;

  return {
    frameId,
    parentFrameId,
    info: (message: string, metadata?: Record<string, unknown>) => 
      addLog({ level: 'info', message, ...metadata }),
    warn: (message: string, metadata?: Record<string, unknown>) => 
      addLog({ level: 'warn', message, ...metadata }),
    error: (message: string, metadata?: Record<string, unknown>) => 
      addLog({ level: 'error', message, ...metadata }),
    debug: (message: string, metadata?: Record<string, unknown>) => 
      addLog({ level: 'debug', message, ...metadata })
  };
}

interface WithLoggingOptions {
  name: string;
  metadata?: Record<string, unknown>;
}

export function withLogging<P extends object>(
  Component: React.ComponentType<P>,
  options: WithLoggingOptions
) {
  return function WrappedComponent(props: P) {
    return (
      <LogFrame name={options.name} metadata={options.metadata}>
        <Component {...props} />
      </LogFrame>
    );
  };
}

// Testing utilities
export const __test__ = {
  resetFrameCounter: () => frameCounter.reset()
};