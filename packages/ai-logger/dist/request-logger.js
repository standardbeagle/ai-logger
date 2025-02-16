"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.RequestLogger = void 0;
const async_hooks_1 = require("async_hooks");
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
        return RequestLogger.storage.run(context, fn);
    }
    static clearContext() {
        const context = RequestLogger.getCurrentContext();
        if (context) {
            context.logs = [];
        }
    }
}
exports.RequestLogger = RequestLogger;
RequestLogger.storage = new async_hooks_1.AsyncLocalStorage();
RequestLogger.defaultLogLevel = 'info';
