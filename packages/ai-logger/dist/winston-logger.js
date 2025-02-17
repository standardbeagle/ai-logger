"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistError = exports.persistLogs = exports.getWinstonLogger = void 0;
const winston_1 = __importDefault(require("winston"));
const { combine, timestamp, json, printf, colorize } = winston_1.default.format;
class WinstonLogger {
    static getInstance(options) {
        if (!WinstonLogger.instance) {
            WinstonLogger.initialize(options);
        }
        return WinstonLogger.instance;
    }
    static initialize(options) {
        const opts = { ...WinstonLogger.defaultOptions, ...options };
        try {
            const fileFormat = combine(timestamp(), json());
            const consoleFormat = combine(colorize(), timestamp(), printf(({ level, message, timestamp, ...metadata }) => {
                return `${timestamp} ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata, null, 2) : ''}`;
            }));
            const transports = [
                new winston_1.default.transports.Console({
                    format: consoleFormat,
                    level: opts.logLevel,
                    handleExceptions: true,
                    handleRejections: true
                })
            ];
            if (opts.logPath) {
                transports.push(new winston_1.default.transports.File({
                    filename: opts.logPath,
                    format: fileFormat,
                    level: 'error',
                    handleExceptions: true,
                    handleRejections: true,
                    maxsize: 5242880, // 5MB
                    maxFiles: 5,
                    tailable: true
                }));
            }
            WinstonLogger.instance = winston_1.default.createLogger({
                level: opts.logLevel,
                silent: opts.silent,
                transports,
                exitOnError: false
            });
            transports.forEach(transport => {
                transport.on('error', (err) => {
                    console.error('Winston transport error:', err);
                    if (transport instanceof winston_1.default.transports.File) {
                        console.error('File transport error - falling back to console');
                    }
                });
            });
        }
        catch (error) {
            console.error('Failed to initialize logger:', error);
            WinstonLogger.instance = winston_1.default.createLogger({
                transports: [
                    new winston_1.default.transports.Console({
                        level: 'info',
                        handleExceptions: true,
                        handleRejections: true
                    })
                ]
            });
        }
    }
    static async persistLogs(entries) {
        const logger = WinstonLogger.getInstance();
        try {
            await Promise.all(entries.map(entry => {
                const { timestamp, level, message, metadata, requestId } = entry;
                return new Promise((resolve, reject) => {
                    logger.log(level, message, {
                        timestamp,
                        requestId,
                        ...metadata
                    }, (err) => {
                        if (err)
                            reject(err);
                        else
                            resolve();
                    });
                });
            }));
        }
        catch (error) {
            console.error('Failed to persist logs:', error);
            throw error;
        }
    }
    static persistError(error, metadata) {
        const logger = WinstonLogger.getInstance();
        logger.error({
            message: error.message,
            error: {
                name: error.name,
                stack: error.stack
            },
            ...metadata
        });
    }
}
WinstonLogger.defaultOptions = {
    logPath: 'logs/error.log',
    logLevel: 'info',
    silent: false // Removed test env check
};
exports.getWinstonLogger = WinstonLogger.getInstance;
exports.persistLogs = WinstonLogger.persistLogs;
exports.persistError = WinstonLogger.persistError;
