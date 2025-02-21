# API Documentation

## Server-Side API

### RequestLogger

Static class that provides the core logging functionality with request-scoped contexts.

#### Methods

##### `static setDefaultLogLevel(level: LogEntry['level']): void`
Sets the default log level for all new logging contexts.

```typescript
RequestLogger.setDefaultLogLevel('debug');
```

##### `static run<T>(options: LoggerOptions, fn: () => Promise<T> | T): Promise<T>`
Creates a new logging context and executes the provided function within it.

```typescript
interface LoggerOptions {
  requestId: string;
}

await RequestLogger.run({ requestId: 'operation-123' }, async () => {
  // Your code here with logging context
});
```

##### Logging Methods
- `static info(message: string, metadata?: Record<string, unknown>): LogEntry`
- `static warn(message: string, metadata?: Record<string, unknown>): LogEntry`
- `static error(message: string, metadata?: Record<string, unknown>): LogEntry`
- `static debug(message: string, metadata?: Record<string, unknown>): LogEntry`

##### Context Management
- `static getCurrentContext(): RequestContext | undefined`
- `static getRequestLogs(): LogEntry[]`
- `static clearContext(): void`

### Winston Integration

#### `getWinstonLogger(options?: WinstonLoggerOptions): winston.Logger`
Returns a configured Winston logger instance.

```typescript
interface WinstonLoggerOptions {
  logPath?: string;      // Default: 'logs/error.log'
  logLevel?: string;     // Default: 'info'
  silent?: boolean;      // Default: false
}
```

#### `persistLogs(entries: LogEntry[]): Promise<void>`
Persists an array of log entries to the configured Winston logger.

#### `persistError(error: Error, metadata?: Record<string, unknown>): void`
Persists an error with optional metadata to the error log file.

### Middleware

#### `loggerMiddleware`
Next.js middleware that initializes request-scoped logging.

```typescript
import { loggerMiddleware } from '@standardbeagle/ai-logger';

export default loggerMiddleware(async (req, res) => {
  // Your middleware logic
});
```

#### `withLogger`
HOC for wrapping API route handlers with logging context.

```typescript
import { withLogger } from '@standardbeagle/ai-logger';

export default withLogger(async (req, res) => {
  // Your API route logic
});
```

## Client-Side API

### React Components

#### `LogProvider`
Provider component that enables logging context in React applications.

```typescript
import { LogProvider } from '@standardbeagle/ai-logger';

function App() {
  return (
    <LogProvider>
      <YourApp />
    </LogProvider>
  );
}
```

#### `LogFrame`
Component that creates a logging boundary for operations.

```typescript
import { LogFrame } from '@standardbeagle/ai-logger';

interface LogFrameProps {
  name: string;
  onError?: (error: Error) => void;
  metadata?: Record<string, unknown>;
  children: React.ReactNode;
}

function Component() {
  return (
    <LogFrame 
      name="user-operation"
      metadata={{ userId: '123' }}
      onError={handleError}
    >
      <ChildComponents />
    </LogFrame>
  );
}
```

### React Hooks

#### `useLogger()`
Hook that provides access to logging functions in React components.

```typescript
import { useLogger } from '@standardbeagle/ai-logger';

function Component() {
  const logger = useLogger();
  
  const handleClick = () => {
    logger.info('Button clicked', { componentName: 'Component' });
  };

  return <button onClick={handleClick}>Click</button>;
}
```

#### `useLogFrame()`
Hook that provides access to the current LogFrame context.

```typescript
import { useLogFrame } from '@standardbeagle/ai-logger';

function Component() {
  const { name, metadata } = useLogFrame();
  // Access current LogFrame context
}
```

## Types

### `LogEntry`
```typescript
interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  metadata?: Record<string, unknown>;
  requestId: string;
}
```

### `RequestContext`
```typescript
interface RequestContext {
  requestId: string;
  startTime: Date;
  logs: LogEntry[];
}
```

### `LoggerOptions`
```typescript
interface LoggerOptions {
  requestId: string;
}
```

## Error Handling

The logger automatically handles errors by:
1. Capturing errors in the logging context
2. Persisting all logs when an error occurs
3. Maintaining the error stack trace and context
4. Propagating the error after logging

Example error handling:

```typescript
try {
  await RequestLogger.run({ requestId: 'operation' }, async () => {
    RequestLogger.info('Starting operation');
    throw new Error('Something went wrong');
  });
} catch (error) {
  // Logs are already persisted
  // Error is propagated with full context
}