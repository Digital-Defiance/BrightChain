/**
 * CLI Tool: Register a new user against a running BrightChain API
 *
 * Registers a user, verifies their email (via the test email router or the
 * admin email router), and optionally promotes them to Admin role.
 * Returns their mnemonic and password.
 *
 * Usage:
 *   npx tsx scripts/register-user.ts [options]
 *
 * Required:
 *   --api-url <url>         API base URL (default: http://localhost:3000/api)
 *   --username <name>       New user's username
 *   --email <email>         New user's email address
 *
 * Optional:
 *   --password <pass>       Password (auto-generated if omitted)
 *   --display-name <name>   Display name
 *   --mnemonic <words>      BIP39 mnemonic (server-generated if omitted)
 *   --make-admin            Promote the new user to Admin role after registration
 *   --direct-challenge      Enable direct-challenge (passwordless) login at registration time
 *   --admin-username <name> Admin account username (for email fetch + role promotion)
 *   --admin-email <email>   Admin account email (required with --admin-mnemonic)
 *   --admin-password <pass> Admin account password
 *   --admin-mnemonic <w>    Admin BIP39 mnemonic (alternative to --admin-password)
 *   --admin-token <jwt>     Pre-existing admin JWT (overrides username/password login)
 *
 * Email verification strategy (tried in order):
 *   1. GET /api/test/emails/:email  — unauthenticated, works when EMAIL_SERVICE=fake
 *   2. GET /api/admin/emails/:email — requires admin auth
 *
 * @module scripts/register-user
 */

// ── Types ────────────────────────────────────────────────────────────────────

interface ParsedArgs {
  apiUrl: string;
  username: string;
  email: string;
  password?: string;
  displayName?: string;
  mnemonic?: string;
  makeAdmin: boolean;
  directChallenge: boolean;
  adminUsername?: string;
  adminEmail?: string;
  adminPassword?: string;
  adminMnemonic?: string;
  adminToken?: string;
}

interface RegisterResponse {
  token: string;
  memberId: string;
  mnemonic?: string;
  energyBalance?: number;
}

interface CapturedEmail {
  to: string;
  subject: string;
  text: string;
  html: string;
}

interface HttpResult<T = unknown> {
  status: number;
  data: T;
}

// ── Arg Parsing ──────────────────────────────────────────────────────────────

function parseArgs(argv: string[]): ParsedArgs | null {
  let apiUrl = 'http://localhost:3000/api';
  let username: string | undefined;
  let email: string | undefined;
  let password: string | undefined;
  let displayName: string | undefined;
  let mnemonic: string | undefined;
  let makeAdmin = false;
  let directChallenge = false;
  let adminUsername: string | undefined;
  let adminEmail: string | undefined;
  let adminPassword: string | undefined;
  let adminMnemonic: string | undefined;
  let adminToken: string | undefined;

  for (let i = 2; i < argv.length; i++) {
    const flag = argv[i];
    const next = argv[i + 1];

    switch (flag) {
      case '--api-url':
        apiUrl = next;
        i++;
        break;
      case '--username':
        username = next;
        i++;
        break;
      case '--email':
        email = next;
        i++;
        break;
      case '--password':
        password = next;
        i++;
        break;
      case '--display-name':
        displayName = next;
        i++;
        break;
      case '--mnemonic':
        mnemonic = next;
        i++;
        break;
      case '--make-admin':
        makeAdmin = true;
        break;
      case '--direct-challenge':
        directChallenge = true;
        break;
      case '--admin-username':
        adminUsername = next;
        i++;
        break;
      case '--admin-email':
        adminEmail = next;
        i++;
        break;
      case '--admin-password':
        adminPassword = next;
        i++;
        break;
      case '--admin-mnemonic':
        adminMnemonic = next;
        i++;
        break;
      case '--admin-token':
        adminToken = next;
        i++;
        break;
      case '--help':
      case '-h':
        return null;
    }
  }

  if (!username || !email) {
    return null;
  }

  return {
    apiUrl: apiUrl.replace(/\/$/, ''),
    username,
    email,
    password,
    displayName,
    mnemonic,
    makeAdmin,
    directChallenge,
    adminUsername,
    adminEmail,
    adminPassword,
    adminMnemonic,
    adminToken,
  };
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

async function httpGet<T = unknown>(
  url: string,
  token?: string,
): Promise<HttpResult<T>> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(url, { method: 'GET', headers });
  const data = (await res.json()) as T;
  return { status: res.status, data };
}

