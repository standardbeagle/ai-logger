import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
export declare function loggerMiddleware(request: NextRequest): Promise<NextResponse>;
interface LoggerConfig {
    middleware: (request: NextRequest) => Promise<NextResponse>;
    matcher: string[];
}
export declare function withLogger(config?: {
    matcher?: string[];
}): LoggerConfig;
export {};
