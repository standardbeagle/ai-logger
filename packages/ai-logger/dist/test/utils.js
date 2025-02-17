"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.waitForStateUpdate = exports.renderWithLogger = void 0;
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = require("@testing-library/react");
const context_1 = require("../client/context");
const context_2 = require("../client/context");
// Global log queue with promise-based handling
const logQueue = [];
let logPromise = Promise.resolve();
let isProcessingLogs = false;
async function processLogQueue() {
    if (isProcessingLogs)
        return;
    isProcessingLogs = true;
    try {
        await logPromise;
    }
    finally {
        isProcessingLogs = false;
    }
}
function safeAct(callback) {
    let result;
    (0, react_1.act)(() => {
        const maybePromise = callback();
        if (maybePromise instanceof Promise) {
            throw new Error('Synchronous act() received a promise; use await act() instead');
        }
        result = maybePromise;
    });
    return result;
}
function renderWithLogger(ui, options = {}) {
    const { requestId, onError, ...renderOptions } = options;
    // Create wrapper with logging context
    const Wrapper = ({ children }) => ((0, jsx_runtime_1.jsx)(context_1.LogProvider, { requestId: requestId, onError: onError, onLog: (log) => {
            logQueue.push(log);
            logPromise = logPromise.then(() => Promise.resolve());
        }, children: children }));
    const result = safeAct(() => (0, react_1.render)(ui, {
        wrapper: Wrapper,
        ...renderOptions
    }));
    return {
        ...result,
        getLogs: () => {
            const currentLogs = [...logQueue];
            logQueue.length = 0;
            return currentLogs;
        },
        unmount: async () => {
            let unmountError;
            await (0, react_1.act)(async () => {
                try {
                    result.unmount();
                    await waitForStateUpdate();
                }
                catch (error) {
                    unmountError = error;
                }
            });
            if (unmountError)
                throw unmountError;
        }
    };
}
exports.renderWithLogger = renderWithLogger;
// Helper to wait for state updates and effects
async function waitForStateUpdate(timeout = 100) {
    try {
        await (0, react_1.act)(async () => {
            // Wait for any pending log operations
            await processLogQueue();
            // Wait for React effects and async operations
            await new Promise(resolve => setTimeout(resolve, timeout));
        });
    }
    catch (error) {
        if (error instanceof Error &&
            error.message !== 'Should not already be working.' &&
            !error.message.includes('nested act')) {
            console.error('Error in waitForStateUpdate:', error);
            throw error;
        }
        // Ignore React concurrent mode warnings
    }
}
exports.waitForStateUpdate = waitForStateUpdate;
// Cleanup before each test
beforeEach(() => {
    context_2.__test__.clearLogs();
    logQueue.length = 0;
    logPromise = Promise.resolve();
    isProcessingLogs = false;
});
