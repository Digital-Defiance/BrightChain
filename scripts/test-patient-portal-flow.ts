/**
 * CLI Test Script: Patient Portal Registration Flow
 *
 * Chains the patient-portal registration APIs together in sequence,
 * validating each step's HTTP status code and response body.
 *
 * Usage:
 *   npx tsx scripts/test-patient-portal-flow.ts --base-url http://localhost:3000/api --token <jwt>
 *
 * CLI Arguments:
 *   --base-url <url>  (required) API base URL
 *   --token <jwt>     (optional) Bearer token; falls back to AUTH_TOKEN env var
 *
 * Requirements: 8.1, 8.3
 *
 * @module scripts/test-patient-portal-flow
 */

// ── Interfaces ──────────────────────────────────────────────────

export interface TestStep {
  name: string;
  method: 'GET' | 'POST' | 'DELETE';
  path: string;
  body?: Record<string, unknown>;
  expectedStatus: number;
  validate?: (data: unknown) => void;
}

export interface StepResult {
  step: string;
  status: number;
  success: boolean;
  data?: unknown;
  error?: string;
}

// ── CLI Argument Parsing ────────────────────────────────────────

export interface ParsedArgs {
  baseUrl: string;
  token: string;
}

/**
 * Parses CLI arguments from the provided argv array.
 *
 * Expects `--base-url <url>` (required) and `--token <jwt>` (optional).
 * When `--token` is omitted, falls back to the `AUTH_TOKEN` environment variable.
 *
 * @param argv - The process.argv array (or equivalent)
 * @param env  - Environment variables map (defaults to process.env)
 * @returns Parsed arguments or null if `--base-url` is missing
 */
export function parseArgs(
  argv: string[],
  env: Record<string, string | undefined> = process.env as Record<
    string,
    string | undefined
  >,
): ParsedArgs | null {
  let baseUrl: string | undefined;
  let token: string | undefined;

  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--base-url' && i + 1 < argv.length) {
      baseUrl = argv[i + 1];
      i++; // skip the value
    } else if (argv[i] === '--token' && i + 1 < argv.length) {
      token = argv[i + 1];
      i++; // skip the value
    }
  }

  if (!baseUrl) {
    return null;
  }

  // Fall back to AUTH_TOKEN env var when --token is not provided
  if (!token) {
    token = env['AUTH_TOKEN'] ?? '';
  }

  return { baseUrl, token };
}

// ── Step Logger (pure, testable) ────────────────────────────────

/**
 * Formats a log line for a completed test step.
 *
 * This is extracted as a pure function so it can be tested independently
 * (see Property 10: CLI step logger includes step name and status code).
 *
 * @param stepName   - The human-readable name of the step
 * @param statusCode - The HTTP status code returned by the step
 * @param success    - Whether the step was considered successful
 * @returns A formatted log string containing the step name and status code
 */
export function formatStepLog(
  stepName: string,
  statusCode: number,
  success: boolean,
): string {
  const icon = success ? '✓' : '✗';
  return `[${icon}] ${stepName} — HTTP ${statusCode}`;
}

// ── Step Runner ─────────────────────────────────────────────────

/**
 * Executes a single test step by calling `fetch` against the API.
 *
 * @param step    - The test step definition
 * @param baseUrl - The API base URL (e.g. `http://localhost:3000/api`)
 * @param token   - Bearer token for the Authorization header
 * @returns A StepResult describing the outcome
 */
export async function runStep(
  step: TestStep,
  baseUrl: string,
  token: string,
): Promise<StepResult> {
  const url = `${baseUrl}${step.path}`;
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(url, {
      method: step.method,
      headers,
      body: step.body ? JSON.stringify(step.body) : undefined,
    });

    const status = response.status;
    let data: unknown;

    try {
      data = await response.json();
    } catch {
      // Response may not be JSON — that's fine
      data = undefined;
    }

    const success = status === step.expectedStatus;

    // Run optional validation if the status matched
    if (success && step.validate) {
      try {
        step.validate(data);
      } catch (validationError) {
        return {
          step: step.name,
          status,
          success: false,
          data,
          error: `Validation failed: ${validationError instanceof Error ? validationError.message : String(validationError)}`,
        };
      }
    }

    // Log step result to stdout
    console.log(formatStepLog(step.name, status, success));

    if (!success) {
      return {
        step: step.name,
        status,
        success: false,
        data,
        error: `Expected HTTP ${step.expectedStatus}, got ${status}`,
      };
    }

    return { step: step.name, status, success: true, data };
  } catch (err) {
    const errorMessage =
      err instanceof Error ? err.message : String(err);

    console.log(formatStepLog(step.name, 0, false));

    return {
      step: step.name,
      status: 0,
      success: false,
      error: `Network error: ${errorMessage}`,
    };
  }
}

