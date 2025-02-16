import React, { createContext, useContext, useCallback } from 'react';
import type { LogEntry, LoggerOptions } from '../types';
import { uploadLogs } from './api';

interface LogContextType {
  logs: LogEntry[];
  addLog: (entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => void;
  getLogs: () => LogEntry[];
  clearLogs: () => void;
  getRequestId: () => string;
}

const LogContext = createContext<LogContextType | null>(null);

interface LogProviderProps {
  children: React.ReactNode;
  requestId?: string;
  onError?: (error: Error, logs: LogEntry[]) => void;
}

export function LogProvider({ 
  children, 
  requestId = crypto.randomUUID(),
  onError 
}: LogProviderProps) {
  const [logs, setLogs] = React.useState<LogEntry[]>([]);

  const addLog = useCallback((entry: Omit<LogEntry, 'timestamp' | 'requestId'>) => {
    const logEntry: LogEntry = {
      ...entry,
      timestamp: new Date(),
      requestId
    };
    setLogs(prev => [...prev, logEntry]);
  }, [requestId]);

  const getLogs = useCallback(() => logs, [logs]);
  
  const clearLogs = useCallback(() => {
    setLogs([]);
  }, []);

  const getRequestId = useCallback(() => requestId, [requestId]);

  const handleError = useCallback(async (error: Error) => {
    // Upload logs to server
    await uploadLogs(logs);
    
    // Call custom error handler if provided
    if (onError) {
      onError(error, logs);
    }
  }, [logs, onError]);

  const value = React.useMemo(() => ({
    logs,
    addLog,
    getLogs,
    clearLogs,
    getRequestId
  }), [logs, addLog, getLogs, clearLogs, getRequestId]);

  return (
    <LogContext.Provider value={value}>
      <ErrorBoundary onError={handleError}>
        {children}
      </ErrorBoundary>
    </LogContext.Provider>
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
      return null; // Let the parent error boundary handle the display
    }
    return this.props.children;
  }
}

export function useLogger() {
  const context = useContext(LogContext);
  if (!context) {
    throw new Error('useLogger must be used within a LogProvider');
  }

  const { addLog, getRequestId } = context;

  return {
    info: (message: string, metadata?: Record<string, unknown>) =>
      addLog({ level: 'info', message, metadata }),
    warn: (message: string, metadata?: Record<string, unknown>) =>
      addLog({ level: 'warn', message, metadata }),
    error: (message: string, metadata?: Record<string, unknown>) =>
      addLog({ level: 'error', message, metadata }),
    debug: (message: string, metadata?: Record<string, unknown>) =>
      addLog({ level: 'debug', message, metadata }),
    getRequestId
  };
}