import React, { createContext, useContext, useCallback, useRef } from 'react';
import type { LogEntry } from '../types';
import { uploadLogs } from './api';

interface LoggerContextType {
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => void;
  getRequestId: () => string;
}

const LoggerContext = createContext<LoggerContextType | null>(null);

interface LogProviderProps {
  children: React.ReactNode;
  requestId?: string;
  onError?: (error: Error, logs: LogEntry[]) => void;
  onLog?: (log: LogEntry) => void;
}

// Global store for logs
const store = {
  logs: [] as LogEntry[],
  clear() {
    this.logs = [];
  },
  addLog(log: LogEntry) {
    this.logs.push(log);
  },
  getLogs() {
    return [...this.logs];
  }
};

// Track logs per request ID
const requestLogs = new Map<string, LogEntry[]>();

export function LogProvider({ 
  children, 
  requestId = crypto.randomUUID(),
  onError,
  onLog 
}: LogProviderProps) {
  // Initialize request logs storage
  const logsRef = useRef<LogEntry[]>([]);
  
  React.useLayoutEffect(() => {
    // Create new log array for this request
    requestLogs.set(requestId, logsRef.current);
    return () => {
      requestLogs.delete(requestId);
    };
  }, [requestId]);
  
  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => {
    const newLog = {
      ...entry,
      timestamp: new Date(),
      requestId
    };

    // Add to request logs immediately
    logsRef.current.push(newLog);

    // Handle logging output
    if (onLog) {
      onLog(newLog);
    } else {
      store.addLog(newLog);
    }
  }, [requestId, onLog]);

  const getRequestId = useCallback(() => requestId, [requestId]);

  const handleError = useCallback((error: Error) => {
    try {
      // Get current logs synchronously
      const currentLogs = logsRef.current;

      // Upload logs (no await since this is synchronous error handling)
      void uploadLogs(currentLogs);
      
      // Notify error handler
      if (onError) {
        onError(error, currentLogs);
      }
    } catch (uploadError) {
      console.error('Failed to upload logs:', uploadError);
    }
    throw error;
  }, [onError]);

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
  onError: (error: Error) => void;
}

class ErrorBoundary extends React.Component<
  ErrorBoundaryProps,
  { hasError: boolean }
> {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error: Error) {
    this.props.onError(error);
  }

  render() {
    if (this.state.hasError) {
      return null;
    }
    return this.props.children;
  }
}

export function useLogger() {
  const context = useContext(LoggerContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }
  const { addLog, getRequestId } = context;

  const createLogMethod = useCallback(
    (level: LogEntry['level']) =>
      (message: string, metadata?: Record<string, unknown>) => {
        addLog({ level, message, metadata });
      },
    [addLog]
  );

  return {
    info: createLogMethod('info'),
    warn: createLogMethod('warn'),
    error: createLogMethod('error'),
    debug: createLogMethod('debug'),
    getRequestId
  };
}

// Testing utilities
export const __test__ = {
  getLogs: () => store.getLogs(),
  clearLogs: () => {
    store.clear();
    requestLogs.clear();
  }
};