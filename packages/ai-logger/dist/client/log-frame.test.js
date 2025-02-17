"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const utils_1 = require("../test/utils");
const log_frame_1 = require("./log-frame");
const context_1 = require("./context");
(0, vitest_1.describe)('LogFrame', () => {
    let consoleError;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Clear logs and reset frame counter
        context_1.__test__.clearLogs();
        log_frame_1.__test__.resetFrameCounter();
        // Suppress React error boundary logs
        consoleError = console.error;
        console.error = vitest_1.vi.fn();
    });
    afterEach(() => {
        console.error = consoleError;
    });
    (0, vitest_1.test)('creates nested logging context', async () => {
        const frames = [];
        function TestComponent() {
            const frameLogger = (0, log_frame_1.useLogFrame)();
            react_1.default.useEffect(() => {
                frames.push({
                    frameId: frameLogger.frameId,
                    parentFrameId: frameLogger.parentFrameId
                });
            }, [frameLogger.frameId, frameLogger.parentFrameId]);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        const { unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsxs)(log_frame_1.LogFrame, { name: "parent", children: [(0, jsx_runtime_1.jsx)(TestComponent, {}), (0, jsx_runtime_1.jsx)(log_frame_1.LogFrame, { name: "child", children: (0, jsx_runtime_1.jsx)(TestComponent, {}) })] }));
        await (0, utils_1.waitForStateUpdate)();
        (0, vitest_1.expect)(frames).toHaveLength(2);
        (0, vitest_1.expect)(frames[0].parentFrameId).toBeUndefined();
        (0, vitest_1.expect)(frames[1].parentFrameId).toBe(frames[0].frameId);
        await unmount();
    });
    (0, vitest_1.test)('logs frame entry and exit', async () => {
        const { getLogs, unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(log_frame_1.LogFrame, { name: "test-frame", metadata: { custom: 'value' }, children: (0, jsx_runtime_1.jsx)("div", { children: "Test content" }) }));
        await (0, utils_1.waitForStateUpdate)();
        // Check enter logs
        const logs = getLogs();
        const enterLogs = logs.filter((log) => log.message.includes('Enter frame: test-frame'));
        (0, vitest_1.expect)(enterLogs).toHaveLength(1);
        (0, vitest_1.expect)(enterLogs[0].metadata).toMatchObject({
            custom: 'value',
            frameId: 'frame-0'
        });
        // Unmount to trigger exit logs
        await unmount();
        await (0, utils_1.waitForStateUpdate)();
        // Check exit logs
        const exitLogs = getLogs().filter((log) => log.message.includes('Exit frame: test-frame'));
        (0, vitest_1.expect)(exitLogs).toHaveLength(1);
        (0, vitest_1.expect)(exitLogs[0].metadata).toMatchObject({
            custom: 'value',
            frameId: 'frame-0'
        });
    });
    (0, vitest_1.test)('wraps component with LogFrame using HOC', async () => {
        function TestComponent() {
            const frameLogger = (0, log_frame_1.useLogFrame)();
            react_1.default.useEffect(() => {
                void frameLogger.info('Component mounted');
            }, [frameLogger]);
            return (0, jsx_runtime_1.jsx)("div", { children: "Test" });
        }
        const WrappedComponent = (0, log_frame_1.withLogging)(TestComponent, {
            name: 'TestComponent',
            metadata: { type: 'test' }
        });
        const { container, getLogs } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(WrappedComponent, {}));
        await (0, utils_1.waitForStateUpdate)();
        (0, vitest_1.expect)(container.textContent).toBe('Test');
        const logs = getLogs();
        (0, vitest_1.expect)(logs.some((log) => log.message === 'Component mounted')).toBe(true);
        (0, vitest_1.expect)(logs.some((log) => log.message === 'Enter frame: TestComponent')).toBe(true);
    });
    (0, vitest_1.test)('throws when useLogFrame used outside LogFrame', () => {
        function TestComponent() {
            // This should throw immediately during render
            let threw = false;
            try {
                (0, log_frame_1.useLogFrame)();
            }
            catch (error) {
                threw = true;
                if (error instanceof Error) {
                    (0, vitest_1.expect)(error.name).toBe('LogFrameError');
                    (0, vitest_1.expect)(error.message).toBe('useLogFrame must be used within a LogFrame');
                }
                else {
                    throw new Error('Expected error to be instance of Error');
                }
            }
            (0, vitest_1.expect)(threw).toBe(true);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(TestComponent, {}));
    });
    (0, vitest_1.test)('handles nested logging calls', async () => {
        function TestComponent() {
            const frameLogger = (0, log_frame_1.useLogFrame)();
            react_1.default.useEffect(() => {
                void frameLogger.info('Test log');
            }, [frameLogger]);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        const { getLogs, unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(log_frame_1.LogFrame, { name: "outer", children: (0, jsx_runtime_1.jsx)(log_frame_1.LogFrame, { name: "inner", children: (0, jsx_runtime_1.jsx)(TestComponent, {}) }) }));
        await (0, utils_1.waitForStateUpdate)(200); // Wait longer for nested logs
        const logs = getLogs();
        // Check enter log sequence
        const enterFrameLogs = logs
            .filter((log) => log.message.startsWith('Enter frame:'))
            .map((log) => log.message.split(': ')[1]);
        // Parent should log before child due to log level adjustments
        (0, vitest_1.expect)(enterFrameLogs).toEqual(['outer', 'inner']);
        // Check frame hierarchy
        const innerFrameLog = logs.find((log) => log.message === 'Enter frame: inner');
        (0, vitest_1.expect)(innerFrameLog?.metadata).toMatchObject({
            frameId: 'frame-1',
            parentFrameId: 'frame-0'
        });
        await unmount();
    });
});
