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
        const fileFormat = combine(timestamp(), json());
        const consoleFormat = combine(colorize(), timestamp(), printf(({ level, message, timestamp, ...metadata }) => {
            return `${timestamp} ${level}: ${message} ${Object.keys(metadata).length ? JSON.stringify(metadata) : ''}`;
        }));
        const transports = [
            new winston_1.default.transports.Console({
                format: consoleFormat,
                level: opts.logLevel
            })
        ];
        if (opts.logPath) {
            transports.push(new winston_1.default.transports.File({
                filename: opts.logPath,
                format: fileFormat,
                level: 'error'
            }));
        }
        WinstonLogger.instance = winston_1.default.createLogger({
            level: opts.logLevel,
            silent: opts.silent,
            transports
        });
    }
    static persistLogs(entries) {
        const logger = WinstonLogger.getInstance();
        entries.forEach(entry => {
            const { timestamp, level, message, metadata, requestId } = entry;
            logger.log({
                level,
                message,
                timestamp,
                requestId,
                ...metadata
            });
        });
    }
    static persistError(error, metadata) {
        const logger = WinstonLogger.getInstance();
        logger.error(error.message, {
            stack: error.stack,
            ...metadata
        });
    }
}
WinstonLogger.defaultOptions = {
    logPath: 'logs/error.log',
    logLevel: 'info',
    silent: process.env.NODE_ENV === 'test'
};
exports.getWinstonLogger = WinstonLogger.getInstance;
exports.persistLogs = WinstonLogger.persistLogs;
exports.persistError = WinstonLogger.persistError;
