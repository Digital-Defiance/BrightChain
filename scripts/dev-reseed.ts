/**
 * CLI Tool: Re-seed the in-memory dev block store on a running BrightChain API
 *
 * Authenticates via direct-challenge (mnemonic-based) login, then POSTs to
 * POST /api/admin/dev/reseed. Prints the new seed credentials to stdout.
 *
 * The server must be running with DEV_DATABASE set (in-memory mode).
 * Only available when the server is in dev/memory mode.
 *
 * Usage:
 *   npx tsx scripts/dev-reseed.ts [options]
 *
 * Options:
 *   --api-url <url>       API base URL (default: http://localhost:3000/api)
 *   --username <name>     Admin username  (required unless --token is set)
 *   --email <email>       Admin email     (alternative to --username)
 *   --mnemonic <words>    Admin BIP39 mnemonic (required unless --token is set)
 *   --token <jwt>         Pre-existing admin JWT (skips direct-challenge login)
 *
 * @module scripts/dev-reseed
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface HttpResult<T = unknown> {
  status: number;
  data: T;
}

interface ParsedArgs {
  apiUrl: string;
  usernameOrEmail?: string;
  mnemonic?: string;
  token?: string;
}

// ── HTTP helpers ─────────────────────────────────────────────────────────────

async function httpPost<T = unknown>(
  url: string,
  body: Record<string, unknown>,
  token?: string,
): Promise<HttpResult<T>> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify(body),
  });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

// ── Direct-challenge login ───────────────────────────────────────────────────

async function loginWithMnemonic(
  apiUrl: string,
  usernameOrEmail: string,
  mnemonic: string,
): Promise<string> {
  // Step 1: Request a challenge
  const challengeResult = await httpPost<{
    message?: string;
    challenge?: string;
    serverPublicKey?: string;
    error?: string;
  }>(`${apiUrl}/user/request-direct-login`, {});

  if (challengeResult.status !== 200) {
    const msg =
      (challengeResult.data as Record<string, unknown>)?.['message'] ??
      (challengeResult.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${challengeResult.status}`;
    throw new Error(`Challenge request failed: ${msg}`);
  }

  const challenge = challengeResult.data?.challenge;
  if (!challenge) {
    throw new Error('Challenge response missing challenge field');
  }

  // Step 2: Derive keypair from mnemonic and sign the challenge
  const { ECIESService } =
    require('@digitaldefiance/node-ecies-lib') as typeof import('@digitaldefiance/node-ecies-lib');
  const { SecureString } =
    require('@digitaldefiance/ecies-lib') as typeof import('@digitaldefiance/ecies-lib');

  const eciesService = new ECIESService();
  const { wallet } = eciesService.walletAndSeedFromMnemonic(
    new SecureString(mnemonic),
  );
  const challengeBytes = Buffer.from(challenge, 'hex');
  const signature = eciesService.signMessage(
    wallet.getPrivateKey() as Buffer,
    challengeBytes,
  );

  // Step 3: Submit the signed challenge
  const isEmail = usernameOrEmail.includes('@');
  const identityField = isEmail
    ? { email: usernameOrEmail }
    : { username: usernameOrEmail };

  const loginResult = await httpPost<{
    message?: string;
    token?: string;
    error?: string;
  }>(`${apiUrl}/user/direct-challenge`, {
    challenge,
    signature: signature.toString('hex'),
    ...identityField,
  });

  if (loginResult.status !== 200) {
    const msg =
      (loginResult.data as Record<string, unknown>)?.['message'] ??
      (loginResult.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${loginResult.status}`;
    throw new Error(`Direct-challenge login failed: ${msg}`);
  }

  const token = loginResult.data?.token;
  if (!token) {
    throw new Error('Login response missing token');
  }

  return token;
}

// ── Arg parsing ───────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): ParsedArgs | null {
  let apiUrl = 'http://localhost:3000/api';
  let usernameOrEmail: string | undefined;
  let mnemonic: string | undefined;
  let token: string | undefined;

  const args = argv.slice(2);
  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case '--api-url':
        apiUrl = args[++i];
        break;
      case '--username':
      case '--email':
        usernameOrEmail = args[++i];
        break;
      case '--mnemonic':
        mnemonic = args[++i];
        break;
      case '--token':
        token = args[++i];
        break;
      case '--help':
      case '-h':
        return null;
      default:
        process.stderr.write(`Unknown argument: ${args[i]}\n`);
        return null;
    }
  }

  return { apiUrl, usernameOrEmail, mnemonic, token };
}

function printUsage(): void {
  process.stdout.write(`
Usage: npx tsx scripts/dev-reseed.ts [options]

Options:
  --api-url <url>       API base URL (default: http://localhost:3000/api)
  --username <name>     Admin username  (required unless --token)
  --email <email>       Admin email     (alternative to --username)
  --mnemonic <words>    Admin BIP39 mnemonic (required unless --token)
  --token <jwt>         Pre-existing admin JWT (skips direct-challenge login)

Examples:
  npx tsx scripts/dev-reseed.ts --username admin --mnemonic "word1 word2 ..."
  npx tsx scripts/dev-reseed.ts --api-url http://localhost:3005/api --username admin --mnemonic "word1 word2 ..."
  npx tsx scripts/dev-reseed.ts --token eyJhbGci...
`);
}

// ── Main ──────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args) {
    printUsage();
    process.exit(1);
  }

  let { token } = args;
  const { apiUrl, usernameOrEmail, mnemonic } = args;

  if (!token) {
    if (!usernameOrEmail) {
      process.stderr.write(
        'Error: --username or --email is required (or provide --token)\n',
      );
      printUsage();
      process.exit(1);
    }
    if (!mnemonic) {
      process.stderr.write(
        'Error: --mnemonic is required (or provide --token)\n',
      );
      printUsage();
      process.exit(1);
    }

    process.stderr.write(
      `Authenticating as "${usernameOrEmail}" via direct-challenge...\n`,
    );
    token = await loginWithMnemonic(apiUrl, usernameOrEmail, mnemonic);
    process.stderr.write('Authenticated.\n');
  }

  process.stderr.write(`Sending reseed request to ${apiUrl}/admin/dev/reseed...\n`);

  const result = await httpPost<{
    message?: string;
    credentials?: unknown;
    error?: string;
  }>(`${apiUrl}/admin/dev/reseed`, {}, token);

  if (result.status !== 200) {
    const msg =
      (result.data as Record<string, unknown>)?.['error'] ??
      (result.data as Record<string, unknown>)?.['message'] ??
      `HTTP ${result.status}`;
    process.stderr.write(`Error: ${msg}\n`);
    process.exit(1);
  }

  process.stdout.write(JSON.stringify(result.data, null, 2) + '\n');
}

main().catch((err: unknown) => {
  const message = err instanceof Error ? err.message : String(err);
  process.stderr.write(`Fatal: ${message}\n`);
  process.exit(1);
});
