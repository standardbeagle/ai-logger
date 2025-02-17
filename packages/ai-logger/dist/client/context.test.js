"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const jsx_runtime_1 = require("react/jsx-runtime");
const react_1 = __importDefault(require("react"));
const vitest_1 = require("vitest");
const utils_1 = require("../test/utils");
const context_1 = require("./context");
const api_1 = require("./api");
// Mock needs to be before imports
vitest_1.vi.mock('./api', () => ({
    uploadLogs: vitest_1.vi.fn().mockResolvedValue(undefined)
}));
(0, vitest_1.describe)('LogProvider', () => {
    let consoleError;
    (0, vitest_1.beforeEach)(() => {
        vitest_1.vi.clearAllMocks();
        // Clear logs before each test
        context_1.__test__.clearLogs();
        // Suppress React error boundary logs
        consoleError = console.error;
        console.error = vitest_1.vi.fn();
    });
    afterEach(() => {
        console.error = consoleError;
    });
    (0, vitest_1.test)('super basic', async () => {
        const { unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)("div", {}));
        await unmount();
    });
    (0, vitest_1.test)('provides logging context', async () => {
        function TestComponent() {
            const logger = (0, context_1.useLogger)();
            react_1.default.useEffect(() => {
                void logger.info('Test log', { test: true });
            }, [logger]);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        const { getLogs, unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(TestComponent, {}));
        await (0, utils_1.waitForStateUpdate)();
        const logs = getLogs();
        (0, vitest_1.expect)(logs).toHaveLength(1);
        (0, vitest_1.expect)(logs[0]).toMatchObject({
            level: 'info',
            message: 'Test log',
            metadata: { test: true }
        });
        await unmount();
    });
    (0, vitest_1.test)('uploads logs on error', async () => {
        const onError = vitest_1.vi.fn();
        const testError = new Error('Test error');
        const uploadLogsMock = vitest_1.vi.mocked(api_1.uploadLogs);
        uploadLogsMock.mockResolvedValue(undefined);
        function ErrorComponent() {
            const logger = (0, context_1.useLogger)();
            // Throw error synchronously during render
            if (!react_1.default.useRef(false).current) {
                react_1.default.useRef(false).current = true;
                void logger.info('Before error');
                throw testError;
            }
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        try {
            (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(ErrorComponent, {}), { onError });
        }
        catch (err) {
            (0, vitest_1.expect)(err).toBe(testError);
        }
        // Wait for error handling to complete
        await (0, utils_1.waitForStateUpdate)(200);
        (0, vitest_1.expect)(onError).toHaveBeenCalledWith(testError, vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                level: 'info',
                message: 'Before error'
            })
        ]));
        (0, vitest_1.expect)(uploadLogsMock).toHaveBeenCalledTimes(1);
        const uploadedLogs = uploadLogsMock.mock.calls[0][0];
        (0, vitest_1.expect)(uploadedLogs).toEqual(vitest_1.expect.arrayContaining([
            vitest_1.expect.objectContaining({
                level: 'info',
                message: 'Before error'
            })
        ]));
    });
    (0, vitest_1.test)('maintains unique request IDs', async () => {
        function TestComponent() {
            const logger = (0, context_1.useLogger)();
            react_1.default.useEffect(() => {
                void logger.info('Component rendered');
            }, [logger]);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        // Create providers with explicit request IDs
        const requestId1 = 'request-1';
        const requestId2 = 'request-2';
        const { unmount: unmount1 } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(context_1.LogProvider, { requestId: requestId1, children: (0, jsx_runtime_1.jsx)(TestComponent, {}) }));
        await (0, utils_1.waitForStateUpdate)();
        const { unmount: unmount2 } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(context_1.LogProvider, { requestId: requestId2, children: (0, jsx_runtime_1.jsx)(TestComponent, {}) }));
        await (0, utils_1.waitForStateUpdate)();
        // Get logs from store
        const allLogs = context_1.__test__.getLogs();
        const requestIds = allLogs.map((log) => log.requestId);
        (0, vitest_1.expect)(requestIds).toContain(requestId1);
        (0, vitest_1.expect)(requestIds).toContain(requestId2);
        await unmount1();
        await unmount2();
    });
    (0, vitest_1.test)('preserves log order', async () => {
        function TestComponent() {
            const logger = (0, context_1.useLogger)();
            react_1.default.useEffect(() => {
                void Promise.resolve().then(async () => {
                    await logger.info('First log');
                    await logger.warn('Second log');
                    await logger.error('Third log');
                });
            }, [logger]);
            return (0, jsx_runtime_1.jsx)("div", {});
        }
        const { getLogs, unmount } = (0, utils_1.renderWithLogger)((0, jsx_runtime_1.jsx)(TestComponent, {}));
        await (0, utils_1.waitForStateUpdate)(200); // Wait longer for async logs
        const logs = getLogs();
        (0, vitest_1.expect)(logs.map((l) => l.message)).toEqual([
            'First log',
            'Second log',
            'Third log'
        ]);
        (0, vitest_1.expect)(logs.map((l) => l.level)).toEqual([
            'info',
            'warn',
            'error'
        ]);
        await unmount();
    });
});
