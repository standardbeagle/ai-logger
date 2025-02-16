# @standardbeagle/ai-logger

A request-scoped logging system for Next.js applications with Winston integration. Logs are collected during request processing and only persisted when errors occur.

## Features

- Request-scoped logging using AsyncLocalStorage
- Integration with Winston for persistent logging
- TypeScript support
- Efficient memory usage - logs are only persisted on errors
- Next.js App Router compatible

## Installation

```bash
pnpm add @standardbeagle/ai-logger
```

## Usage

### Basic Setup

```typescript
import { RequestLogger, persistLogs } from '@standardbeagle/ai-logger';

// In your Next.js middleware.ts
import { NextResponse } from 'next/server';

export async function middleware(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await RequestLogger.run({ requestId }, async () => {
      const response = await NextResponse.next();
      
      if (!response.ok) {
        // Only persist logs if there's an error
        const logs = RequestLogger.getRequestLogs();
        persistLogs(logs);
      }
      
      return response;
    });
  } catch (error) {
    const logs = RequestLogger.getRequestLogs();
    persistLogs(logs);
    throw error;
  }
}
```

### Logging Within Request Context

```typescript
import { info, error, debug, warn } from '@standardbeagle/ai-logger';

// In your route handlers or components
export async function GET() {
  info('Processing request', { endpoint: '/api/data' });
  
  try {
    // Your logic here
    debug('Request processed successfully');
  } catch (err) {
    error('Failed to process request', { 
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
}
```

### Winston Configuration

```typescript
import { getWinstonLogger } from '@standardbeagle/ai-logger';

const logger = getWinstonLogger({
  logPath: 'logs/error.log',
  logLevel: 'info'
});

// Custom Winston configuration
logger.add(new winston.transports.Console({
  format: winston.format.simple()
}));
```

## API Reference

### RequestLogger

- `run(options: LoggerOptions, fn: () => Promise<T>): Promise<T>`
- `info(message: string, metadata?: Record<string, unknown>): void`
- `warn(message: string, metadata?: Record<string, unknown>): void`
- `error(message: string, metadata?: Record<string, unknown>): void`
- `debug(message: string, metadata?: Record<string, unknown>): void`
- `getRequestLogs(): LogEntry[]`
- `clearContext(): void`

### Winston Integration

- `getWinstonLogger(options?: WinstonLoggerOptions)`
- `persistLogs(entries: LogEntry[]): void`
- `persistError(error: Error, metadata?: Record<string, unknown>): void`

## Types

```typescript
interface LogEntry {
  timestamp: Date;
  level: 'error' | 'warn' | 'info' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  requestId: string;
}

interface LoggerOptions {
  requestId: string;
  logLevel?: LogEntry['level'];
}

interface WinstonLoggerOptions {
  logPath?: string;
  logLevel?: string;
  silent?: boolean;
}
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test:coverage

# Run tests in watch mode
pnpm test:watch
```

## License

ISC