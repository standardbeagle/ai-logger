"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.clearContext = exports.getRequestLogs = exports.getCurrentContext = exports.debug = exports.error = exports.warn = exports.info = exports.useLogFrame = exports.withLogging = exports.LogFrame = exports.useLogger = exports.LogProvider = exports.withLogger = exports.loggerMiddleware = exports.persistError = exports.persistLogs = exports.getWinstonLogger = exports.RequestLogger = void 0;
// Server-side exports
const request_logger_1 = require("./request-logger");
var request_logger_2 = require("./request-logger");
Object.defineProperty(exports, "RequestLogger", { enumerable: true, get: function () { return request_logger_2.RequestLogger; } });
var winston_logger_1 = require("./winston-logger");
Object.defineProperty(exports, "getWinstonLogger", { enumerable: true, get: function () { return winston_logger_1.getWinstonLogger; } });
Object.defineProperty(exports, "persistLogs", { enumerable: true, get: function () { return winston_logger_1.persistLogs; } });
Object.defineProperty(exports, "persistError", { enumerable: true, get: function () { return winston_logger_1.persistError; } });
var middleware_1 = require("./middleware");
Object.defineProperty(exports, "loggerMiddleware", { enumerable: true, get: function () { return middleware_1.loggerMiddleware; } });
Object.defineProperty(exports, "withLogger", { enumerable: true, get: function () { return middleware_1.withLogger; } });
// Client-side exports
var context_1 = require("./client/context");
Object.defineProperty(exports, "LogProvider", { enumerable: true, get: function () { return context_1.LogProvider; } });
Object.defineProperty(exports, "useLogger", { enumerable: true, get: function () { return context_1.useLogger; } });
var log_frame_1 = require("./client/log-frame");
Object.defineProperty(exports, "LogFrame", { enumerable: true, get: function () { return log_frame_1.LogFrame; } });
Object.defineProperty(exports, "withLogging", { enumerable: true, get: function () { return log_frame_1.withLogging; } });
Object.defineProperty(exports, "useLogFrame", { enumerable: true, get: function () { return log_frame_1.useLogFrame; } });
// Re-export commonly used functions for convenience
exports.info = request_logger_1.RequestLogger.info, exports.warn = request_logger_1.RequestLogger.warn, exports.error = request_logger_1.RequestLogger.error, exports.debug = request_logger_1.RequestLogger.debug, exports.getCurrentContext = request_logger_1.RequestLogger.getCurrentContext, exports.getRequestLogs = request_logger_1.RequestLogger.getRequestLogs, exports.clearContext = request_logger_1.RequestLogger.clearContext, exports.run = request_logger_1.RequestLogger.run;
