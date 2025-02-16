"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.run = exports.clearContext = exports.getRequestLogs = exports.getCurrentContext = exports.debug = exports.error = exports.warn = exports.info = exports.persistError = exports.persistLogs = exports.getWinstonLogger = exports.RequestLogger = void 0;
const request_logger_1 = require("./request-logger");
Object.defineProperty(exports, "RequestLogger", { enumerable: true, get: function () { return request_logger_1.RequestLogger; } });
const winston_logger_1 = require("./winston-logger");
Object.defineProperty(exports, "getWinstonLogger", { enumerable: true, get: function () { return winston_logger_1.getWinstonLogger; } });
Object.defineProperty(exports, "persistLogs", { enumerable: true, get: function () { return winston_logger_1.persistLogs; } });
Object.defineProperty(exports, "persistError", { enumerable: true, get: function () { return winston_logger_1.persistError; } });
// Re-export commonly used functions for convenience
exports.info = request_logger_1.RequestLogger.info, exports.warn = request_logger_1.RequestLogger.warn, exports.error = request_logger_1.RequestLogger.error, exports.debug = request_logger_1.RequestLogger.debug, exports.getCurrentContext = request_logger_1.RequestLogger.getCurrentContext, exports.getRequestLogs = request_logger_1.RequestLogger.getRequestLogs, exports.clearContext = request_logger_1.RequestLogger.clearContext, exports.run = request_logger_1.RequestLogger.run;
