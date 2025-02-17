import React, { createContext, useContext, useRef, useLayoutEffect } from 'react';
import type { LogEntry } from '../types';
import { useLogger } from './context';

interface FrameContextType {
  frameId: string;
  parentFrameId?: string;
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId' | 'metadata'>) => Promise<void>;
  logReady: Promise<void>;
}

const FrameContext = createContext<FrameContextType | null>(null);

interface LogFrameProps {
  children: React.ReactNode;
  name: string;
  metadata?: Record<string, unknown>;
}

// Frame tracking with type safety
const frameCounter = {
  count: 0,
  reset() { this.count = 0; },
  next() { return `frame-${this.count++}`; }
};

export function LogFrame({ children, name, metadata = {} }: LogFrameProps): JSX.Element {
  const logger = useLogger();
  const parentFrame = useContext(FrameContext);
  
  // Create frame ID synchronously
  const frameRef = useRef<string>();
  if (!frameRef.current) {
    frameRef.current = frameCounter.next();
  }
  const frameId = frameRef.current;

  // Store metadata ref to prevent updates but ensure deep equality
  const metadataRef = useRef(metadata);
  if (JSON.stringify(metadataRef.current) !== JSON.stringify(metadata)) {
    metadataRef.current = metadata;
  }

  // Create log ready promise
  const logReadyResolveRef = useRef<() => void>();
  const logReadyRef = useRef<Promise<void>>();
  if (!logReadyRef.current) {
    logReadyRef.current = new Promise(resolve => {
      logReadyResolveRef.current = resolve;
    });
  }

  // Track frame hierarchy with error handling
  const frameContext = React.useMemo(() => ({
    frameId,
    parentFrameId: parentFrame?.frameId,
    logReady: logReadyRef.current!,
    addLog: async (entry: Omit<LogEntry, 'timestamp' | 'requestId' | 'metadata'>) => {
      try {
        const combinedMetadata = {
          frameId,
          parentFrameId: parentFrame?.frameId,
          ...metadataRef.current
        };

        await logger.info(entry.message, {
          ...combinedMetadata,
          level: entry.level
        });
      } catch (error) {
        console.error('Error adding log:', error);
        await logger.error('Failed to add log entry', {
          error: error instanceof Error ? error.message : String(error),
          frameId,
          parentFrameId: parentFrame?.frameId
        });
        throw error;
      }
    }
  }), [frameId, parentFrame?.frameId, logger]);

  // Track mounting state
  const mountedRef = useRef(false);
  const logQueue = useRef<Promise<void>>(Promise.resolve());

  // Safe logging helper that ensures order
  const safeLog = React.useCallback(async (message: string, level: LogEntry['level'] = 'info') => {
    try {
      await (logQueue.current = logQueue.current.then(() => 
        frameContext.addLog({ level, message })
      ));
    } catch (error) {
      console.error('Error in safeLog:', error);
      throw error;
    }
  }, [frameContext]);

  // Log frame lifecycle with guaranteed execution order
  useLayoutEffect(() => {
    let mounted = false;
    let cleanup: (() => Promise<void>) | undefined;

    // Create enter log chain
    const enterLogPromise = (async () => {
      if (parentFrame) {
        // Wait for parent frame to log first
        await parentFrame.logReady;
      }

      if (!mounted) {
        mounted = true;
        await safeLog(`Enter frame: ${name}`);
        mountedRef.current = true;
        // Signal that this frame has logged
        logReadyResolveRef.current?.();
      }
    })();

    // Setup cleanup
    cleanup = async () => {
      if (mountedRef.current) {
        await safeLog(`Exit frame: ${name}`).catch(error => {
          console.error('Error during frame cleanup:', error);
        });
        mountedRef.current = false;
      }
    };

    // Handle any enter log errors
    void enterLogPromise.catch(error => {
      console.error('Error during frame entry:', error);
    });

    return () => {
      void cleanup?.();
    };
  }, [name, safeLog, parentFrame]);

  return (
    <FrameContext.Provider value={frameContext}>
      {children}
    </FrameContext.Provider>
  );
}

export function useLogFrame(): {
  frameId: string;
  parentFrameId?: string;
  info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
} {
  const frame = useContext(FrameContext);
  
  // Throw synchronously during render
  if (!frame) {
    const error = new Error('useLogFrame must be used within a LogFrame');
    error.name = 'LogFrameError';
    throw error;
  }

  const { frameId, parentFrameId, addLog } = frame;

  return React.useMemo(() => ({
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
  }), [frameId, parentFrameId, addLog]);
}

interface WithLoggingOptions {
  name: string;
  metadata?: Record<string, unknown>;
}

export function withLogging<P extends object>(
  Component: React.ComponentType<P>,
  options: WithLoggingOptions
): React.FC<P> {
  const displayName = Component.displayName || Component.name || 'Component';
  const WrappedComponent: React.FC<P> = (props) => (
    <LogFrame name={options.name} metadata={options.metadata}>
      <Component {...props} />
    </LogFrame>
  );
  WrappedComponent.displayName = `WithLogging(${displayName})`;
  return WrappedComponent;
}

// Testing utilities
export const __test__ = {
  resetFrameCounter: () => frameCounter.reset()
};