// ── Pipeline Runner ─────────────────────────────────────────────

/**
 * Shared context accumulated across pipeline steps.
 * Each step can read from and write to this context so that
 * response data (e.g. org ID, invitation token) flows forward.
 */
export interface PipelineContext {
  organizationId?: string;
  invitationToken?: string;
  patientRoleData?: unknown;
  rolesData?: unknown;
}

/**
 * A step factory receives the current pipeline context and returns
 * a TestStep whose body/path/validate can reference earlier results.
 */
export type StepFactory = (ctx: PipelineContext) => TestStep;

/**
 * Builds the ordered array of step factories for the patient-portal
 * registration flow.
 *
 * Steps (from design.md § CLI Test Script):
 *   1. Create a test organization (open enrollment)
 *   2. Assign PHYSICIAN role to the authenticated user at the new org
 *   3. Create an invitation for PATIENT role at the new org
 *   4. Register patient using the invitation token
 *   5. Fetch healthcare roles
 *   6. Verify the new PATIENT role has patient.reference populated
 *
 * Requirements: 8.2, 8.3
 */
export function buildStepFactories(): StepFactory[] {
  return [
    // Step 1: Create a test organization (open enrollment)
    () => ({
      name: 'Create test organization',
      method: 'POST',
      path: '/brightchart/organizations',
      body: { name: `E2E Test Org ${Date.now()}` },
      expectedStatus: 201,
    }),

    // Step 2: Assign PHYSICIAN role to the authenticated user at the new org
    (ctx) => ({
      name: 'Assign PHYSICIAN role at new org',
      method: 'POST',
      path: '/brightchart/healthcare-roles/staff',
      body: {
        memberId: 'self',
        roleCode: '309343006', // PHYSICIAN SNOMED CT code
        organizationId: ctx.organizationId,
      },
      expectedStatus: 201,
    }),

    // Step 3: Create an invitation for PATIENT role at the new org
    (ctx) => ({
      name: 'Create PATIENT invitation',
      method: 'POST',
      path: '/brightchart/invitations',
      body: {
        organizationId: ctx.organizationId,
        roleCode: '116154003', // PATIENT SNOMED CT code
      },
      expectedStatus: 201,
    }),

    // Step 4: Register patient using the invitation token
    (ctx) => ({
      name: 'Register patient with invitation token',
      method: 'POST',
      path: '/brightchart/healthcare-roles/patient',
      body: {
        organizationId: ctx.organizationId,
        invitationToken: ctx.invitationToken,
      },
      expectedStatus: 201,
    }),

    // Step 5: Fetch healthcare roles
    () => ({
      name: 'Fetch healthcare roles',
      method: 'GET',
      path: '/brightchart/healthcare-roles',
      expectedStatus: 200,
    }),

    // Step 6: Verify the PATIENT role has patient.reference populated
    (ctx) => ({
      name: 'Verify PATIENT role has patient.reference',
      method: 'GET',
      path: '/brightchart/healthcare-roles',
      expectedStatus: 200,
      validate: (data: unknown) => {
        const envelope = data as { data?: Array<Record<string, unknown>> };
        const roles = envelope?.data;
        if (!Array.isArray(roles)) {
          throw new Error('Expected roles array in response data');
        }

        // Find a PATIENT role at the org we created
        const patientRole = roles.find(
          (r) =>
            r['roleCode'] === '116154003' &&
            r['organization'] &&
            typeof r['organization'] === 'object' &&
            (r['organization'] as Record<string, unknown>)['reference'] ===
              `Organization/${ctx.organizationId}`,
        );

        if (!patientRole) {
          throw new Error(
            `No PATIENT role found at organization ${ctx.organizationId}`,
          );
        }

        const patient = patientRole['patient'] as
          | Record<string, unknown>
          | undefined;
        if (!patient || !patient['reference']) {
          throw new Error(
            'PATIENT role exists but patient.reference is not populated',
          );
        }
      },
    }),
  ];
}

