"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.withLogger = exports.loggerMiddleware = void 0;
const server_1 = require("next/server");
const request_logger_1 = require("./request-logger");
const winston_logger_1 = require("./winston-logger");
async function loggerMiddleware(request) {
    const requestId = crypto.randomUUID();
    const startTime = Date.now();
    try {
        return await request_logger_1.RequestLogger.run({ requestId }, async () => {
            // Log the initial request
            request_logger_1.RequestLogger.info('Incoming request', {
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
                    const validLogs = body.logs.every((log) => typeof log === 'object' && log !== null &&
                        'level' in log && typeof log.level === 'string' &&
                        'message' in log && typeof log.message === 'string');
                    if (!validLogs) {
                        throw new Error('Invalid log entry format');
                    }
                    (0, winston_logger_1.persistLogs)(body.logs);
                    return server_1.NextResponse.json({ success: true });
                }
                catch (error) {
                    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
                    request_logger_1.RequestLogger.error('Failed to process client logs', { error: errorMessage });
                    return server_1.NextResponse.json({ error: errorMessage }, { status: 400 });
                }
            }
            const response = await server_1.NextResponse.next();
            // If there was an error response, persist the logs
            if (!response.ok) {
                const logs = request_logger_1.RequestLogger.getRequestLogs();
                (0, winston_logger_1.persistLogs)(logs);
            }
            // Log request completion time
            const duration = Date.now() - startTime;
            request_logger_1.RequestLogger.info('Request completed', {
                duration,
                status: response.status
            });
            return response;
        });
    }
    catch (error) {
        // Ensure logs are persisted on uncaught errors
        const logs = request_logger_1.RequestLogger.getRequestLogs();
        (0, winston_logger_1.persistLogs)(logs);
        // Log the error with timing information
        const duration = Date.now() - startTime;
        request_logger_1.RequestLogger.error('Uncaught error in middleware', {
            error: error instanceof Error ? error.message : 'Unknown error',
            duration
        });
        throw error;
    }
}
exports.loggerMiddleware = loggerMiddleware;
function withLogger(config = {}) {
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
exports.withLogger = withLogger;
