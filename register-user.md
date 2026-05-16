# yarn register-user

## Usage

```bash
# Minimal — password auto-generated, uses test email route (EMAIL_SERVICE=fake)
yarn register-user --username alice --email alice@example.com

# With explicit password
yarn register-user --username alice --email alice@example.com --password "MyPass1!"

# Register with direct-challenge (passwordless key-based) login enabled
yarn register-user --username alice --email alice@example.com --direct-challenge

# Promote to admin using a password
yarn register-user \
  --username alice \
  --email alice@example.com \
  --make-admin \
  --admin-username admin \
  --admin-password "AdminPass1!"

# Promote to admin using the admin's BIP39 mnemonic (direct challenge flow)
yarn register-user \
  --username alice \
  --email alice@example.com \
  --make-admin \
  --admin-username admin \
  --admin-mnemonic "word1 word2 ... word24"

# Same as above, identifying the admin by email instead of username
yarn register-user \
  --username alice \
  --email alice@example.com \
  --make-admin \
  --admin-email admin@example.com \
  --admin-mnemonic "word1 word2 ... word24"

# Use a pre-existing admin JWT (skips login entirely)
yarn register-user \
  --username alice \
  --email alice@example.com \
  --make-admin \
  --admin-token "eyJ..."

# Against a non-default server
yarn register-user --api-url https://staging.example.com/api --username alice --email alice@example.com
```

## Options

| Flag | Description |
|---|---|
| `--api-url <url>` | API base URL (default: `http://localhost:3000/api`) |
| `--username <name>` | **Required.** New user's username |
| `--email <email>` | **Required.** New user's email address |
| `--password <pass>` | Password (auto-generated if omitted) |
| `--display-name <name>` | Display name |
| `--mnemonic <words>` | BIP39 mnemonic (server-generated if omitted) |
| `--make-admin` | Promote the new user to Admin role after registration |
| `--direct-challenge` | Enable passwordless key-based (direct challenge) login for the new user |
| `--admin-username <u>` | Admin account username (for email fetch + role promotion) |
| `--admin-email <email>` | Admin account email — required when using `--admin-mnemonic` without `--admin-username` |
| `--admin-password <p>` | Admin account password |
| `--admin-mnemonic <w>` | Admin BIP39 mnemonic — logs in via the ECIES direct-challenge flow instead of a password |
| `--admin-token <jwt>` | Pre-existing admin JWT (overrides username/password/mnemonic login) |
| `--no-sdi` | Disable OSC 7777 credential injection even if `SDI_SESSION_ID`/`SDI_SESSION_KEY` are set |

### Admin credential resolution order

1. `--admin-token` — used directly, no login required
2. `--admin-mnemonic` — performs a two-step ECIES challenge-response login; requires `--admin-email` or `--admin-username` to identify the account (the admin must have `directChallenge: true` on their account)
3. `--admin-username` + `--admin-password` — standard password login

### SDI (OSC 7777) credential injection

If the environment contains `SDI_SESSION_ID` and `SDI_SESSION_KEY` (a 32-byte AES-256 key, base64-encoded), the registered credentials are automatically injected into the running BSH Desktop Agent via an OSC 7777 escape sequence after the JSON result is printed.

The sequence is written directly to `/dev/tty` so it reaches the terminal emulator even when stdout is piped. The agent decrypts the AES-256-GCM ciphertext, validates the authentication tag, and forwards the structured `ephemeral-auth` payload to any connected browser extension or form-filler for the specified TTL (300 s).

Use `--no-sdi` to suppress injection (e.g. in CI environments where you only need the JSON output).

### Email verification strategy

Verification tokens are fetched automatically (tried in order):

1. `GET /api/test/emails/:email` — unauthenticated, works when `EMAIL_SERVICE=fake`
2. `GET /api/admin/emails/:email` — requires admin credentials

## Output (JSON on stdout, progress on stderr)

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "memberId": "...",
  "password": "...",
  "mnemonic": "word1 word2 ... word24",
  "role": "Member",
  "emailVerified": true,
  "directChallenge": false
}
```
