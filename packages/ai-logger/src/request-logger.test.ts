import { describe, test, expect, beforeEach, vi } from 'vitest';
import { RequestLogger } from './request-logger';
import * as winstonLogger from './winston-logger';
import type { LogEntry } from './types';

// Mock winston-logger
vi.mock('./winston-logger', () => ({
  persistLogs: vi.fn(),
  persistError: vi.fn(),
  getWinstonLogger: vi.fn()
}));

describe('RequestLogger', () => {
  const requestId = 'test-request-123';

  beforeEach(() => {
    RequestLogger.clearContext();
    vi.clearAllMocks();
  });

  test('should create log entries within request context', async () => {
    await RequestLogger.run({ requestId }, () => {
      RequestLogger.info('Test message');
      RequestLogger.error('Error message', { errorCode: 500 });

      const logs = RequestLogger.getRequestLogs();
      expect(logs).toHaveLength(2);
      expect(logs[0].message).toBe('Test message');
      expect(logs[0].level).toBe('info');
      expect(logs[0].requestId).toBe(requestId);
      expect(logs[1].message).toBe('Error message');
      expect(logs[1].level).toBe('error');
      expect(logs[1].metadata).toEqual({ errorCode: 500 });
    });
  });

  test('should throw error when logging outside request context', () => {
    expect(() => RequestLogger.info('Test message')).toThrow(
      'No logging context found'
    );
  });

  test('should handle nested contexts correctly', async () => {
    const outerRequestId = 'outer-request';
    const innerRequestId = 'inner-request';

    await RequestLogger.run({ requestId: outerRequestId }, async () => {
      RequestLogger.info('Outer message');

      await RequestLogger.run({ requestId: innerRequestId }, () => {
        RequestLogger.info('Inner message');
        const innerLogs = RequestLogger.getRequestLogs();
        expect(innerLogs[0].requestId).toBe(innerRequestId);
      });

      const outerLogs = RequestLogger.getRequestLogs();
      expect(outerLogs[0].requestId).toBe(outerRequestId);
    });
  });

  test('should handle async operations', async () => {
    await RequestLogger.run({ requestId }, async () => {
      await Promise.resolve();
      RequestLogger.info('Async message');
      
      const logs = RequestLogger.getRequestLogs();
      expect(logs).toHaveLength(1);
      expect(logs[0].message).toBe('Async message');
    });
  });

  test('should persist logs on error', async () => {
    expect.assertions(3);

    try {
      await RequestLogger.run({ requestId }, async () => {
        RequestLogger.info('Before error');
        throw new Error('Test error');
      });
    } catch (error) {
      // Verify logs were persisted automatically
      expect(winstonLogger.persistLogs).toHaveBeenCalledTimes(1);
      expect(winstonLogger.persistLogs).toHaveBeenCalledWith([
        expect.objectContaining({
          level: 'info',
          message: 'Before error',
          requestId
        }),
        expect.objectContaining({
          level: 'error',
          message: 'Error in logging context',
          requestId,
          metadata: expect.objectContaining({
            error: 'Test error'
          })
        })
      ]);
      expect(error).toBeInstanceOf(Error);
    }
  });
});