async function httpPut<T = unknown>(
  url: string,
  body: Record<string, unknown>,
  token: string,
): Promise<HttpResult<T>> {
  const res = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(body),
  });

  const data = (await res.json()) as T;
  return { status: res.status, data };
}

// ── Password generation ───────────────────────────────────────────────────────

function generatePassword(): string {
  const { randomBytes } = require('crypto') as typeof import('crypto');
  // 16 random bytes → base64, replace chars to satisfy typical password rules
  const raw = randomBytes(16).toString('base64url');
  // Ensure at least one uppercase, one digit, one special char
  return `Bc1!${raw}`;
}

// ── Steps ────────────────────────────────────────────────────────────────────

async function register(
  apiUrl: string,
  username: string,
  email: string,
  password: string,
  displayName?: string,
  mnemonic?: string,
  directChallenge?: boolean,
): Promise<RegisterResponse> {
  const body: Record<string, unknown> = { username, email, password };
  if (displayName) body['displayName'] = displayName;
  if (mnemonic) body['mnemonic'] = mnemonic;
  if (directChallenge) body['directChallenge'] = true;

  const result = await httpPost<{
    message?: string;
    data?: RegisterResponse;
    error?: string;
  }>(`${apiUrl}/user/register`, body);

  if (result.status !== 201) {
    const msg =
      (result.data as Record<string, unknown>)?.['message'] ??
      (result.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${result.status}`;
    throw new Error(`Registration failed: ${msg}`);
  }

  const data = result.data?.data;
  if (!data?.token || !data?.memberId) {
    throw new Error('Registration response missing token or memberId');
  }

  return data;
}

async function adminLoginWithMnemonic(
  apiUrl: string,
  usernameOrEmail: string,
  mnemonic: string,
): Promise<string> {
  // Step 1: Request a direct-login challenge from the server
  const challengeResult = await httpPost<{
    message?: string;
    data?: { challenge?: string; serverPublicKey?: string };
    error?: string;
  }>(`${apiUrl}/user/request-direct-login`, {});

  if (challengeResult.status !== 200) {
    const msg =
      (challengeResult.data as Record<string, unknown>)?.['message'] ??
      (challengeResult.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${challengeResult.status}`;
    throw new Error(`Admin mnemonic login (challenge request) failed: ${msg}`);
  }

  const challenge = challengeResult.data?.data?.challenge;
  if (!challenge) {
    throw new Error(
      'Admin mnemonic login: challenge response missing challenge field',
    );
  }

  // Step 2: Derive the keypair from the mnemonic and sign the challenge
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

  // Step 3: Determine whether the identifier is an email or a username
  const isEmail = usernameOrEmail.includes('@');
  const identityField = isEmail
    ? { email: usernameOrEmail }
    : { username: usernameOrEmail };

  // Step 4: Submit the signed challenge response
  const loginResult = await httpPost<{
    message?: string;
    data?: { token?: string };
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
    throw new Error(`Admin mnemonic login failed: ${msg}`);
  }

  const token = loginResult.data?.data?.token;
  if (!token) {
    throw new Error('Admin mnemonic login response missing token');
  }

  return token;
}

async function adminLogin(
  apiUrl: string,
  username: string,
  password: string,
): Promise<string> {
  const result = await httpPost<{
    message?: string;
    data?: { token?: string };
    error?: string;
  }>(`${apiUrl}/user/login`, { username, password });

  if (result.status !== 200) {
    const msg =
      (result.data as Record<string, unknown>)?.['message'] ??
      (result.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${result.status}`;
    throw new Error(`Admin login failed: ${msg}`);
  }

  const token = result.data?.data?.token;
  if (!token) {
    throw new Error('Admin login response missing token');
  }

  return token;
}

async function fetchVerificationToken(
  apiUrl: string,
  email: string,
  adminToken?: string,
): Promise<string> {
  // Strategy 1: unauthenticated test router (EMAIL_SERVICE=fake)
  try {
    const testUrl = `${apiUrl}/test/emails/${encodeURIComponent(email)}`;
    const result = await httpGet<CapturedEmail[]>(testUrl);

    if (
      result.status === 200 &&
      Array.isArray(result.data) &&
      result.data.length > 0
    ) {
      const token = extractTokenFromEmails(result.data);
      if (token) return token;
    }
  } catch {
    // Not available — fall through to admin route
  }

  // Strategy 2: admin email router (requires admin auth)
  if (!adminToken) {
    throw new Error(
      'Could not retrieve verification email. ' +
        'The test email route returned nothing and no admin credentials were supplied. ' +
        'Provide --admin-username / --admin-password or --admin-token.',
    );
  }

  const adminUrl = `${apiUrl}/admin/emails/${encodeURIComponent(email)}`;
  const result = await httpGet<CapturedEmail[]>(adminUrl, adminToken);

  if (result.status !== 200 || !Array.isArray(result.data)) {
    throw new Error(
      `Admin email fetch failed with HTTP ${result.status}. ` +
        'Ensure the server is running with EMAIL_SERVICE=fake or DISABLE_EMAIL_SEND=true.',
    );
  }

  if (result.data.length === 0) {
    throw new Error(
      `No captured emails found for ${email}. ` +
        'The server may be using a real mail transport — check your inbox manually.',
    );
  }

  const token = extractTokenFromEmails(result.data);
  if (!token) {
    throw new Error(
      `Could not find a verify-email token in captured emails for ${email}.`,
    );
  }

  return token;
}

function extractTokenFromEmails(emails: CapturedEmail[]): string | null {
  // Work from newest to oldest
  for (let i = emails.length - 1; i >= 0; i--) {
    const email = emails[i];
    const sources = [email.html ?? '', email.text ?? ''];
    for (const src of sources) {
      const match = src.match(/verify-email\?token=([A-Fa-f0-9]+)/i);
      if (match?.[1]) return match[1];
    }
  }
  return null;
}

async function verifyEmail(apiUrl: string, token: string): Promise<void> {
  const result = await httpPost<{ message?: string; error?: string }>(
    `${apiUrl}/user/verify-email`,
    { token },
  );

  if (result.status !== 200) {
    const msg =
      (result.data as Record<string, unknown>)?.['message'] ??
      (result.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${result.status}`;
    throw new Error(`Email verification failed: ${msg}`);
  }
}

async function promoteToAdmin(
  apiUrl: string,
  userId: string,
  adminToken: string,
): Promise<void> {
  const result = await httpPut<{ message?: string; error?: string }>(
    `${apiUrl}/admin/users/${encodeURIComponent(userId)}/role`,
    { role: 'Admin' },
    adminToken,
  );

  if (result.status !== 200) {
    const msg =
      (result.data as Record<string, unknown>)?.['message'] ??
      (result.data as Record<string, unknown>)?.['error'] ??
      `HTTP ${result.status}`;
    throw new Error(`Role promotion failed: ${msg}`);
  }
}

// ── Main ──────────────────────────────────────────────────────────────────────

function printUsage(): void {
  console.error(`
Usage: npx tsx scripts/register-user.ts [options]

Required:
  --username <name>       New user's username
  --email <email>         New user's email address

Optional:
  --api-url <url>         API base URL (default: http://localhost:3000/api)
  --password <pass>       Password (auto-generated if omitted)
  --display-name <name>   Display name
  --mnemonic <words>      BIP39 mnemonic (server-generated if omitted)
  --make-admin            Promote the new user to Admin role after registration
  --direct-challenge      Enable direct-challenge (passwordless key-based) login
  --admin-username <u>    Admin account username (required for --make-admin)
  --admin-email <email>   Admin account email (required with --admin-mnemonic)
  --admin-password <p>    Admin account password
  --admin-mnemonic <w>    Admin BIP39 mnemonic (alternative to --admin-password)
  --admin-token <jwt>     Pre-existing admin JWT (overrides username/password)

Email verification:
  Tries GET /api/test/emails/:email first (fake/test mode, no auth).
  Falls back to GET /api/admin/emails/:email (requires admin credentials).
`);
}

async function main(): Promise<void> {
  const args = parseArgs(process.argv);

  if (!args) {
    printUsage();
    process.exit(1);
  }

  const password = args.password ?? generatePassword();

  // ── 1. Register ──────────────────────────────────────────────
  process.stderr.write(
    `Registering user "${args.username}" (${args.email})... `,
  );
  const reg = await register(
    args.apiUrl,
    args.username,
    args.email,
    password,
    args.displayName,
    args.mnemonic,
    args.directChallenge,
  );
  process.stderr.write('OK\n');

  const mnemonic =
    reg.mnemonic ?? args.mnemonic ?? '(user-provided — not returned by server)';

  // ── 2. Resolve admin token if needed ────────────────────────
  let adminToken = args.adminToken;
  if (!adminToken && args.adminMnemonic) {
    const adminIdentifier = args.adminEmail ?? args.adminUsername;
    if (!adminIdentifier) {
      throw new Error(
        '--admin-mnemonic requires --admin-email or --admin-username to identify the admin account.',
      );
    }
    process.stderr.write(
      `Logging in as admin via mnemonic (${adminIdentifier})... `,
    );
    adminToken = await adminLoginWithMnemonic(
      args.apiUrl,
      adminIdentifier,
      args.adminMnemonic,
    );
    process.stderr.write('OK\n');
  } else if (!adminToken && args.adminUsername && args.adminPassword) {
    process.stderr.write(`Logging in as admin "${args.adminUsername}"... `);
    adminToken = await adminLogin(
      args.apiUrl,
      args.adminUsername,
      args.adminPassword,
    );
    process.stderr.write('OK\n');
  }

  // ── 3. Fetch verification token from email ───────────────────
  process.stderr.write(`Fetching verification email for ${args.email}... `);
  const verificationToken = await fetchVerificationToken(
    args.apiUrl,
    args.email,
    adminToken,
  );
  process.stderr.write('OK\n');

  // ── 4. Verify email ──────────────────────────────────────────
  process.stderr.write('Verifying email address... ');
  await verifyEmail(args.apiUrl, verificationToken);
  process.stderr.write('OK\n');

  // ── 5. Promote to admin (optional) ──────────────────────────
  if (args.makeAdmin) {
    if (!adminToken) {
      throw new Error(
        '--make-admin requires admin credentials. ' +
          'Provide --admin-username / --admin-password or --admin-token.',
      );
    }
    process.stderr.write(`Promoting "${args.username}" to Admin role... `);
    await promoteToAdmin(args.apiUrl, reg.memberId, adminToken);
    process.stderr.write('OK\n');
  }

  // ── 6. Output result ─────────────────────────────────────────
  const output: Record<string, unknown> = {
    username: args.username,
    email: args.email,
    memberId: reg.memberId,
    password,
    mnemonic,
    role: args.makeAdmin ? 'Admin' : 'Member',
    emailVerified: true,
    directChallenge: args.directChallenge,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((err) => {
  const message = err instanceof Error ? err.message : String(err);
  console.error(`\nError: ${message}`);
  process.exit(1);
});
