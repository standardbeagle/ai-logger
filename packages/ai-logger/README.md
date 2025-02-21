# @standardbeagle/ai-logger

A full-stack logging system for Next.js applications with request-scoped logging, client-side logging, and automatic error persistence.

## Features

- 🔍 Request-scoped logging using AsyncLocalStorage
- 🌐 Client-side logging integration with React components
- ⚡ Efficient in-memory log buffering with automatic persistence on errors
- 🔄 Nested logging contexts with parent-child relationship tracking
- 📝 Winston integration for flexible log output formats and destinations
- 🚀 Next.js middleware integration
- 💾 Automatic error logging and persistence
- 🎯 TypeScript support with full type definitions

## Installation

```bash
npm install @standardbeagle/ai-logger
# or
yarn add @standardbeagle/ai-logger
# or
pnpm add @standardbeagle/ai-logger
```

## Basic Usage

### Server-side Logging

```typescript
import { RequestLogger, loggerMiddleware } from '@standardbeagle/ai-logger';

// In your Next.js middleware
export default loggerMiddleware(async (req, res) => {
  RequestLogger.info('Processing request', { path: req.url });
  
  try {
    // Your request handling logic
    await processRequest(req);
    RequestLogger.info('Request processed successfully');
  } catch (error) {
    RequestLogger.error('Request failed', { error });
    throw error;
  }
});

// Using the run method for custom scopes
await RequestLogger.run({ requestId: 'custom-operation' }, async () => {
  RequestLogger.info('Starting operation');
  // Your code here
  RequestLogger.info('Operation completed');
});
```

### Client-side Logging

```typescript
import { LogProvider, useLogger, LogFrame } from '@standardbeagle/ai-logger';

// Wrap your app with LogProvider
function App() {
  return (
    <LogProvider>
      <YourComponents />
    </LogProvider>
  );
}

// Use the logger in components
function YourComponent() {
  const logger = useLogger();
  
  const handleClick = () => {
    logger.info('Button clicked', { componentName: 'YourComponent' });
  };

  return <button onClick={handleClick}>Click me</button>;
}

// Use LogFrame for automatic operation logging
function Operation() {
  return (
    <LogFrame
      name="user-operation"
      onError={(error) => console.error('Operation failed:', error)}
    >
      <YourOperationComponents />
    </LogFrame>
  );
}
```

## Configuration

### Winston Logger Configuration

```typescript
import { getWinstonLogger } from '@standardbeagle/ai-logger';

const logger = getWinstonLogger({
  logPath: 'logs/app.log',
  logLevel: 'debug',
  silent: process.env.NODE_ENV === 'test'
});
```

### Default Log Level

```typescript
import { RequestLogger } from '@standardbeagle/ai-logger';

RequestLogger.setDefaultLogLevel('debug');
```

## API Documentation

See [API.md](./API.md) for detailed API documentation.

## Best Practices

1. **Request Scoping**: Always use the middleware or `RequestLogger.run()` to ensure proper request scoping.

2. **Error Handling**: Let errors propagate naturally - the logger will automatically persist logs on errors.

3. **Context Management**: Use `LogFrame` components to create logical operation boundaries in your React components.

4. **Metadata**: Include relevant metadata with your log entries for better debugging context.

```typescript
RequestLogger.info('User action completed', {
  userId: user.id,
  action: 'purchase',
  itemId: item.id
});
```

## License

MIT - See [LICENSE](./LICENSE) for details.