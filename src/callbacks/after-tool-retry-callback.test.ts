import { BaseTool, SingleAfterToolCallback } from '@google/adk';
import { beforeEach, describe, expect, it, jest } from '@jest/globals';
import { VALIDATION_ATTEMPTS_KEY } from '../sub-agents/output-keys.const.js';
import { createAfterToolCallback } from './after-tool-retry-callback.js';

describe('createAfterToolCallback', () => {
  let mockState: Map<string, unknown>;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockContext: any;
  const FATAL_MSG = 'Custom fatal error message';
  const MAX_ATTEMPTS = 3;

  beforeEach(() => {
    // Reset state before each test
    mockState = new Map();
    mockContext = {
      agentName: 'TestAgent',
      state: {
        get: jest.fn((key: unknown) => mockState.get(key as string)),
        set: jest.fn((key: unknown, value: unknown) => mockState.set(key as string, value)),
      },
      actions: {
        escalate: false,
      },
    };
  });

  it('should ignore non-object responses', async () => {
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: 'some string' as unknown as Record<string, unknown>,
    });

    expect(result).toBeUndefined();
    expect(mockContext.state.set).not.toHaveBeenCalled();
  });

  it('should increment the attempt counter on a tool response', async () => {
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { status: 'ERROR' },
    });

    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(1);
    expect(mockContext.state.set).toHaveBeenCalledWith(VALIDATION_ATTEMPTS_KEY, 1);
  });

  it('should return undefined and not escalate if attempts < maxAttempts and status is unsuccessful', async () => {
    mockState.set(VALIDATION_ATTEMPTS_KEY, 1); // Mock 1 previous attempt
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { status: 'ERROR' },
    });

    expect(result).toBeUndefined();
    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(2);
    expect(mockContext.actions.escalate).toBe(false);
  });

  it('should return FATAL_ERROR and escalate if attempts >= maxAttempts and status is ERROR', async () => {
    mockState.set(VALIDATION_ATTEMPTS_KEY, 2); // Mock 2 previous attempts
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { status: 'ERROR' },
    });

    expect(result).toEqual({
      status: 'FATAL_ERROR',
      message: FATAL_MSG,
    });
    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(3);
    expect(mockContext.actions.escalate).toBe(true);
  });

  it('should return FATAL_ERROR and escalate if attempts >= maxAttempts and status is FATAL_ERROR', async () => {
    mockState.set(VALIDATION_ATTEMPTS_KEY, 2); // Mock 2 previous attempts
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { status: 'FATAL_ERROR' },
    });

    expect(result).toEqual({
      status: 'FATAL_ERROR',
      message: FATAL_MSG,
    });
    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(3);
    expect(mockContext.actions.escalate).toBe(true);
  });

  it('should return FATAL_ERROR and escalate if attempts >= maxAttempts and status is missing', async () => {
    mockState.set(VALIDATION_ATTEMPTS_KEY, 2); // Mock 2 previous attempts
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { message: 'Something went wrong but no status' },
    });

    expect(result).toEqual({
      status: 'FATAL_ERROR',
      message: FATAL_MSG,
    });
    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(3);
    expect(mockContext.actions.escalate).toBe(true);
  });

  it('should return undefined and not escalate if attempts >= maxAttempts but status is SUCCESS', async () => {
    mockState.set(VALIDATION_ATTEMPTS_KEY, 2); // Mock 2 previous attempts
    const callback = createAfterToolCallback(FATAL_MSG, 'TEST_KEY', MAX_ATTEMPTS) as SingleAfterToolCallback;

    const result = await callback({
      tool: { name: 'test_tool' } as BaseTool,
      args: {},
      context: mockContext,
      response: { status: 'SUCCESS' },
    });

    expect(result).toBeUndefined();
    expect(mockState.get(VALIDATION_ATTEMPTS_KEY)).toBe(3);
    expect(mockContext.actions.escalate).toBe(false);
  });
});
