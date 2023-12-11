import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  Container,
  Divider,
  FormControlLabel,
  FormGroup,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Paper,
  Slider,
  Stack,
  Tab,
  Tabs,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Simulated BrightPass types
// ---------------------------------------------------------------------------

interface VaultEntry {
  id: string;
  type: 'login' | 'note' | 'card';
  label: string;
  createdAt: Date;
  data: LoginData | NoteData | CardData;
}

interface LoginData {
  username: string;
  password: string;
  url?: string;
}

interface NoteData {
  content: string;
}

interface CardData {
  cardholderName: string;
  lastFour: string;
  expiry: string;
}

interface PasswordOptions {
  length: number;
  uppercase: boolean;
  lowercase: boolean;
  digits: boolean;
  symbols: boolean;
}

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

// ---------------------------------------------------------------------------
// Simulated vault (in-memory encrypted block store)
// ---------------------------------------------------------------------------

class SimulatedVault {
  private entries = new Map<string, VaultEntry>();
  private locked = true;
  readonly vaultId: string;

  constructor(vaultId: string) {
    this.vaultId = vaultId;
  }

  isLocked(): boolean {
    return this.locked;
  }

  unlock(): void {
    this.locked = false;
  }

  lock(): void {
    this.locked = true;
  }

  addEntry(entry: VaultEntry): void {
    if (this.locked) throw new Error('Vault is locked');
    this.entries.set(entry.id, entry);
  }

  getEntries(): VaultEntry[] {
    if (this.locked) throw new Error('Vault is locked');
    return Array.from(this.entries.values());
  }

  getEntry(id: string): VaultEntry | undefined {
    if (this.locked) throw new Error('Vault is locked');
    return this.entries.get(id);
  }

  removeEntry(id: string): boolean {
    if (this.locked) throw new Error('Vault is locked');
    return this.entries.delete(id);
  }
}

// ---------------------------------------------------------------------------
// Crypto helpers using Web Crypto API
// ---------------------------------------------------------------------------

/** Generate a cryptographically secure password. */
function generatePassword(options: PasswordOptions): string {
  const charSets: string[] = [];
  if (options.uppercase) charSets.push('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (options.lowercase) charSets.push('abcdefghijklmnopqrstuvwxyz');
  if (options.digits) charSets.push('0123456789');
  if (options.symbols) charSets.push('!@#$%^&*()-_=+[]{}|;:,.<>?');
  if (charSets.length === 0) return '';

  const allChars = charSets.join('');
  const randomValues = new Uint32Array(options.length);
  crypto.getRandomValues(randomValues);

  return Array.from(randomValues)
    .map((v) => allChars[v % allChars.length])
    .join('');
}

/** Simulate a k-anonymity breach check using SHA-1 prefix. */
async function simulateBreachCheck(
  password: string,
): Promise<{ breached: boolean; prefix: string; count: number }> {
  const encoded = new TextEncoder().encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', encoded);
  const hashHex = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
    .toUpperCase();
  const prefix = hashHex.slice(0, 5);

  // Simulate: common passwords are "breached", others are not
  const commonPrefixes = ['5BAA6', '7C4A8', 'E38AD', 'D8578', 'B1B37'];
  const breached = commonPrefixes.includes(prefix);
  const count = breached ? Math.floor(Math.random() * 10000) + 100 : 0;

  return { breached, prefix, count };
}

/** Generate a mock TOTP secret (base32-encoded). */
function generateTOTPSecret(): string {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  return base32Encode(bytes);
}

/** Simple base32 encoding for TOTP secrets. */
function base32Encode(data: Uint8Array): string {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  let bits = 0;
  let value = 0;
  let result = '';
  for (const byte of data) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      bits -= 5;
      result += alphabet[(value >>> bits) & 0x1f];
    }
  }
  if (bits > 0) {
    result += alphabet[(value << (5 - bits)) & 0x1f];
  }
  return result;
}

/** Simulate TOTP code generation (time-based 6-digit code). */
function simulateTOTPCode(): string {
  // Real TOTP uses HMAC-SHA1 with a time counter; we simulate a 6-digit code
  const timeStep = Math.floor(Date.now() / 30000);
  const pseudoCode = ((timeStep * 7919) % 1000000).toString().padStart(6, '0');
  return pseudoCode;
}