/**
 * Extracts pipeline context from a step result's response data.
 *
 * After each step, this function inspects the response to pull out
 * values needed by subsequent steps (org ID, invitation token, etc.).
 */
function updateContext(
  ctx: PipelineContext,
  stepIndex: number,
  result: StepResult,
): void {
  const envelope = result.data as
    | { data?: Record<string, unknown> }
    | undefined;
  const data = envelope?.data;

  switch (stepIndex) {
    case 0: {
      // Step 1 response: created organization — extract _id
      if (data && typeof data['_id'] === 'string') {
        ctx.organizationId = data['_id'];
      }
      break;
    }
    case 2: {
      // Step 3 response: created invitation — extract token
      if (data && typeof data['token'] === 'string') {
        ctx.invitationToken = data['token'];
      }
      break;
    }
    case 3: {
      // Step 4 response: registered patient role
      ctx.patientRoleData = data;
      break;
    }
    case 4: {
      // Step 5 response: all roles
      ctx.rolesData = data;
      break;
    }
  }
}

/**
 * Runs the full patient-portal registration pipeline.
 *
 * Executes each step sequentially, passing response data between steps
 * via a shared PipelineContext. Implements fail-fast: stops on the first
 * failure and returns all results collected so far.
 *
 * @param baseUrl - API base URL (e.g. `http://localhost:3000/api`)
 * @param token   - Bearer token for authentication
 * @param stepFactories - Optional custom step factories (defaults to buildStepFactories())
 * @returns Object with overall success flag and per-step results
 *
 * Requirements: 8.2, 8.3, 8.4, 8.5
 */
export async function runPipeline(
  baseUrl: string,
  token: string,
  stepFactories?: StepFactory[],
): Promise<{ success: boolean; results: StepResult[] }> {
  const factories = stepFactories ?? buildStepFactories();
  const ctx: PipelineContext = {};
  const results: StepResult[] = [];

  for (let i = 0; i < factories.length; i++) {
    const step = factories[i](ctx);
    const result = await runStep(step, baseUrl, token);
    results.push(result);

    if (result.success) {
      updateContext(ctx, i, result);
    } else {
      // Fail-fast: log error details and stop
      console.error(`\nPipeline failed at step ${i + 1}: ${result.step}`);
      if (result.error) {
        console.error(`  Error: ${result.error}`);
      }
      if (result.data) {
        console.error(`  Response: ${JSON.stringify(result.data, null, 2)}`);
      }
      return { success: false, results };
    }
  }

  return { success: true, results };
}

// ── Main (only runs when executed directly) ─────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args) {
    console.error(
      'Usage: npx tsx scripts/test-patient-portal-flow.ts --base-url <url> [--token <jwt>]',
    );
    console.error('Error: --base-url is required');
    process.exit(1);
  }

  console.log(`Base URL: ${args.baseUrl}`);
  console.log(`Token:    ${args.token ? '(provided)' : '(none)'}`);
  console.log('');

  const { success, results } = await runPipeline(args.baseUrl, args.token);

  console.log('');
  if (success) {
    console.log(
      `✅ All ${results.length} steps passed — patient portal registration path is functional.`,
    );
    process.exit(0);
  } else {
    const passed = results.filter((r) => r.success).length;
    const failed = results.length - passed;
    console.error(
      `❌ Pipeline failed: ${passed} passed, ${failed} failed out of ${results.length} steps executed.`,
    );
    process.exit(1);
  }
}

// Run main only when this file is the entry point
const isDirectRun =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  (process.argv[1].endsWith('test-patient-portal-flow.ts') ||
    process.argv[1].endsWith('test-patient-portal-flow.js'));

if (isDirectRun) {
  main().catch((err) => {
    console.error('Unexpected error:', err);
    process.exit(1);
  });
}
