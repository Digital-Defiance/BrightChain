/**
 * MessagingDemo — Showcase page demonstrating BrightChain's encrypted
 * messaging, group chats, channels, and presence features.
 *
 * Because the real messaging system is not yet fully implemented, this demo
 * simulates the core operations in the browser using the Web Crypto API.
 * Each section includes explanatory text describing how the feature works
 * in the real BrightChain system.
 *
 * Requirements: 23.1, 23.2
 */

import {
  Alert,
  Avatar,
  Badge,
  Button,
  Card,
  CardContent,
  Chip,
  Container,
  Divider,
  FormControl,
  InputLabel,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  MenuItem,
  Paper,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Simulated crypto helpers using the Web Crypto API
// ---------------------------------------------------------------------------

/** Generate an ECDH key pair (P-256) for simulating ECIES key exchange. */
async function generateKeyPair(): Promise<CryptoKeyPair> {
  return crypto.subtle.generateKey(
    { name: 'ECDH', namedCurve: 'P-256' },
    true,
    ['deriveKey', 'deriveBits'],
  );
}

/** Derive a shared AES-GCM key from an ECDH key pair (simulates ECIES shared secret). */
async function deriveSharedKey(
  privateKey: CryptoKey,
  publicKey: CryptoKey,
): Promise<CryptoKey> {
  return crypto.subtle.deriveKey(
    { name: 'ECDH', public: publicKey },
    privateKey,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

/** Encrypt a plaintext string with an AES-GCM key. Returns iv + ciphertext. */
async function encryptMessage(
  key: CryptoKey,
  plaintext: string,
): Promise<{ iv: Uint8Array; ciphertext: Uint8Array }> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const ciphertext = new Uint8Array(
    await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoded),
  );
  return { iv, ciphertext };
}

/** Decrypt ciphertext with an AES-GCM key. */
async function decryptMessage(
  key: CryptoKey,
  iv: Uint8Array,
  ciphertext: Uint8Array,
): Promise<string> {
  const ivCopy = new Uint8Array(iv).buffer as ArrayBuffer;
  const ctCopy = new Uint8Array(ciphertext).buffer as ArrayBuffer;
  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: ivCopy },
    key,
    ctCopy,
  );
  return new TextDecoder().decode(decrypted);
}

/** Generate a random AES-GCM key (simulates a pool-shared group key). */
async function generateGroupKey(): Promise<CryptoKey> {
  return crypto.subtle.generateKey({ name: 'AES-GCM', length: 256 }, true, [
    'encrypt',
    'decrypt',
  ]);
}

