"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const request_logger_1 = require("./request-logger");
const winstonLogger = __importStar(require("./winston-logger"));
// Mock winston-logger
vitest_1.vi.mock('./winston-logger', () => ({
    persistLogs: vitest_1.vi.fn(),
    persistError: vitest_1.vi.fn(),
    getWinstonLogger: vitest_1.vi.fn()
}));
(0, vitest_1.describe)('RequestLogger', () => {
    const requestId = 'test-request-123';
    (0, vitest_1.beforeEach)(() => {
        request_logger_1.RequestLogger.clearContext();
        vitest_1.vi.clearAllMocks();
    });
    (0, vitest_1.test)('should create log entries within request context', async () => {
        await request_logger_1.RequestLogger.run({ requestId }, () => {
            request_logger_1.RequestLogger.info('Test message');
            request_logger_1.RequestLogger.error('Error message', { errorCode: 500 });
            const logs = request_logger_1.RequestLogger.getRequestLogs();
            (0, vitest_1.expect)(logs).toHaveLength(2);
            (0, vitest_1.expect)(logs[0].message).toBe('Test message');
            (0, vitest_1.expect)(logs[0].level).toBe('info');
            (0, vitest_1.expect)(logs[0].requestId).toBe(requestId);
            (0, vitest_1.expect)(logs[1].message).toBe('Error message');
            (0, vitest_1.expect)(logs[1].level).toBe('error');
            (0, vitest_1.expect)(logs[1].metadata).toEqual({ errorCode: 500 });
        });
    });
    (0, vitest_1.test)('should throw error when logging outside request context', () => {
        (0, vitest_1.expect)(() => request_logger_1.RequestLogger.info('Test message')).toThrow('No logging context found');
    });
    (0, vitest_1.test)('should handle nested contexts correctly', async () => {
        const outerRequestId = 'outer-request';
        const innerRequestId = 'inner-request';
        await request_logger_1.RequestLogger.run({ requestId: outerRequestId }, async () => {
            request_logger_1.RequestLogger.info('Outer message');
            await request_logger_1.RequestLogger.run({ requestId: innerRequestId }, () => {
                request_logger_1.RequestLogger.info('Inner message');
                const innerLogs = request_logger_1.RequestLogger.getRequestLogs();
                (0, vitest_1.expect)(innerLogs[0].requestId).toBe(innerRequestId);
            });
            const outerLogs = request_logger_1.RequestLogger.getRequestLogs();
            (0, vitest_1.expect)(outerLogs[0].requestId).toBe(outerRequestId);
        });
    });
    (0, vitest_1.test)('should handle async operations', async () => {
        await request_logger_1.RequestLogger.run({ requestId }, async () => {
            await Promise.resolve();
            request_logger_1.RequestLogger.info('Async message');
            const logs = request_logger_1.RequestLogger.getRequestLogs();
            (0, vitest_1.expect)(logs).toHaveLength(1);
            (0, vitest_1.expect)(logs[0].message).toBe('Async message');
        });
    });
    (0, vitest_1.test)('should persist logs on error', async () => {
        vitest_1.expect.assertions(3);
        try {
            await request_logger_1.RequestLogger.run({ requestId }, async () => {
                request_logger_1.RequestLogger.info('Before error');
                throw new Error('Test error');
            });
        }
        catch (error) {
            // Verify logs were persisted automatically
            (0, vitest_1.expect)(winstonLogger.persistLogs).toHaveBeenCalledTimes(1);
            (0, vitest_1.expect)(winstonLogger.persistLogs).toHaveBeenCalledWith([
                vitest_1.expect.objectContaining({
                    level: 'info',
                    message: 'Before error',
                    requestId
                }),
                vitest_1.expect.objectContaining({
                    level: 'error',
                    message: 'Error in logging context',
                    requestId,
                    metadata: vitest_1.expect.objectContaining({
                        error: 'Test error'
                    })
                })
            ]);
            (0, vitest_1.expect)(error).toBeInstanceOf(Error);
        }
    });
});
