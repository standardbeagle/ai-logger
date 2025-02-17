import React, { createContext, useContext, useCallback, useRef, useEffect } from 'react';
import type { LogEntry } from '../types';
import { uploadLogs } from './api';

interface LoggerContextType {
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => Promise<void>;
  getRequestId: () => string;
}

const LoggerContext = createContext<LoggerContextType | null>(null);

interface LogProviderProps {
  children: React.ReactNode;
  requestId?: string;
  onError?: (error: Error, logs: LogEntry[]) => void;
  onLog?: (log: LogEntry) => void;
}

// Global store for logs with async handling
const store = {
  logs: [] as LogEntry[],
  queue: Promise.resolve(),
  clear() {
    this.logs = [];
    this.queue = Promise.resolve();
  },
  async addLog(log: LogEntry): Promise<void> {
    await (this.queue = this.queue.then(() => {
      this.logs.push(log);
      return Promise.resolve();
    }));
  },
  getLogs() {
    return [...this.logs];
  }
};

export function LogProvider({
  children,
  requestId = crypto.randomUUID(),
  onError,
  onLog
}: LogProviderProps): JSX.Element {
  // Store logs in ref to prevent re-renders and maintain across error boundaries
  const logsRef = useRef<LogEntry[]>([]);
  const processingError = useRef<boolean>(false);

  useEffect(() => {
    return () => {
      logsRef.current = [];
    };
  }, []);

  const addLog = useCallback(async (entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => {
    const newLog = {
      ...entry,
      timestamp: new Date(),
      requestId
    };

    // Add to local logs immediately
    logsRef.current.push(newLog);

    // Handle logging output
    if (onLog) {
      await Promise.resolve().then(() => onLog(newLog));
    } else {
      await store.addLog(newLog);
    }
  }, [requestId, onLog]);

  const getRequestId = useCallback(() => requestId, [requestId]);

  const handleError = useCallback(async (error: Error) => {
    // Prevent recursive error handling
    if (processingError.current) {
      throw error;
    }

    processingError.current = true;
    try {
      // Get logs before doing anything that might fail
      const currentLogs = [...logsRef.current];

      // Add error log
      await addLog({
        level: 'error',
        message: 'Error caught by error boundary',
        metadata: {
          error: error.message,
          stack: error.stack
        }
      });

      // Try to upload logs
      try {
        await uploadLogs(currentLogs);
      } catch (uploadError) {
        console.error('Failed to upload logs:', uploadError);
      }

      // Notify error handler
      if (onError) {
        await Promise.resolve().then(() => onError(error, currentLogs));
      }
    } finally {
      processingError.current = false;
    }
    
    // Re-throw the original error
    throw error;
  }, [addLog, onError]);

  const value = React.useMemo(() => ({
    addLog,
    getRequestId
  }), [addLog, getRequestId]);

  return (
    <LoggerContext.Provider value={value}>
      <ErrorBoundary onError={handleError}>
        {children}
      </ErrorBoundary>
    </LoggerContext.Provider>
  );
}

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onError: (error: Error) => Promise<void>;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError(): { hasError: boolean } {
    return { hasError: true };
  }

  componentDidCatch(error: Error): void {
    // Handle the error asynchronously
    void this.props.onError(error).catch(handlerError => {
      console.error('Error in error boundary handler:', handlerError);
    });
  }

  render(): React.ReactNode {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

interface Logger {
  info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
  getRequestId: () => string;
}

export function useLogger(): Logger {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }
  const { addLog, getRequestId } = context;

  const createLogMethod = useCallback(
    (level: LogEntry['level']) =>
      (message: string, metadata?: Record<string, unknown>) => 
        addLog({ level, message, metadata }),
    [addLog]
  );

  return React.useMemo(() => ({
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),
    debug: createLogMethod('debug'),
    getRequestId
  }), [createLogMethod, getRequestId]);
}

// Testing utilities
export const __test__ = {
  getLogs: () => store.getLogs(),
  clearLogs: () => {
    store.clear();
  }
};