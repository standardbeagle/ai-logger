import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RequestLogger } from './request-logger';
import { persistLogs } from './winston-logger';
import type { LogEntry } from './types';

export async function loggerMiddleware(request: NextRequest): Promise<NextResponse> {
  const requestId = crypto.randomUUID();
  const startTime = Date.now();

  try {
    return await RequestLogger.run({ requestId }, async () => {
      // Log the initial request
      RequestLogger.info('Incoming request', {
        url: request.url,
        method: request.method,
        startTime
      });

      // Handle uploading client logs via POST to /_log
      if (request.method === 'POST' && request.url.endsWith('/_log')) {
        try {
          const body = await request.json();
          
          // Validate log entries
          if (!body.logs || !Array.isArray(body.logs)) {
            throw new Error('Invalid log format - expected array of logs');
          }

          // Type check and validate each log entry
          const validLogs = body.logs.every((log: unknown): log is LogEntry => 
            typeof log === 'object' && log !== null &&
            'level' in log && typeof log.level === 'string' &&
            'message' in log && typeof log.message === 'string'
          );

          if (!validLogs) {
            throw new Error('Invalid log entry format');
          }

          persistLogs(body.logs);
          return NextResponse.json({ success: true });
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Unknown error';
          RequestLogger.error('Failed to process client logs', { error: errorMessage });
          return NextResponse.json(
            { error: errorMessage },
            { status: 400 }
          );
        }
      }

      const response = await NextResponse.next();

      // If there was an error response, persist the logs
      if (!response.ok) {
        const logs = RequestLogger.getRequestLogs();
        persistLogs(logs);
      }

      // Log request completion time
      const duration = Date.now() - startTime;
      RequestLogger.info('Request completed', {
        duration,
        status: response.status
      });

      return response;
    });
  } catch (error) {
    // Ensure logs are persisted on uncaught errors
    const logs = RequestLogger.getRequestLogs();
    persistLogs(logs);
    
    // Log the error with timing information
    const duration = Date.now() - startTime;
    RequestLogger.error('Uncaught error in middleware', {
      error: error instanceof Error ? error.message : 'Unknown error',
      duration
    });
    
    throw error;
  }
}

// Helper to configure logger middleware in Next.js
interface LoggerConfig {
  middleware: (request: NextRequest) => Promise<NextResponse>;
  matcher: string[];
}

export function withLogger(config: { matcher?: string[] } = {}): LoggerConfig {
  return {
    middleware: loggerMiddleware,
    matcher: config.matcher || [
      /*
       * Match all request paths except for:
       * - _next/static (static files)
       * - _next/image (image optimization files)
       * - favicon.ico (favicon file)
       * But include /_log for client-side log uploads
       */
      '/((?!_next/static|_next/image|favicon.ico).*)',
      '/_log'
    ]
  };
}