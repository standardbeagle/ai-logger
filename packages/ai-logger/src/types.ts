export interface LogEntry {
  //timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  requestId: string;
}

export interface LoggerOptions {
  requestId: string;
  logLevel?: LogEntry['level'];
}

export interface RequestContext {
  requestId: string;
  startTime: Date;
  logs: LogEntry[];
}