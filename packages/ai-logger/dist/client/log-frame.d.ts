import React from 'react';
interface LogFrameProps {
    children: React.ReactNode;
    name: string;
    metadata?: Record<string, unknown>;
}
export declare function LogFrame({ children, name, metadata }: LogFrameProps): JSX.Element;
export declare function useLogFrame(): {
    frameId: string;
    parentFrameId?: string;
    info: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    warn: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    error: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
    debug: (message: string, metadata?: Record<string, unknown>) => Promise<void>;
};
interface WithLoggingOptions {
    name: string;
    metadata?: Record<string, unknown>;
}
export declare function withLogging<P extends object>(Component: React.ComponentType<P>, options: WithLoggingOptions): React.FC<P>;
export declare const __test__: {
    resetFrameCounter: () => void;
};
export {};
