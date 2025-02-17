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
exports.__test__ = exports.withLogging = exports.useLogFrame = exports.LogFrame = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importStar(require("react"));
const context_1 = require("./context");
const FrameContext = (0, react_1.createContext)(null);
// Frame tracking with type safety
const frameCounter = {
    count: 0,
    reset() { this.count = 0; },
    next() { return `frame-${this.count++}`; }
};
function LogFrame({ children, name, metadata = {} }) {
    const logger = (0, context_1.useLogger)();
    const parentFrame = (0, react_1.useContext)(FrameContext);
    // Create frame ID synchronously
    const frameRef = (0, react_1.useRef)();
    if (!frameRef.current) {
        frameRef.current = frameCounter.next();
    }
    const frameId = frameRef.current;
    // Store metadata ref to prevent updates but ensure deep equality
    const metadataRef = (0, react_1.useRef)(metadata);
    if (JSON.stringify(metadataRef.current) !== JSON.stringify(metadata)) {
        metadataRef.current = metadata;
    }
    // Create log ready promise
    const logReadyResolveRef = (0, react_1.useRef)();
    const logReadyRef = (0, react_1.useRef)();
    if (!logReadyRef.current) {
        logReadyRef.current = new Promise(resolve => {
            logReadyResolveRef.current = resolve;
        });
    }
    // Track frame hierarchy with error handling
    const frameContext = react_1.default.useMemo(() => ({
        frameId,
        parentFrameId: parentFrame?.frameId,
        logReady: logReadyRef.current,
        addLog: async (entry) => {
            try {
                const combinedMetadata = {
                    frameId,
                    parentFrameId: parentFrame?.frameId,
                    ...metadataRef.current
                };
                await logger.info(entry.message, {
                    ...combinedMetadata,
                    level: entry.level
                });
            }
            catch (error) {
                console.error('Error adding log:', error);
                await logger.error('Failed to add log entry', {
                    error: error instanceof Error ? error.message : String(error),
                    frameId,
                    parentFrameId: parentFrame?.frameId
                });
                throw error;
            }
        }
    }), [frameId, parentFrame?.frameId, logger]);
    // Track mounting state
    const mountedRef = (0, react_1.useRef)(false);
    const logQueue = (0, react_1.useRef)(Promise.resolve());
    // Safe logging helper that ensures order
    const safeLog = react_1.default.useCallback(async (message, level = 'info') => {
        try {
            await (logQueue.current = logQueue.current.then(() => frameContext.addLog({ level, message })));
        }
        catch (error) {
            console.error('Error in safeLog:', error);
            throw error;
        }
    }, [frameContext]);
    // Log frame lifecycle with guaranteed execution order
    (0, react_1.useLayoutEffect)(() => {
        let mounted = false;
        let cleanup;
        // Create enter log chain
        const enterLogPromise = (async () => {
            if (parentFrame) {
                // Wait for parent frame to log first
                await parentFrame.logReady;
            }
            if (!mounted) {
                mounted = true;
                await safeLog(`Enter frame: ${name}`);
                mountedRef.current = true;
                // Signal that this frame has logged
                logReadyResolveRef.current?.();
            }
        })();
        // Setup cleanup
        cleanup = async () => {
            if (mountedRef.current) {
                await safeLog(`Exit frame: ${name}`).catch(error => {
                    console.error('Error during frame cleanup:', error);
                });
                mountedRef.current = false;
            }
        };
        // Handle any enter log errors
        void enterLogPromise.catch(error => {
            console.error('Error during frame entry:', error);
        });
        return () => {
            void cleanup?.();
        };
    }, [name, safeLog, parentFrame]);
    return ((0, jsx_runtime_1.jsx)(FrameContext.Provider, { value: frameContext, children: children }));
}
exports.LogFrame = LogFrame;
function useLogFrame() {
    const frame = (0, react_1.useContext)(FrameContext);
    // Throw synchronously during render
    if (!frame) {
        const error = new Error('useLogFrame must be used within a LogFrame');
        error.name = 'LogFrameError';
        throw error;
    }
    const { frameId, parentFrameId, addLog } = frame;
    return react_1.default.useMemo(() => ({
        frameId,
        parentFrameId,
        info: (message, metadata) => addLog({ level: 'info', message, ...metadata }),
        warn: (message, metadata) => addLog({ level: 'warn', message, ...metadata }),
        error: (message, metadata) => addLog({ level: 'error', message, ...metadata }),
        debug: (message, metadata) => addLog({ level: 'debug', message, ...metadata })
    }), [frameId, parentFrameId, addLog]);
}
exports.useLogFrame = useLogFrame;
function withLogging(Component, options) {
    const displayName = Component.displayName || Component.name || 'Component';
    const WrappedComponent = (props) => ((0, jsx_runtime_1.jsx)(LogFrame, { name: options.name, metadata: options.metadata, children: (0, jsx_runtime_1.jsx)(Component, { ...props }) }));
    WrappedComponent.displayName = `WithLogging(${displayName})`;
    return WrappedComponent;
}
exports.withLogging = withLogging;
// Testing utilities
exports.__test__ = {
    resetFrameCounter: () => frameCounter.reset()
};
