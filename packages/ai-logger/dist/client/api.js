"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.uploadLogs = void 0;
async function uploadLogs(logs) {
    try {
        const response = await fetch('/_log', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ logs }),
        });
        const data = await response.json();
        if (!data.success) {
            console.error('Failed to upload logs:', data.error);
        }
    }
    catch (error) {
        console.error('Failed to upload logs:', error);
    }
}
exports.uploadLogs = uploadLogs;
