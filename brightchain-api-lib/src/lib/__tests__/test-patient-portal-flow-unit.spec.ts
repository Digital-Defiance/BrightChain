/**
 * CLI Script Step Execution Logic – Unit Tests
 *
 * Feature: patient-portal-registration
 * Task: 3.4
 *
 * Validates: Requirements 8.1, 8.4, 8.5
 */

import {
  parseArgs,
  runStep,
  runPipeline,
  formatStepLog,
  TestStep,
  StepResult,
  StepFactory,
} from '../../../../scripts/test-patient-portal-flow';

// ── parseArgs ───────────────────────────────────────────────────

describe('parseArgs', () => {
  it('parses --base-url and --token correctly', () => {
    const result = parseArgs(
      ['node', 'script.ts', '--base-url', 'http://localhost:3000/api', '--token', 'my-jwt'],
      {},
    );
    expect(result).toEqual({
      baseUrl: 'http://localhost:3000/api',
      token: 'my-jwt',
    });
  });

  it('returns null when --base-url is missing', () => {
    const result = parseArgs(['node', 'script.ts', '--token', 'my-jwt'], {});
    expect(result).toBeNull();
  });

  it('falls back to AUTH_TOKEN env var when --token is omitted', () => {
    const result = parseArgs(
      ['node', 'script.ts', '--base-url', 'http://localhost:3000/api'],
      { AUTH_TOKEN: 'env-token' },
    );
    expect(result).toEqual({
      baseUrl: 'http://localhost:3000/api',
      token: 'env-token',
    });
  });

  it('uses empty string when --token is omitted and AUTH_TOKEN is not set', () => {
    const result = parseArgs(
      ['node', 'script.ts', '--base-url', 'http://localhost:3000/api'],
      {},
    );
    expect(result).toEqual({
      baseUrl: 'http://localhost:3000/api',
      token: '',
    });
  });
});

// ── runStep ─────────────────────────────────────────────────────

describe('runStep', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns success when response status matches expectedStatus', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 201,
      json: () => Promise.resolve({ data: { _id: 'org-1' } }),
    });

    const step: TestStep = {
      name: 'Create org',
      method: 'POST',
      path: '/brightchart/organizations',
      body: { name: 'Test Org' },
      expectedStatus: 201,
    };

    const result = await runStep(step, 'http://localhost:3000/api', 'tok');

    expect(result.success).toBe(true);
    expect(result.status).toBe(201);
    expect(result.step).toBe('Create org');
  });

  it('returns failure when response status does not match expectedStatus', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 500,
      json: () => Promise.resolve({ error: 'Internal Server Error' }),
    });

    const step: TestStep = {
      name: 'Create org',
      method: 'POST',
      path: '/brightchart/organizations',
      body: { name: 'Test Org' },
      expectedStatus: 201,
    };

    const result = await runStep(step, 'http://localhost:3000/api', 'tok');

    expect(result.success).toBe(false);
    expect(result.status).toBe(500);
    expect(result.error).toContain('Expected HTTP 201, got 500');
  });

  it('returns failure on network error', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('Connection refused'));

    const step: TestStep = {
      name: 'Fetch roles',
      method: 'GET',
      path: '/brightchart/healthcare-roles',
      expectedStatus: 200,
    };

    const result = await runStep(step, 'http://localhost:3000/api', 'tok');

    expect(result.success).toBe(false);
    expect(result.status).toBe(0);
    expect(result.error).toContain('Network error');
    expect(result.error).toContain('Connection refused');
  });

  it('sends Authorization header when token is provided', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({}),
    });

    const step: TestStep = {
      name: 'Get roles',
      method: 'GET',
      path: '/brightchart/healthcare-roles',
      expectedStatus: 200,
    };

    await runStep(step, 'http://localhost:3000/api', 'my-jwt');

    expect(global.fetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/brightchart/healthcare-roles',
      expect.objectContaining({
        headers: expect.objectContaining({
          Authorization: 'Bearer my-jwt',
        }),
      }),
    );
  });
});

// ── runPipeline fail-fast ───────────────────────────────────────

describe('runPipeline', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
  });

  it('returns success and all results when every step passes', async () => {
    global.fetch = jest.fn().mockResolvedValue({
      status: 200,
      json: () => Promise.resolve({ data: {} }),
    });

    const factories: StepFactory[] = [
      () => ({ name: 'Step A', method: 'GET', path: '/a', expectedStatus: 200 }),
      () => ({ name: 'Step B', method: 'GET', path: '/b', expectedStatus: 200 }),
      () => ({ name: 'Step C', method: 'GET', path: '/c', expectedStatus: 200 }),
    ];

    const { success, results } = await runPipeline('http://localhost', 'tok', factories);

    expect(success).toBe(true);
    expect(results).toHaveLength(3);
    expect(results.every((r) => r.success)).toBe(true);
  });

  it('stops on first failure (fail-fast) and returns partial results', async () => {
    let callCount = 0;
    global.fetch = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 2) {
        // Second step returns unexpected status
        return Promise.resolve({
          status: 500,
          json: () => Promise.resolve({ error: 'boom' }),
        });
      }
      return Promise.resolve({
        status: 200,
        json: () => Promise.resolve({ data: {} }),
      });
    });

    const factories: StepFactory[] = [
      () => ({ name: 'Step 1', method: 'GET', path: '/one', expectedStatus: 200 }),
      () => ({ name: 'Step 2', method: 'GET', path: '/two', expectedStatus: 200 }),
      () => ({ name: 'Step 3', method: 'GET', path: '/three', expectedStatus: 200 }),
    ];

    const { success, results } = await runPipeline('http://localhost', 'tok', factories);

    expect(success).toBe(false);
    // Only 2 steps executed — pipeline stopped at the failing step
    expect(results).toHaveLength(2);
    expect(results[0].success).toBe(true);
    expect(results[1].success).toBe(false);
  });

  it('does not execute subsequent steps after a failure', async () => {
    const fetchMock = jest.fn()
      .mockResolvedValueOnce({ status: 404, json: () => Promise.resolve({}) })

    global.fetch = fetchMock;

    const factories: StepFactory[] = [
      () => ({ name: 'Failing step', method: 'GET', path: '/fail', expectedStatus: 200 }),
      () => ({ name: 'Never reached', method: 'GET', path: '/never', expectedStatus: 200 }),
    ];

    const { success, results } = await runPipeline('http://localhost', 'tok', factories);

    expect(success).toBe(false);
    expect(results).toHaveLength(1);
    // fetch was only called once — second step was never executed
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('returns success:false when any step fails (non-zero exit path)', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('ECONNREFUSED'));

    const factories: StepFactory[] = [
      () => ({ name: 'Network fail', method: 'GET', path: '/x', expectedStatus: 200 }),
    ];

    const { success, results } = await runPipeline('http://localhost', 'tok', factories);

    expect(success).toBe(false);
    expect(results).toHaveLength(1);
    expect(results[0].error).toContain('Network error');
  });
});
