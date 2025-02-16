import React, { createContext, useContext, useCallback, useEffect } from 'react';
import { useLogger } from './context';
import type { LogEntry } from '../types';

interface LogFrameContextType {
  frameId: string;
  parentFrameId?: string;
}

const LogFrameContext = createContext<LogFrameContextType | null>(null);

interface LogFrameProps {
  children: React.ReactNode;
  name: string;
  metadata?: Record<string, unknown>;
}

export function LogFrame({ children, name, metadata }: LogFrameProps) {
  const logger = useLogger();
  const parentFrame = useContext(LogFrameContext);
  const frameId = React.useMemo(() => crypto.randomUUID(), []);

  // Log frame entry when mounted
  useEffect(() => {
    logger.debug(`Enter frame: ${name}`, {
      frameId,
      parentFrameId: parentFrame?.frameId,
      frameName: name,
      ...metadata
    });

    return () => {
      logger.debug(`Exit frame: ${name}`, {
        frameId,
        parentFrameId: parentFrame?.frameId,
        frameName: name,
        ...metadata
      });
    };
  }, [frameId, name, metadata, logger, parentFrame?.frameId]);

  const frameContext = React.useMemo(
    () => ({
      frameId,
      parentFrameId: parentFrame?.frameId
    }),
    [frameId, parentFrame?.frameId]
  );

  return (
    <LogFrameContext.Provider value={frameContext}>
      {children}
    </LogFrameContext.Provider>
  );
}

interface WithLoggingOptions {
  name: string;
  metadata?: Record<string, unknown>;
}

export function withLogging<P extends object>(
  Component: React.ComponentType<P>,
  options: WithLoggingOptions
) {
  return function WrappedWithLogging(props: P) {
    return (
      <LogFrame name={options.name} metadata={options.metadata}>
        <Component {...props} />
      </LogFrame>
    );
  };
}

export function useLogFrame() {
  const frame = useContext(LogFrameContext);
  const logger = useLogger();

  if (!frame) {
    throw new Error('useLogFrame must be used within a LogFrame');
  }

  const log = useCallback(
    (level: LogEntry['level'], message: string, metadata?: Record<string, unknown>) => {
      logger[level](message, {
        frameId: frame.frameId,
        parentFrameId: frame.parentFrameId,
        ...metadata
      });
    },
    [logger, frame]
  );

  return {
    frameId: frame.frameId,
    parentFrameId: frame.parentFrameId,
    info: (message: string, metadata?: Record<string, unknown>) =>
      log('info', message, metadata),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      log('warn', message, metadata),
    error: (message: string, metadata?: Record<string, unknown>) =>
      log('error', message, metadata),
    debug: (message: string, metadata?: Record<string, unknown>) =>
      log('debug', message, metadata)
  };
}