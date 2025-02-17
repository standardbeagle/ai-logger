# @standardbeagle/ai-logger

A full-stack logging system for Next.js applications with both server-side and client-side logging capabilities. Logs are collected during request/interaction processing and only persisted when errors occur.

## Features

- Request-scoped logging using AsyncLocalStorage on the server
- Client-side logging with React context and error boundaries
- Nested logging frames for tracking component interactions
- Automatic log persistence on errors
- Integration with Winston for log storage
- TypeScript support
- Memory efficient - logs are only persisted on errors

## Installation

```bash
pnpm add @standardbeagle/ai-logger
```

## Server-Side Setup

### Middleware Configuration

```typescript
// middleware.ts
import { withLogger } from '@standardbeagle/ai-logger';

export const { middleware } = withLogger({
  // Optional: Configure path matching
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)']
});
```

### Server Component/API Route Usage

```typescript
import { RequestLogger } from '@standardbeagle/ai-logger';

export async function GET() {
  RequestLogger.info('Processing request', { endpoint: '/api/data' });
  
  try {
    // Your logic here
    RequestLogger.debug('Request processed successfully');
  } catch (err) {
    RequestLogger.error('Failed to process request', { 
      error: err.message,
      stack: err.stack
    });
    throw err;
  }
}
```

## Client-Side Setup

### Provider Setup

```tsx
// app/layout.tsx
import { LogProvider } from '@standardbeagle/ai-logger';

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html>
      <body>
        <LogProvider>
          {children}
        </LogProvider>
      </body>
    </html>
  );
}
```

### Component Usage

```tsx
import { useLogger, LogFrame, useLogFrame } from '@standardbeagle/ai-logger';

// Using the hook directly
function MyComponent() {
  const logger = useLogger();
  
  const handleClick = () => {
    logger.info('Button clicked', { componentId: 'my-button' });
    // ... handle click
  };

  return <button onClick={handleClick}>Click Me</button>;
}

// Using LogFrame for nested logging
function ComplexComponent() {
  const frameLogger = useLogFrame();
  
  const handleSubmit = async () => {
    frameLogger.info('Form submission started');
    try {
      await submitForm();
      frameLogger.info('Form submitted successfully');
    } catch (err) {
      frameLogger.error('Form submission failed', { error: err });
      throw err;
    }
  };

  return (
    <LogFrame name="form-submission">
      <form onSubmit={handleSubmit}>
        {/* form fields */}
      </form>
    </LogFrame>
  );
}

// Using HOC pattern
const LoggedComponent = withLogging(MyComponent, {
  name: 'MyComponent',
  metadata: { componentType: 'button' }
});
```

## How It Works

1. Server-side requests are wrapped in a logging context using middleware
2. Client-side interactions are wrapped in LogFrames
3. Logs are stored in memory during normal operation
4. On errors:
   - Server-side: Logs are persisted via Winston
   - Client-side: Logs are automatically uploaded to the server
5. Nested frames provide context for complex interactions

## API Reference

### Server-Side

- `RequestLogger.info/warn/error/debug(message, metadata?)`
- `withLogger(config?)` - Middleware configuration
- `persistLogs(entries)` - Manual log persistence
- `getWinstonLogger(options?)` - Winston logger configuration

### Client-Side

- `LogProvider` - React context provider
- `useLogger()` - Hook for basic logging
- `LogFrame` - Component for nested logging contexts
- `useLogFrame()` - Hook for frame-specific logging
- `withLogging(Component, options)` - HOC for component logging

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

interface LogFrameProps {
  name: string;
  metadata?: Record<string, unknown>;
  children: React.ReactNode;
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

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.