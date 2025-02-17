"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLogger = void 0;
const async_hooks_1 = require("async_hooks");
const winston_logger_1 = require("./winston-logger");
class RequestLogger {
    static setDefaultLogLevel(level) {
        RequestLogger.defaultLogLevel = level;
    }
    static createContext(options) {
        return {
            requestId: options.requestId,
            startTime: new Date(),
            logs: []
        };
    }
    static getCurrentContext() {
        return RequestLogger.storage.getStore();
    }
    static log(level, message, metadata) {
        const context = RequestLogger.getCurrentContext();
        if (!context) {
            throw new Error('No logging context found. Ensure logging is initialized for this request.');
        }
        const entry = {
            timestamp: new Date(),
            level,
            message,
            metadata,
            requestId: context.requestId
        };
        context.logs.push(entry);
        return entry;
    }
    static info(message, metadata) {
        return RequestLogger.log('info', message, metadata);
    }
    static warn(message, metadata) {
        return RequestLogger.log('warn', message, metadata);
    }
    static error(message, metadata) {
        return RequestLogger.log('error', message, metadata);
    }
    static debug(message, metadata) {
        return RequestLogger.log('debug', message, metadata);
    }
    static getRequestLogs() {
        const context = RequestLogger.getCurrentContext();
        if (!context) {
            return [];
        }
        return [...context.logs];
    }
    static async run(options, fn) {
        const context = RequestLogger.createContext(options);
        const parentContext = RequestLogger.getCurrentContext();
        let result;
        try {
            // Create new context
            result = await RequestLogger.storage.run(context, async () => {
                try {
                    // Log context creation if nested
                    if (parentContext) {
                        RequestLogger.debug('Created nested logging context', {
                            parentRequestId: parentContext.requestId,
                            childRequestId: context.requestId
                        });
                    }
                    const fnResult = await Promise.resolve(fn());
                    // If we get here, the function completed successfully
                    // Merge logs into parent if nested
                    if (parentContext) {
                        parentContext.logs.push(...context.logs.map(log => ({
                            ...log,
                            metadata: {
                                ...log.metadata,
                                parentRequestId: parentContext.requestId
                            }
                        })));
                    }
                    return fnResult;
                }
                catch (error) {
                    // Log the error
                    RequestLogger.error('Error in logging context', {
                        error: error instanceof Error ? error.message : String(error),
                        stack: error instanceof Error ? error.stack : undefined
                    });
                    // Persist logs before throwing
                    await (0, winston_logger_1.persistLogs)(context.logs);
                    throw error;
                }
            });
            return result;
        }
        catch (error) {
            // Error was already handled and logs were persisted in inner catch
            throw error;
        }
    }
    static clearContext() {
        const context = RequestLogger.getCurrentContext();
        if (context) {
            // Create empty context to clear the current one
            const emptyContext = {
                requestId: 'cleanup',
                startTime: new Date(),
                logs: []
            };
            // Run with empty context to clear the current one
            RequestLogger.storage.run(emptyContext, () => {
                context.logs = [];
            });
        }
    }
}
exports.RequestLogger = RequestLogger;
RequestLogger.storage = new async_hooks_1.AsyncLocalStorage();
RequestLogger.defaultLogLevel = 'info';
