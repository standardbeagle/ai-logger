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
exports.__test__ = exports.useLogger = exports.LogProvider = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const api_1 = require("./api");
const LoggerContext = (0, react_1.createContext)(null);
// Global store for logs with async handling
const store = {
    logs: [],
    queue: Promise.resolve(),
    clear() {
        this.logs = [];
        this.queue = Promise.resolve();
    },
    async addLog(log) {
        await (this.queue = this.queue.then(() => {
            this.logs.push(log);
            return Promise.resolve();
        }));
    },
    getLogs() {
        return [...this.logs];
    }
};
function LogProvider({ children, requestId = crypto.randomUUID(), onError, onLog }) {
    // Store logs in ref to prevent re-renders and maintain across error boundaries
    const logsRef = (0, react_1.useRef)([]);
    const processingError = (0, react_1.useRef)(false);
    (0, react_1.useEffect)(() => {
        return () => {
            logsRef.current = [];
        };
    }, []);
    const addLog = (0, react_1.useCallback)(async (entry) => {
        const newLog = {
            ...entry,
            timestamp: new Date(),
            requestId
        };
        // Add to local logs immediately
        logsRef.current.push(newLog);
        // Handle logging output
        if (onLog) {
            await Promise.resolve().then(() => onLog(newLog));
        }
        else {
            await store.addLog(newLog);
        }
    }, [requestId, onLog]);
    const getRequestId = (0, react_1.useCallback)(() => requestId, [requestId]);
    const handleError = (0, react_1.useCallback)(async (error) => {
        // Prevent recursive error handling
        if (processingError.current) {
            throw error;
        }
        processingError.current = true;
        try {
            // Get logs before doing anything that might fail
            const currentLogs = [...logsRef.current];
            // Add error log
            await addLog({
                level: 'error',
                message: 'Error caught by error boundary',
                metadata: {
                    error: error.message,
                    stack: error.stack
                }
            });
            // Try to upload logs
            try {
                await (0, api_1.uploadLogs)(currentLogs);
            }
            catch (uploadError) {
                console.error('Failed to upload logs:', uploadError);
            }
            // Notify error handler
            if (onError) {
                await Promise.resolve().then(() => onError(error, currentLogs));
            }
        }
        finally {
            processingError.current = false;
        }
        // Re-throw the original error
        throw error;
    }, [addLog, onError]);
    const value = react_1.default.useMemo(() => ({
        addLog,
        getRequestId
    }), [addLog, getRequestId]);
    return ((0, jsx_runtime_1.jsx)(LoggerContext.Provider, { value: value, children: (0, jsx_runtime_1.jsx)(ErrorBoundary, { onError: handleError, children: children }) }));
}
exports.LogProvider = LogProvider;
class ErrorBoundary extends react_1.default.Component {
    constructor() {
        super(...arguments);
        this.state = { hasError: false };
    }
    static getDerivedStateFromError() {
        return { hasError: true };
    }
    componentDidCatch(error) {
        // Handle the error asynchronously
        void this.props.onError(error).catch(handlerError => {
            console.error('Error in error boundary handler:', handlerError);
        });
    }
    render() {
        if (this.state.hasError) {
            return null;
        }
        return this.props.children;
    }
}
function useLogger() {
    const context = (0, react_1.useContext)(LoggerContext);
    if (!context) {
        throw new Error('useLogger must be used within a LogProvider');
    }
    const { addLog, getRequestId } = context;
    const createLogMethod = (0, react_1.useCallback)((level) => (message, metadata) => addLog({ level, message, metadata }), [addLog]);
    return react_1.default.useMemo(() => ({
        info: createLogMethod('info'),
        warn: createLogMethod('warn'),
        error: createLogMethod('error'),
        debug: createLogMethod('debug'),
        getRequestId
    }), [createLogMethod, getRequestId]);
}
exports.useLogger = useLogger;
// Testing utilities
exports.__test__ = {
    getLogs: () => store.getLogs(),
    clearLogs: () => {
        store.clear();
    }
};
