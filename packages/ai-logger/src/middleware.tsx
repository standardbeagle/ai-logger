import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { RequestLogger } from './request-logger';
import { persistLogs } from './winston-logger';

export async function loggerMiddleware(request: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    return await RequestLogger.run({ requestId }, async () => {
      // Log the initial request
      RequestLogger.info('Incoming request', {
        url: request.url,
        method: request.method
      });

      const response = await NextResponse.next();

      // Handle uploading client logs via POST to /_log
      if (request.method === 'POST' && request.url.endsWith('/_log')) {
        try {
          const body = await request.json();
          if (body.logs && Array.isArray(body.logs)) {
            persistLogs(body.logs);
          }
          return NextResponse.json({ success: true });
        } catch (error) {
          RequestLogger.error('Failed to process client logs', { error });
          return NextResponse.json(
            { error: 'Failed to process logs' },
            { status: 400 }
          );
        }
      }

      // If there was an error response, persist the logs
      if (!response.ok) {
        const logs = RequestLogger.getRequestLogs();
        persistLogs(logs);
      }

      return response;
    });
  } catch (error) {
    // Ensure logs are persisted on uncaught errors
    const logs = RequestLogger.getRequestLogs();
    persistLogs(logs);
    throw error;
  }
}

// Helper to configure logger middleware in Next.js
export function withLogger(config: { matcher?: string[] } = {}) {
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