/** Hex-encode a Uint8Array for display. */
function toHex(data: Uint8Array): string {
  return Array.from(data)
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

type PresenceStatus = 'online' | 'away' | 'offline';

interface SimulatedUser {
  name: string;
  keyPair: CryptoKeyPair | null;
  presence: PresenceStatus;
}

type ChannelVisibility = 'public' | 'private' | 'invite-only';

interface SimulatedChannel {
  name: string;
  visibility: ChannelVisibility;
  members: string[];
  messages: Array<{ sender: string; text: string; encrypted: boolean }>;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export const MessagingDemo: React.FC = () => {
  // Log state
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  // Encrypted messaging state
  const [messageInput, setMessageInput] = useState('');
  const [encryptedResult, setEncryptedResult] = useState<{
    iv: string;
    ciphertext: string;
    decrypted: string;
  } | null>(null);

  // Users for simulation
  const [users] = useState<Record<string, SimulatedUser>>(() => ({
    Alice: { name: 'Alice', keyPair: null, presence: 'online' },
    Bob: { name: 'Bob', keyPair: null, presence: 'away' },
    Carol: { name: 'Carol', keyPair: null, presence: 'offline' },
    Dave: { name: 'Dave', keyPair: null, presence: 'online' },
  }));
  const [presenceMap, setPresenceMap] = useState<
    Record<string, PresenceStatus>
  >({
    Alice: 'online',
    Bob: 'away',
    Carol: 'offline',
    Dave: 'online',
  });

  // Group chat state
  const [groupMessages, setGroupMessages] = useState<
    Array<{ sender: string; text: string; encrypted: boolean }>
  >([]);
  const [groupInput, setGroupInput] = useState('');
  const [groupKey, setGroupKey] = useState<CryptoKey | null>(null);

  // Channel state
  const [channels, setChannels] = useState<SimulatedChannel[]>([]);
  const [newChannelName, setNewChannelName] = useState('');
  const [newChannelVisibility, setNewChannelVisibility] =
    useState<ChannelVisibility>('public');

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

  // Actions ----------------------------------------------------------------

  /** Simulate ECIES-style encrypted message exchange between Alice and Bob. */
  const handleEncryptMessage = useCallback(async () => {
    const text = messageInput.trim();
    if (!text) {
      addLog('Enter a message to encrypt.', 'warning');
      return;
    }

    try {
      // Generate key pairs for Alice (sender) and Bob (recipient)
      const aliceKeys = await generateKeyPair();
      const bobKeys = await generateKeyPair();

      // Derive shared secret (ECDH → AES key, simulating ECIES)
      const sharedKey = await deriveSharedKey(
        aliceKeys.privateKey,
        bobKeys.publicKey,
      );

      // Encrypt with the shared key
      const { iv, ciphertext } = await encryptMessage(sharedKey, text);

      addLog('--- Encrypted Message Demo ---', 'info');
      addLog(`Alice encrypts: "${text}"`, 'info');
      addLog(`IV: ${toHex(iv)}`, 'info');
      addLog(`Ciphertext: ${toHex(ciphertext).slice(0, 64)}…`, 'info');

      // Bob derives the same shared secret and decrypts
      const bobSharedKey = await deriveSharedKey(
        bobKeys.privateKey,
        aliceKeys.publicKey,
      );
      const decrypted = await decryptMessage(bobSharedKey, iv, ciphertext);

      addLog(`Bob decrypts: "${decrypted}" ✅`, 'success');

      setEncryptedResult({
        iv: toHex(iv),
        ciphertext: toHex(ciphertext),
        decrypted,
      });
      setMessageInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Encryption error: ${msg}`, 'error');
    }
  }, [messageInput, addLog]);

  /** Simulate creating a group chat with a shared encryption key. */
  const handleCreateGroupChat = useCallback(async () => {
    try {
      const key = await generateGroupKey();
      setGroupKey(key);
      setGroupMessages([]);
      addLog('--- Group Chat Created ---', 'info');
      addLog(
        'Generated pool-shared AES-256-GCM key. All group members can encrypt/decrypt.',
        'success',
      );
      addLog('Members: Alice, Bob, Carol, Dave', 'info');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Group creation error: ${msg}`, 'error');
    }
  }, [addLog]);

  /** Send a message in the group chat (encrypted with the shared key). */
  const handleGroupSend = useCallback(async () => {
    const text = groupInput.trim();
    if (!text) return;
    if (!groupKey) {
      addLog('Create a group chat first.', 'warning');
      return;
    }

    try {
      const { iv, ciphertext } = await encryptMessage(groupKey, text);
      const decrypted = await decryptMessage(groupKey, iv, ciphertext);

      setGroupMessages((prev) => [
        ...prev,
        { sender: 'Alice', text: decrypted, encrypted: true },
      ]);
      addLog(
        `[Group] Alice → "${text}" (encrypted: ${toHex(ciphertext).slice(0, 32)}…)`,
        'success',
      );
      setGroupInput('');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      addLog(`Group send error: ${msg}`, 'error');
    }
  }, [groupInput, groupKey, addLog]);

  /** Create a channel with the specified visibility. */
  const handleCreateChannel = useCallback(() => {
    const name = newChannelName.trim();
    if (!name) {
      addLog('Enter a channel name.', 'warning');
      return;
    }
    if (channels.some((c) => c.name === name)) {
      addLog(`Channel "${name}" already exists.`, 'warning');
      return;
    }

    const members =
      newChannelVisibility === 'public'
        ? ['Alice', 'Bob', 'Carol', 'Dave']
        : newChannelVisibility === 'private'
          ? ['Alice', 'Bob']
          : ['Alice'];

    setChannels((prev) => [
      ...prev,
      { name, visibility: newChannelVisibility, members, messages: [] },
    ]);
    addLog(
      `Created ${newChannelVisibility} channel "${name}" with ${members.length} member(s).`,
      'success',
    );
    setNewChannelName('');
  }, [newChannelName, newChannelVisibility, channels, addLog]);

  /** Toggle a user's presence status. */
  const handleTogglePresence = useCallback(
    (userName: string) => {
      setPresenceMap((prev) => {
        const current = prev[userName] ?? 'offline';
        const next: PresenceStatus =
          current === 'online'
            ? 'away'
            : current === 'away'
              ? 'offline'
              : 'online';
        addLog(`${userName} is now ${next}`, 'info');
        return { ...prev, [userName]: next };
      });
    },
    [addLog],
  );

  // Presence badge color helper
  const presenceColor = (
    status: PresenceStatus,
  ): 'success' | 'warning' | 'error' => {
    switch (status) {
      case 'online':
        return 'success';
      case 'away':
        return 'warning';
      case 'offline':
        return 'error';
    }
  };

  // Render -----------------------------------------------------------------

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Messaging &amp; Communication Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        BrightChain provides encrypted messaging built on top of its block-based
        storage layer. Messages are encrypted using{' '}
        <strong>ECIES (Elliptic Curve Integrated Encryption Scheme)</strong>{' '}
        before being stored as blocks. Group chats use a pool-shared symmetric
        key so all members can decrypt, while direct messages use pairwise ECDH
        key agreement.
      </Typography>
      <Typography variant="body2" color="text.secondary" paragraph>
        This demo simulates messaging operations in the browser using the Web
        Crypto API. In production, the encryption layer uses secp256k1 ECIES and
        messages are stored as encrypted blocks in the block store.
      </Typography>

      <Divider sx={{ my: 3 }} />

      {/* ---- Section 1: Encrypted Messages ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          1. Encrypted Direct Messages
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          In BrightChain, direct messages are encrypted using{' '}
          <strong>ECIES</strong>: the sender uses the recipient's public key to
          derive a shared secret via ECDH, then encrypts the message with
          AES-256-GCM. Only the intended recipient can decrypt using their
          private key. The encrypted message is stored as a block in the block
          store — the block ID (SHA-256 of the ciphertext) reveals nothing about
          the plaintext content.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Below, Alice sends an encrypted message to Bob. Both derive the same
          shared secret from their ECDH key pairs, demonstrating the
          encrypt/decrypt round-trip.
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Message from Alice to Bob"
            value={messageInput}
            onChange={(e) => setMessageInput(e.target.value)}
            placeholder="Hello Bob, this is secret!"
            sx={{ flexGrow: 1 }}
            inputProps={{ 'aria-label': 'Message to encrypt' }}
          />
          <Button variant="contained" onClick={handleEncryptMessage}>
            Encrypt &amp; Send
          </Button>
        </Stack>
        {encryptedResult && (
          <Card variant="outlined" sx={{ mt: 1 }}>
            <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                IV: <code>{encryptedResult.iv}</code>
              </Typography>
              <Typography
                variant="caption"
                color="text.secondary"
                display="block"
              >
                Ciphertext:{' '}
                <code>{encryptedResult.ciphertext.slice(0, 64)}…</code>
              </Typography>
              <Typography variant="body2" color="success.main" sx={{ mt: 0.5 }}>
                Bob decrypted: &quot;{encryptedResult.decrypted}&quot;
              </Typography>
            </CardContent>
          </Card>
        )}
      </Paper>

      {/* ---- Section 2: Group Chat ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          2. Group Chat (Pool-Shared Encryption)
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Group chats in BrightChain use <strong>pool-shared encryption</strong>
          . When a group is created, a symmetric AES-256-GCM key is generated
          and distributed to each member encrypted with their individual public
          key (ECIES). All members can then encrypt and decrypt group messages
          using this shared key. Key rotation occurs automatically when a member
          is removed.
        </Typography>
        {!groupKey ? (
          <Button variant="outlined" onClick={handleCreateGroupChat}>
            Create Group Chat
          </Button>
        ) : (
          <>
            <Alert severity="success" sx={{ mb: 2 }}>
              Group chat active — shared AES-256-GCM key distributed to all
              members.
            </Alert>
            <Stack
              direction="row"
              spacing={1}
              alignItems="center"
              sx={{ mb: 2 }}
            >
              <TextField
                size="small"
                label="Group message (as Alice)"
                value={groupInput}
                onChange={(e) => setGroupInput(e.target.value)}
                placeholder="Hey everyone!"
                sx={{ flexGrow: 1 }}
                inputProps={{ 'aria-label': 'Group chat message' }}
              />
              <Button variant="contained" onClick={handleGroupSend}>
                Send
              </Button>
            </Stack>
            {groupMessages.length > 0 && (
              <List dense>
                {groupMessages.map((msg, i) => (
                  <ListItem key={i}>
                    <ListItemAvatar>
                      <Avatar
                        sx={{ width: 28, height: 28, fontSize: '0.8rem' }}
                      >
                        {msg.sender[0]}
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={msg.text}
                      secondary={
                        msg.encrypted
                          ? `${msg.sender} — 🔒 encrypted with shared key`
                          : msg.sender
                      }
                    />
                  </ListItem>
                ))}
              </List>
            )}
          </>
        )}
      </Paper>

      {/* ---- Section 3: Channels ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          3. Channels with Visibility Modes
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          BrightChain channels support three visibility modes controlled by the
          pool ACL (<code>IPoolACL</code>):
        </Typography>
        <Typography
          variant="body2"
          component="div"
          color="text.secondary"
          paragraph
        >
          <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
            <li>
              <strong>Public</strong> — any node can discover and read messages
              (pool has <code>publicRead: true</code>).
            </li>
            <li>
              <strong>Private</strong> — only ACL members with Read permission
              can access the channel. The channel is not discoverable via the
              Discovery Protocol.
            </li>
            <li>
              <strong>Invite-only</strong> — members must be explicitly added by
              an Admin. New members receive the pool-shared key encrypted with
              their public key.
            </li>
          </ul>
        </Typography>
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <TextField
            size="small"
            label="Channel name"
            value={newChannelName}
            onChange={(e) => setNewChannelName(e.target.value)}
            placeholder="general"
            inputProps={{ 'aria-label': 'New channel name' }}
          />
          <FormControl size="small" sx={{ minWidth: 140 }}>
            <InputLabel id="channel-visibility-label">Visibility</InputLabel>
            <Select
              labelId="channel-visibility-label"
              value={newChannelVisibility}
              onChange={(e) =>
                setNewChannelVisibility(e.target.value as ChannelVisibility)
              }
              label="Visibility"
            >
              <MenuItem value="public">Public</MenuItem>
              <MenuItem value="private">Private</MenuItem>
              <MenuItem value="invite-only">Invite-only</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" onClick={handleCreateChannel}>
            Create Channel
          </Button>
        </Stack>
        {channels.length > 0 && (
          <Stack spacing={1}>
            {channels.map((ch) => (
              <Card key={ch.name} variant="outlined">
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Stack
                    direction="row"
                    spacing={1}
                    alignItems="center"
                    flexWrap="wrap"
                    useFlexGap
                  >
                    <Typography variant="subtitle2">#{ch.name}</Typography>
                    <Chip
                      label={ch.visibility}
                      size="small"
                      color={
                        ch.visibility === 'public'
                          ? 'success'
                          : ch.visibility === 'private'
                            ? 'warning'
                            : 'error'
                      }
                      variant="outlined"
                    />
                    <Typography variant="caption" color="text.secondary">
                      {ch.members.length} member(s): {ch.members.join(', ')}
                    </Typography>
                  </Stack>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
        {channels.length === 0 && (
          <Alert severity="info">No channels yet. Create one above.</Alert>
        )}
      </Paper>

      {/* ---- Section 4: Presence Indicators ---- */}
      <Paper elevation={2} sx={{ p: 3, mb: 3 }}>
        <Typography variant="h6" gutterBottom>
          4. Real-Time Presence Indicators
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Presence in BrightChain is tracked via the{' '}
          <strong>Gossip Service</strong>. Each node periodically announces its
          status (online, away, offline) to peers in the same pool. Presence
          announcements are lightweight gossip messages — they do not create
          blocks in the store. When a node stops announcing, peers mark it as
          offline after a configurable timeout.
        </Typography>
        <Typography variant="body2" color="text.secondary" paragraph>
          Click on a user below to cycle their presence status. In the real
          system, this would be driven by gossip protocol heartbeats.
        </Typography>
        <List>
          {Object.keys(users).map((name) => {
            const status = presenceMap[name] ?? 'offline';
            return (
              <ListItem
                key={name}
                component="div"
                onClick={() => handleTogglePresence(name)}
                sx={{
                  cursor: 'pointer',
                  borderRadius: 1,
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemAvatar>
                  <Badge
                    overlap="circular"
                    anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                    variant="dot"
                    color={presenceColor(status)}
                  >
                    <Avatar sx={{ width: 36, height: 36 }}>{name[0]}</Avatar>
                  </Badge>
                </ListItemAvatar>
                <ListItemText
                  primary={name}
                  secondary={
                    <Chip
                      label={status}
                      size="small"
                      color={presenceColor(status)}
                      variant="outlined"
                      sx={{ mt: 0.25 }}
                    />
                  }
                />
              </ListItem>
            );
          })}
        </List>
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

      {/* ---- How It Works ---- */}
      <Paper
        elevation={0}
        sx={{ p: 3, bgcolor: 'action.hover', borderRadius: 2 }}
      >
        <Typography variant="h6" gutterBottom>
          How Messaging Works in BrightChain
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>ECIES Encryption:</strong> Direct messages use Elliptic Curve
          Integrated Encryption Scheme (ECIES) with secp256k1. The sender
          derives a shared secret from the recipient&apos;s public key via ECDH,
          then encrypts with AES-256-GCM. The encrypted message is stored as a
          block — the block ID (hash of ciphertext) reveals nothing about the
          content.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Pool-Shared Group Keys:</strong> Group chats and channels use
          a symmetric AES-256-GCM key shared among all members. The key is
          distributed by encrypting it individually for each member using their
          public key. When a member is removed, key rotation generates a new
          shared key so the removed member cannot decrypt future messages.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Exploding Messages:</strong> BrightChain supports
          self-destructing messages with time-based and read-count-based
          expiration. Expired messages are purged from the block store. The{' '}
          <code>ExplodingMessageComposer</code> and{' '}
          <code>ExplodingMessageBadge</code> components (already in the
          codebase) provide the UI for configuring and displaying expiration.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Gossip-Based Presence:</strong> Nodes announce their presence
          status via lightweight gossip messages. These announcements propagate
          through the gossip overlay without creating blocks. A configurable
          heartbeat interval (default: 30s) and timeout (default: 90s) determine
          when a node is considered offline.
        </Typography>
        <Typography variant="body2">
          <strong>Channel Visibility:</strong> Channels map to pools with
          specific ACL configurations. Public channels set{' '}
          <code>publicRead: true</code> on the pool ACL. Private channels
          restrict access to ACL members. Invite-only channels require an Admin
          to explicitly add members and distribute the pool-shared key.
        </Typography>
      </Paper>
    </Container>
  );
};
