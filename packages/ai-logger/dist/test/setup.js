"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
require("@testing-library/react");
const vitest_1 = require("vitest");
console.log('[Test Setup] Initializing test environment');
// Use real timers for React effects and async operations
vitest_1.vi.useRealTimers();
console.log('[Test Setup] Using real timers');
// Mock UUID generation consistently
Object.defineProperty(window, 'crypto', {
    value: {
        randomUUID: vitest_1.vi.fn().mockImplementation(() => {
            // Return incrementing UUIDs for testing
            if (!window.crypto._uuidCounter) {
                window.crypto._uuidCounter = 0;
            }
            const uuid = `test-uuid-${window.crypto._uuidCounter++}`;
            console.log('[Test Setup] Generated UUID:', uuid);
            return uuid;
        })
    }
});
// Add mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
    observe() { console.log('[ResizeObserver] observe called'); }
    unobserve() { console.log('[ResizeObserver] unobserve called'); }
    disconnect() { console.log('[ResizeObserver] disconnect called'); }
};
console.log('[Test Setup] Test environment initialized');