/** Estimate password strength (0-100). */
function estimatePasswordStrength(password: string): number {
  if (!password) return 0;
  let score = 0;
  score += Math.min(password.length * 4, 40);
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 15;
  if (/\d/.test(password)) score += 15;
  if (/[^a-zA-Z0-9]/.test(password)) score += 20;
  if (new Set(password).size > password.length * 0.7) score += 10;
  return Math.min(score, 100);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const BrightPassDemo: React.FC = () => {
  // Vault state
  const [vault, setVault] = useState<SimulatedVault | null>(null);
  const [vaultName, setVaultName] = useState('');
  const [vaultUnlocked, setVaultUnlocked] = useState(false);

  // Credential form state
  const [credTab, setCredTab] = useState(0);
  const [loginLabel, setLoginLabel] = useState('');
  const [loginUsername, setLoginUsername] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [loginUrl, setLoginUrl] = useState('');
  const [noteLabel, setNoteLabel] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [cardLabel, setCardLabel] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardLastFour, setCardLastFour] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');

  // Password generator state
  const [pwOptions, setPwOptions] = useState<PasswordOptions>({
    length: 20,
    uppercase: true,
    lowercase: true,
    digits: true,
    symbols: true,
  });
  const [generatedPassword, setGeneratedPassword] = useState('');

  // Breach check state
  const [breachPassword, setBreachPassword] = useState('');
  const [breachResult, setBreachResult] = useState<{
    breached: boolean;
    prefix: string;
    count: number;
  } | null>(null);
  const [breachChecking, setBreachChecking] = useState(false);

  // TOTP state
  const [totpSecret, setTotpSecret] = useState('');
  const [totpCode, setTotpCode] = useState('');
  const [totpSecondsLeft, setTotpSecondsLeft] = useState(30);

  // Log
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  // Helpers ----------------------------------------------------------------

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLog((prev) => [
        { id: nextId, timestamp: new Date(), message, type },
        ...prev,
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  // Vault actions ----------------------------------------------------------

  const handleCreateVault = useCallback(() => {
    const name = vaultName.trim();
    if (!name) {
      addLog('Enter a vault name.', 'warning');
      return;
    }
    const v = new SimulatedVault(name);
    v.unlock();
    setVault(v);
    setVaultUnlocked(true);
    addLog(
      `Vault "${name}" created and unlocked. In BrightChain, this creates an encrypted pool with node-specific encryption — only your ECDSA key pair can decrypt the contents.`,
      'success',
    );
    setVaultName('');
  }, [vaultName, addLog]);

  const handleLockToggle = useCallback(() => {
    if (!vault) return;
    if (vault.isLocked()) {
      vault.unlock();
      setVaultUnlocked(true);
      addLog(
        'Vault unlocked. Master key derived from your ECDSA key pair via HKDF.',
        'success',
      );
    } else {
      vault.lock();
      setVaultUnlocked(false);
      addLog('Vault locked. Encryption key wiped from memory.', 'info');
    }
  }, [vault, addLog]);

  // Store credentials ------------------------------------------------------

  const handleStoreLogin = useCallback(() => {
    if (!vault || vault.isLocked()) {
      addLog('Vault must be unlocked to store credentials.', 'warning');
      return;
    }
    if (!loginLabel.trim() || !loginUsername.trim()) {
      addLog('Label and username are required.', 'warning');
      return;
    }
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      type: 'login',
      label: loginLabel.trim(),
      createdAt: new Date(),
      data: {
        username: loginUsername.trim(),
        password: loginPassword,
        url: loginUrl.trim() || undefined,
      },
    };
    vault.addEntry(entry);
    addLog(
      `Stored login "${entry.label}" — encrypted as a block in the vault pool.`,
      'success',
    );
    setLoginLabel('');
    setLoginUsername('');
    setLoginPassword('');
    setLoginUrl('');
  }, [vault, loginLabel, loginUsername, loginPassword, loginUrl, addLog]);

  const handleStoreNote = useCallback(() => {
    if (!vault || vault.isLocked()) {
      addLog('Vault must be unlocked to store credentials.', 'warning');
      return;
    }
    if (!noteLabel.trim() || !noteContent.trim()) {
      addLog('Label and content are required.', 'warning');
      return;
    }
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      type: 'note',
      label: noteLabel.trim(),
      createdAt: new Date(),
      data: { content: noteContent.trim() },
    };
    vault.addEntry(entry);
    addLog(
      `Stored secure note "${entry.label}" — encrypted as a block in the vault pool.`,
      'success',
    );
    setNoteLabel('');
    setNoteContent('');
  }, [vault, noteLabel, noteContent, addLog]);

  const handleStoreCard = useCallback(() => {
    if (!vault || vault.isLocked()) {
      addLog('Vault must be unlocked to store credentials.', 'warning');
      return;
    }
    if (!cardLabel.trim() || !cardLastFour.trim()) {
      addLog('Label and last four digits are required.', 'warning');
      return;
    }
    if (!/^\d{4}$/.test(cardLastFour.trim())) {
      addLog('Last four digits must be exactly 4 digits.', 'error');
      return;
    }
    const entry: VaultEntry = {
      id: crypto.randomUUID(),
      type: 'card',
      label: cardLabel.trim(),
      createdAt: new Date(),
      data: {
        cardholderName: cardHolder.trim(),
        lastFour: cardLastFour.trim(),
        expiry: cardExpiry.trim(),
      },
    };
    vault.addEntry(entry);
    addLog(
      `Stored card "${entry.label}" (****${cardLastFour.trim()}) — encrypted as a block in the vault pool.`,
      'success',
    );
    setCardLabel('');
    setCardHolder('');
    setCardLastFour('');
    setCardExpiry('');
  }, [vault, cardLabel, cardHolder, cardLastFour, cardExpiry, addLog]);

  // Password generator -----------------------------------------------------

  const handleGeneratePassword = useCallback(() => {
    const pw = generatePassword(pwOptions);
    if (!pw) {
      addLog('Select at least one character set.', 'warning');
      return;
    }
    setGeneratedPassword(pw);
    const strength = estimatePasswordStrength(pw);
    addLog(
      `Generated ${pwOptions.length}-char password (strength: ${strength}/100). Uses Web Crypto API's getRandomValues() for cryptographic randomness.`,
      'success',
    );
  }, [pwOptions, addLog]);

  const handleCopyPassword = useCallback(() => {
    if (!generatedPassword) return;
    navigator.clipboard.writeText(generatedPassword).then(
      () => addLog('Password copied to clipboard.', 'success'),
      () => addLog('Failed to copy — clipboard API not available.', 'error'),
    );
  }, [generatedPassword, addLog]);

  // Breach check -----------------------------------------------------------

  const handleBreachCheck = useCallback(async () => {
    if (!breachPassword.trim()) {
      addLog('Enter a password to check.', 'warning');
      return;
    }
    setBreachChecking(true);
    setBreachResult(null);
    addLog(
      'Computing SHA-1 hash and sending only the first 5 characters (k-anonymity)…',
      'info',
    );

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 800));
    const result = await simulateBreachCheck(breachPassword);
    setBreachResult(result);
    setBreachChecking(false);

    if (result.breached) {
      addLog(
        `⚠️ Password hash prefix "${result.prefix}" found in breach database! Seen ~${result.count} times. Change this password immediately.`,
        'error',
      );
    } else {
      addLog(
        `✅ Password hash prefix "${result.prefix}" not found in breach database. This password appears safe.`,
        'success',
      );
    }
  }, [breachPassword, addLog]);

  // TOTP -------------------------------------------------------------------

  const handleSetupTOTP = useCallback(() => {
    const secret = generateTOTPSecret();
    setTotpSecret(secret);
    const code = simulateTOTPCode();
    setTotpCode(code);
    const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    setTotpSecondsLeft(secondsLeft);
    addLog(
      `TOTP secret generated: ${secret.slice(0, 8)}… (${secret.length} chars). In production, this would be stored encrypted in your vault and shared via QR code.`,
      'success',
    );
    addLog(
      `Current TOTP code: ${code} (refreshes every 30 seconds, ${secondsLeft}s remaining).`,
      'info',
    );
  }, [addLog]);

  const handleRefreshTOTP = useCallback(() => {
    if (!totpSecret) {
      addLog('Set up TOTP first.', 'warning');
      return;
    }
    const code = simulateTOTPCode();
    setTotpCode(code);
    const secondsLeft = 30 - (Math.floor(Date.now() / 1000) % 30);
    setTotpSecondsLeft(secondsLeft);
    addLog(`Refreshed TOTP code: ${code} (${secondsLeft}s remaining).`, 'info');
  }, [totpSecret, addLog]);

  // Vault entries display --------------------------------------------------

  const vaultEntries = vault && !vault.isLocked() ? vault.getEntries() : [];

  const entryIcon = (type: VaultEntry['type']): string => {
    switch (type) {
      case 'login':
        return '🔑';
      case 'note':
        return '📝';
      case 'card':
        return '💳';
    }
  };

  const entrySecondary = (entry: VaultEntry): string => {
    switch (entry.type) {
      case 'login': {
        const d = entry.data as LoginData;
        return `${d.username}${d.url ? ` — ${d.url}` : ''}`;
      }
      case 'note':
        return (entry.data as NoteData).content.slice(0, 60) + '…';
      case 'card': {
        const d = entry.data as CardData;
        return `****${d.lastFour} — ${d.cardholderName}`;
      }
    }
  };

  const strengthColor = (score: number): 'error' | 'warning' | 'success' => {
    if (score < 40) return 'error';
    if (score < 70) return 'warning';
    return 'success';
  };

  // Render -----------------------------------------------------------------

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        BrightPass Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        BrightPass is BrightChain's decentralised password manager and
        credential vault. Credentials are stored as encrypted blocks in the
        block store, with each vault backed by a pool using{' '}
        <strong>node-specific encryption</strong> — only the owner's ECDSA key
        pair can decrypt the contents. There is no central server that holds
        your passwords.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This demo simulates BrightPass operations entirely in the browser. The
        password generator uses the Web Crypto API for real cryptographic
        randomness; other operations (vault creation, breach checking, TOTP) are
        simulated to illustrate the concepts.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* ---- Section 1: Vault Creation ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Vault Creation
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          A BrightPass vault is an encrypted pool in the block store. When you
          create a vault, BrightChain creates a new pool with{' '}
          <code>EncryptionMode.NodeSpecific</code> encryption. The vault's
          master key is derived from your ECDSA key pair using HKDF ( HMAC-based
          Key Derivation Function), so only you can decrypt the contents. No
          master password is transmitted or stored anywhere.
        </Typography>
        {!vault ? (
          <Stack direction="row" spacing={1} alignItems="center">
            <TextField
              size="small"
              label="Vault Name"
              value={vaultName}
              onChange={(e) => setVaultName(e.target.value)}
              placeholder="my-vault"
              inputProps={{ 'aria-label': 'Vault name' }}
            />
            <Button variant="contained" onClick={handleCreateVault}>
              Create Vault
            </Button>
          </Stack>
        ) : (
          <Stack direction="row" spacing={1} alignItems="center">
            <Chip
              label={`Vault: ${vault.vaultId}`}
              color={vaultUnlocked ? 'success' : 'default'}
              icon={<span>{vaultUnlocked ? '🔓' : '🔒'}</span>}
            />
            <Button variant="outlined" size="small" onClick={handleLockToggle}>
              {vaultUnlocked ? 'Lock' : 'Unlock'}
            </Button>
            <Typography variant="caption" color="text.secondary">
              {vaultUnlocked
                ? 'Vault is unlocked — master key in memory'
                : 'Vault is locked — key wiped from memory'}
            </Typography>
          </Stack>
        )}
      </Paper>

      {/* ---- Section 2: Store Credentials ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Store Credentials
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          BrightPass supports three credential types: <strong>logins</strong>{' '}
          (username/password pairs with optional URL),{' '}
          <strong>secure notes</strong> (free-form encrypted text), and{' '}
          <strong>payment cards</strong> (card details). Each credential is
          serialised, encrypted with the vault's master key (AES-256-GCM), and
          stored as a block in the vault pool. The block ID is the SHA-256 hash
          of the <em>ciphertext</em>, not the plaintext.
        </Typography>

        {!vault || !vaultUnlocked ? (
          <Alert severity="info">
            Create and unlock a vault above to store credentials.
          </Alert>
        ) : (
          <>
            <Tabs
              value={credTab}
              onChange={(_, v: number) => setCredTab(v)}
              sx={{ mb: 2 }}
              aria-label="Credential type tabs"
            >
              <Tab label="🔑 Login" />
              <Tab label="📝 Secure Note" />
              <Tab label="💳 Payment Card" />
            </Tabs>

            {credTab === 0 && (
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="Label"
                  value={loginLabel}
                  onChange={(e) => setLoginLabel(e.target.value)}
                  placeholder="GitHub"
                  inputProps={{ 'aria-label': 'Login label' }}
                />
                <TextField
                  size="small"
                  label="Username"
                  value={loginUsername}
                  onChange={(e) => setLoginUsername(e.target.value)}
                  placeholder="user@example.com"
                  inputProps={{ 'aria-label': 'Login username' }}
                />
                <TextField
                  size="small"
                  label="Password"
                  type="password"
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  inputProps={{ 'aria-label': 'Login password' }}
                />
                <TextField
                  size="small"
                  label="URL (optional)"
                  value={loginUrl}
                  onChange={(e) => setLoginUrl(e.target.value)}
                  placeholder="https://github.com"
                  inputProps={{ 'aria-label': 'Login URL' }}
                />
                <Button
                  variant="contained"
                  onClick={handleStoreLogin}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Store Login
                </Button>
              </Stack>
            )}

            {credTab === 1 && (
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="Label"
                  value={noteLabel}
                  onChange={(e) => setNoteLabel(e.target.value)}
                  placeholder="Recovery Seed"
                  inputProps={{ 'aria-label': 'Note label' }}
                />
                <TextField
                  size="small"
                  label="Content"
                  multiline
                  rows={3}
                  value={noteContent}
                  onChange={(e) => setNoteContent(e.target.value)}
                  placeholder="Your secret note content…"
                  inputProps={{ 'aria-label': 'Note content' }}
                />
                <Button
                  variant="contained"
                  onClick={handleStoreNote}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Store Note
                </Button>
              </Stack>
            )}

            {credTab === 2 && (
              <Stack spacing={1}>
                <TextField
                  size="small"
                  label="Label"
                  value={cardLabel}
                  onChange={(e) => setCardLabel(e.target.value)}
                  placeholder="Visa ending 4242"
                  inputProps={{ 'aria-label': 'Card label' }}
                />
                <TextField
                  size="small"
                  label="Cardholder Name"
                  value={cardHolder}
                  onChange={(e) => setCardHolder(e.target.value)}
                  placeholder="Jane Doe"
                  inputProps={{ 'aria-label': 'Cardholder name' }}
                />
                <TextField
                  size="small"
                  label="Last 4 Digits"
                  value={cardLastFour}
                  onChange={(e) => setCardLastFour(e.target.value)}
                  placeholder="4242"
                  inputProps={{
                    maxLength: 4,
                    'aria-label': 'Card last four digits',
                  }}
                />
                <TextField
                  size="small"
                  label="Expiry (MM/YY)"
                  value={cardExpiry}
                  onChange={(e) => setCardExpiry(e.target.value)}
                  placeholder="12/25"
                  inputProps={{ 'aria-label': 'Card expiry' }}
                />
                <Button
                  variant="contained"
                  onClick={handleStoreCard}
                  sx={{ alignSelf: 'flex-start' }}
                >
                  Store Card
                </Button>
              </Stack>
            )}

            {/* Vault contents */}
            {vaultEntries.length > 0 && (
              <Box sx={{ mt: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Vault Contents ({vaultEntries.length} item
                  {vaultEntries.length !== 1 ? 's' : ''})
                </Typography>
                <List dense>
                  {vaultEntries.map((entry) => (
                    <ListItem
                      key={entry.id}
                      secondaryAction={
                        <Tooltip title="Remove from vault">
                          <IconButton
                            edge="end"
                            size="small"
                            aria-label={`Remove ${entry.label}`}
                            onClick={() => {
                              vault.removeEntry(entry.id);
                              addLog(
                                `Removed "${entry.label}" from vault.`,
                                'info',
                              );
                              // Force re-render
                              setNextId((n) => n + 1);
                            }}
                          >
                            🗑️
                          </IconButton>
                        </Tooltip>
                      }
                    >
                      <ListItemIcon sx={{ minWidth: 36 }}>
                        {entryIcon(entry.type)}
                      </ListItemIcon>
                      <ListItemText
                        primary={entry.label}
                        secondary={entrySecondary(entry)}
                      />
                    </ListItem>
                  ))}
                </List>
              </Box>
            )}
          </>
        )}
      </Paper>

      {/* ---- Section 3: Password Generator ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Password Generator
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          BrightPass generates passwords using the Web Crypto API's{' '}
          <code>crypto.getRandomValues()</code>, which provides
          cryptographically secure random values sourced from the operating
          system's entropy pool. Unlike <code>Math.random()</code>, these values
          are unpredictable and suitable for security-sensitive applications.
        </Typography>

        <Stack spacing={2}>
          <Box>
            <Typography variant="body2" gutterBottom>
              Length: {pwOptions.length}
            </Typography>
            <Slider
              value={pwOptions.length}
              onChange={(_, v) =>
                setPwOptions((o) => ({ ...o, length: v as number }))
              }
              min={8}
              max={64}
              step={1}
              marks={[
                { value: 8, label: '8' },
                { value: 20, label: '20' },
                { value: 40, label: '40' },
                { value: 64, label: '64' },
              ]}
              aria-label="Password length"
            />
          </Box>

          <FormGroup row>
            <FormControlLabel
              control={
                <Checkbox
                  checked={pwOptions.uppercase}
                  onChange={(e) =>
                    setPwOptions((o) => ({
                      ...o,
                      uppercase: e.target.checked,
                    }))
                  }
                />
              }
              label="A-Z"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pwOptions.lowercase}
                  onChange={(e) =>
                    setPwOptions((o) => ({
                      ...o,
                      lowercase: e.target.checked,
                    }))
                  }
                />
              }
              label="a-z"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pwOptions.digits}
                  onChange={(e) =>
                    setPwOptions((o) => ({ ...o, digits: e.target.checked }))
                  }
                />
              }
              label="0-9"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={pwOptions.symbols}
                  onChange={(e) =>
                    setPwOptions((o) => ({
                      ...o,
                      symbols: e.target.checked,
                    }))
                  }
                />
              }
              label="!@#$%"
            />
          </FormGroup>

          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="contained" onClick={handleGeneratePassword}>
              Generate
            </Button>
            {generatedPassword && (
              <>
                <TextField
                  size="small"
                  value={generatedPassword}
                  InputProps={{ readOnly: true }}
                  sx={{ fontFamily: 'monospace', flexGrow: 1 }}
                  inputProps={{ 'aria-label': 'Generated password' }}
                />
                <Button
                  variant="outlined"
                  size="small"
                  onClick={handleCopyPassword}
                >
                  Copy
                </Button>
              </>
            )}
          </Stack>

          {generatedPassword && (
            <Box>
              <Typography variant="body2" gutterBottom>
                Strength: {estimatePasswordStrength(generatedPassword)}/100
              </Typography>
              <LinearProgress
                variant="determinate"
                value={estimatePasswordStrength(generatedPassword)}
                color={strengthColor(
                  estimatePasswordStrength(generatedPassword),
                )}
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          )}
        </Stack>
      </Paper>

      {/* ---- Section 4: Breach Checking ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Breach Checking
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          BrightPass checks passwords against known breach databases using{' '}
          <strong>k-anonymity</strong>. Your password is hashed with SHA-1, and
          only the first 5 characters of the hash (the prefix) are sent to the
          server. The server returns all hash suffixes matching that prefix, and
          the check is completed locally. This means the server never sees your
          full password hash — it cannot determine which suffix you were looking
          for. This is the same approach used by the HaveIBeenPwned API.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <TextField
            size="small"
            label="Password to check"
            type="password"
            value={breachPassword}
            onChange={(e) => setBreachPassword(e.target.value)}
            placeholder="Enter a password"
            inputProps={{ 'aria-label': 'Password to check for breaches' }}
          />
          <Button
            variant="contained"
            onClick={handleBreachCheck}
            disabled={breachChecking}
          >
            {breachChecking ? 'Checking…' : 'Check Breaches'}
          </Button>
        </Stack>

        {breachChecking && <LinearProgress sx={{ mt: 1 }} />}

        {breachResult && (
          <Alert
            severity={breachResult.breached ? 'error' : 'success'}
            sx={{ mt: 2 }}
          >
            {breachResult.breached ? (
              <>
                Password found in breach database (~{breachResult.count}{' '}
                occurrences). Only the hash prefix "{breachResult.prefix}" was
                sent — your full password was never transmitted.
              </>
            ) : (
              <>
                Password not found in breach database. Only the hash prefix "
                {breachResult.prefix}" was sent — your full password was never
                transmitted.
              </>
            )}
          </Alert>
        )}
      </Paper>

      {/* ---- Section 5: TOTP / 2FA ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          5. TOTP / 2FA Setup
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Time-based One-Time Passwords (TOTP) use HMAC-SHA1 with a shared
          secret and a time-based counter that changes every 30 seconds. The
          secret is a random 160-bit value encoded in Base32. In BrightPass,
          TOTP secrets are stored encrypted in your vault alongside the
          associated login credential. The TOTP code is computed locally — it
          never leaves your device.
        </Typography>

        <Stack direction="row" spacing={1} alignItems="center">
          <Button variant="contained" onClick={handleSetupTOTP}>
            {totpSecret ? 'Regenerate Secret' : 'Setup TOTP'}
          </Button>
          {totpSecret && (
            <Button variant="outlined" onClick={handleRefreshTOTP}>
              Refresh Code
            </Button>
          )}
        </Stack>

        {totpSecret && (
          <Box sx={{ mt: 2 }}>
            <Stack spacing={1}>
              <Box>
                <Typography variant="caption" color="text.secondary">
                  Secret (Base32)
                </Typography>
                <Typography
                  variant="body2"
                  sx={{ fontFamily: 'monospace', wordBreak: 'break-all' }}
                >
                  {totpSecret}
                </Typography>
              </Box>
              <Stack direction="row" spacing={2} alignItems="center">
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Current Code
                  </Typography>
                  <Typography
                    variant="h5"
                    sx={{ fontFamily: 'monospace', letterSpacing: 4 }}
                  >
                    {totpCode}
                  </Typography>
                </Box>
                <Box sx={{ flexGrow: 1, maxWidth: 120 }}>
                  <Typography variant="caption" color="text.secondary">
                    Expires in {totpSecondsLeft}s
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={(totpSecondsLeft / 30) * 100}
                    color={totpSecondsLeft < 10 ? 'warning' : 'primary'}
                    sx={{ height: 6, borderRadius: 3 }}
                  />
                </Box>
              </Stack>
              <Typography variant="caption" color="text.secondary">
                In production, this secret would be displayed as a QR code for
                scanning with an authenticator app. The URI format is:{' '}
                <code>
                  otpauth://totp/BrightPass:user@example.com?secret=
                  {totpSecret.slice(0, 8)}…&issuer=BrightPass
                </code>
              </Typography>
            </Stack>
          </Box>
        )}
      </Paper>

      <Divider sx={{ my: 3 }} />

      {/* ---- Activity Log ---- */}
      <Typography variant="h6" gutterBottom>
        Activity Log
      </Typography>
      <Card variant="outlined" sx={{ maxHeight: 320, overflow: 'auto' }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          {log.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Perform an action above to see results here.
            </Typography>
          )}
          {log.map((entry) => (
            <Typography
              key={entry.id}
              variant="body2"
              sx={{
                fontFamily: 'monospace',
                fontSize: '0.8rem',
                color:
                  entry.type === 'error'
                    ? 'error.main'
                    : entry.type === 'success'
                      ? 'success.main'
                      : entry.type === 'warning'
                        ? 'warning.main'
                        : 'text.secondary',
                py: 0.25,
              }}
            >
              [{entry.timestamp.toLocaleTimeString()}] {entry.message}
            </Typography>
          ))}
        </CardContent>
      </Card>

      <Divider sx={{ my: 3 }} />

      {/* ---- Security Model ---- */}
      <Paper
        elevation={0}
        sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          BrightPass Security Model
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Encrypted Block Storage:</strong> Every credential is
          serialised, encrypted with AES-256-GCM, and stored as a block in the
          BrightChain block store. The block ID is the SHA-256 hash of the
          ciphertext, so Bloom filters and lookups work on encrypted data
          without exposing plaintext.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Node-Specific Encryption:</strong> Each vault uses{' '}
          <code>EncryptionMode.NodeSpecific</code>, meaning the vault's master
          key is derived from the owner's ECDSA key pair. Only the owner's
          private key can decrypt the vault contents. There is no server-side
          key escrow.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Password Generation:</strong> Passwords are generated using
          the Web Crypto API (<code>crypto.getRandomValues()</code>), which
          draws from the OS entropy pool. This provides cryptographically secure
          randomness suitable for key generation and password creation.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Breach Checking (k-Anonymity):</strong> Only the first 5
          characters of the SHA-1 hash are sent to the breach-checking service.
          The service returns all matching suffixes, and the comparison is done
          locally. The server never learns which password you checked.
        </Typography>
        <Typography variant="body2">
          <strong>TOTP / 2FA:</strong> TOTP secrets are stored encrypted in the
          vault. Code generation uses HMAC-SHA1 with a 30-second time step,
          producing 6-digit codes per RFC 6238. The shared secret is exchanged
          via QR code during setup and never transmitted again.
        </Typography>
      </Paper>
    </Container>
  );
};
