/**
 * IdentityDemo — Showcase page demonstrating BrightChain's identity,
 * paper key backup, device management, and profile search features.
 *
 * Integrates the existing identity components with simulated callbacks
 * so they can be explored interactively in the browser.
 */

import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Container,
  Divider,
  Paper,
  Stack,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import React, { useCallback, useState } from 'react';
import { DeviceManager } from '../identity/DeviceManager';
import { IdentityProofWizard } from '../identity/IdentityProofWizard';
import { PaperKeyWizard } from '../identity/PaperKeyWizard';
import { ProfileSearch } from '../identity/ProfileSearch';

// ---------------------------------------------------------------------------
// Simulated data and helpers
// ---------------------------------------------------------------------------

/** BIP-39 style word list subset for demo paper key generation. */
const DEMO_WORDS = [
  'abandon',
  'ability',
  'able',
  'about',
  'above',
  'absent',
  'absorb',
  'abstract',
  'absurd',
  'abuse',
  'access',
  'accident',
  'account',
  'accuse',
  'achieve',
  'acid',
  'acoustic',
  'acquire',
  'across',
  'act',
  'action',
  'actor',
  'actress',
  'actual',
  'adapt',
  'add',
  'addict',
  'address',
  'adjust',
  'admit',
  'adult',
  'advance',
  'advice',
  'aerobic',
  'affair',
  'afford',
  'afraid',
  'again',
  'age',
  'agent',
  'agree',
  'ahead',
  'aim',
  'air',
  'airport',
  'aisle',
  'alarm',
  'album',
];

function generateDemoPaperKey(): string {
  const words: string[] = [];
  const values = new Uint32Array(24);
  crypto.getRandomValues(values);
  for (let i = 0; i < 24; i++) {
    words.push(DEMO_WORDS[values[i] % DEMO_WORDS.length]);
  }
  return words.join(' ');
}

interface DeviceInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  publicKeyHex: string;
  provisionedAt: string;
  revokedAt?: string;
}

interface LogEntry {
  id: number;
  timestamp: Date;
  message: string;
  type: 'info' | 'success' | 'error' | 'warning';
}

interface ProofRecord {
  platform: string;
  proofUrl: string;
  verifiedAt: Date;
}

const INITIAL_DEVICES: DeviceInfo[] = [
  {
    id: 'dev-1',
    deviceName: 'MacBook Pro',
    deviceType: 'laptop',
    publicKeyHex: 'a1b2c3d4e5f6...',
    provisionedAt: new Date(Date.now() - 30 * 86400000).toISOString(),
  },
  {
    id: 'dev-2',
    deviceName: 'iPhone 15',
    deviceType: 'mobile',
    publicKeyHex: 'f6e5d4c3b2a1...',
    provisionedAt: new Date(Date.now() - 7 * 86400000).toISOString(),
  },
];

const SIMULATED_PROFILES = [
  {
    memberId: 'member-001',
    displayName: 'Alice Nakamoto',
    username: 'alice',
    verifiedProofs: ['GitHub', 'Twitter'],
    relevanceScore: 0.95,
  },
  {
    memberId: 'member-002',
    displayName: 'Bob Finney',
    username: 'bobf',
    verifiedProofs: ['GitHub'],
    relevanceScore: 0.82,
  },
  {
    memberId: 'member-003',
    displayName: 'Carol Szabo',
    username: 'carol_s',
    verifiedProofs: ['Reddit', 'Website'],
    relevanceScore: 0.71,
  },
  {
    memberId: 'member-004',
    displayName: 'Dave Back',
    username: 'daveback',
    verifiedProofs: ['DNS', 'GitHub', 'Twitter'],
    relevanceScore: 0.68,
  },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface TabPanelProps {
  children: React.ReactNode;
  value: number;
  index: number;
}

function TabPanel({ children, value, index }: TabPanelProps) {
  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`identity-tabpanel-${index}`}
      aria-labelledby={`identity-tab-${index}`}
    >
      {value === index && <Box sx={{ pt: 3 }}>{children}</Box>}
    </div>
  );
}

export const IdentityDemo: React.FC = () => {
  const [tab, setTab] = useState(0);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [nextId, setNextId] = useState(1);

  // Paper key state
  const [paperKey, setPaperKey] = useState<string | null>(null);
  const [showWizard, setShowWizard] = useState(false);

  // Device state
  const [devices, setDevices] = useState<DeviceInfo[]>(INITIAL_DEVICES);

  // Identity proof state
  const [proofs, setProofs] = useState<ProofRecord[]>([]);
  const [showProofWizard, setShowProofWizard] = useState(false);

  const addLog = useCallback(
    (message: string, type: LogEntry['type'] = 'info') => {
      setLog((prev) => [
        { id: nextId, timestamp: new Date(), message, type },
        ...prev.slice(0, 49),
      ]);
      setNextId((n) => n + 1);
    },
    [nextId],
  );

  // Paper key callbacks
  const handlePaperKeyComplete = useCallback(
    (key: string) => {
      setPaperKey(key);
      setShowWizard(false);
      addLog('Paper key generated and verified successfully.', 'success');
    },
    [addLog],
  );

  // Device callbacks
  const handleProvision = useCallback(
    async (_paperKey: string, deviceName: string) => {
      await new Promise((r) => setTimeout(r, 800));
      const newDevice: DeviceInfo = {
        id: `dev-${Date.now()}`,
        deviceName,
        deviceType: 'unknown',
        publicKeyHex:
          Array.from(crypto.getRandomValues(new Uint8Array(8)))
            .map((b) => b.toString(16).padStart(2, '0'))
            .join('') + '...',
        provisionedAt: new Date().toISOString(),
      };
      setDevices((prev) => [...prev, newDevice]);
      addLog(`Device "${deviceName}" provisioned.`, 'success');
    },
    [addLog],
  );

  const handleRevoke = useCallback(
    async (deviceId: string) => {
      await new Promise((r) => setTimeout(r, 500));
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, revokedAt: new Date().toISOString() } : d,
        ),
      );
      addLog(`Device ${deviceId} revoked.`, 'warning');
    },
    [addLog],
  );

  const handleRename = useCallback(
    async (deviceId: string, newName: string) => {
      await new Promise((r) => setTimeout(r, 300));
      setDevices((prev) =>
        prev.map((d) =>
          d.id === deviceId ? { ...d, deviceName: newName } : d,
        ),
      );
      addLog(`Device renamed to "${newName}".`, 'info');
    },
    [addLog],
  );

  // Identity proof callbacks
  const handleProofComplete = useCallback(
    (platform: string, proofUrl: string) => {
      setProofs((prev) => [
        ...prev,
        { platform, proofUrl, verifiedAt: new Date() },
      ]);
      setShowProofWizard(false);
      addLog(`Identity proof verified on ${platform}.`, 'success');
    },
    [addLog],
  );

  const generateStatement = useCallback(
    (platform: string) =>
      `I am verifying my BrightChain identity on ${platform}.\nFingerprint: ${Array.from(
        crypto.getRandomValues(new Uint8Array(16)),
      )
        .map((b) => b.toString(16).padStart(2, '0'))
        .join('')}`,
    [],
  );

  const verifyProof = useCallback(
    async (_platform: string, _proofUrl: string) => {
      await new Promise((r) => setTimeout(r, 1500));
      return Math.random() > 0.2; // 80% success for demo
    },
    [],
  );

  const getInstructions = useCallback((platform: string) => {
    const map: Record<string, string> = {
      github: 'Create a public Gist with the statement below.',
      twitter: 'Post a tweet containing the statement below.',
      reddit: 'Create a post in your profile with the statement below.',
      hackernews: 'Add the statement to your HN profile "about" section.',
      dns: 'Add a TXT record to your domain with the statement below.',
      website: 'Host the statement at /.well-known/brightchain-proof.',
    };
    return map[platform] ?? 'Post the statement publicly on the platform.';
  }, []);

  // Profile search callback
  const handleSearch = useCallback(async (query: string) => {
    await new Promise((r) => setTimeout(r, 400));
    const q = query.toLowerCase();
    return SIMULATED_PROFILES.filter(
      (p) =>
        p.displayName.toLowerCase().includes(q) ||
        (p.username && p.username.toLowerCase().includes(q)),
    );
  }, []);

  const handleSelectProfile = useCallback(
    (memberId: string) => {
      const profile = SIMULATED_PROFILES.find((p) => p.memberId === memberId);
      if (profile) {
        addLog(
          `Viewing profile: ${profile.displayName} (@${profile.username})`,
          'info',
        );
      }
    },
    [addLog],
  );

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" gutterBottom>
        Identity &amp; Security Demo
      </Typography>
      <Typography variant="body1" color="text.secondary" paragraph>
        BrightChain provides a comprehensive identity layer built on public-key
        cryptography. Paper keys enable account recovery, devices can be
        provisioned and revoked, and identity proofs link your BrightChain
        identity to external platforms. The public key directory lets you
        discover and verify other members.
      </Typography>

      <Box sx={{ borderBottom: 1, borderColor: 'divider' }}>
        <Tabs
          value={tab}
          onChange={(_, v) => setTab(v)}
          aria-label="Identity demo tabs"
        >
          <Tab
            label="🔑 Paper Key"
            id="identity-tab-0"
            aria-controls="identity-tabpanel-0"
          />
          <Tab
            label="📱 Devices"
            id="identity-tab-1"
            aria-controls="identity-tabpanel-1"
          />
          <Tab
            label="🛡️ Identity Proofs"
            id="identity-tab-2"
            aria-controls="identity-tabpanel-2"
          />
          <Tab
            label="🔍 Profile Search"
            id="identity-tab-3"
            aria-controls="identity-tabpanel-3"
          />
        </Tabs>
      </Box>

      {/* ---- Tab 0: Paper Key ---- */}
      <TabPanel value={tab} index={0}>
        <Typography variant="body2" color="text.secondary" paragraph>
          A paper key is a 24-word BIP-39 mnemonic that serves as the ultimate
          backup for your BrightChain identity. The wizard walks you through
          generation, writing it down, and verifying 3 random words to confirm
          you recorded it correctly. In production, the mnemonic derives the
          master key via PBKDF2/scrypt.
        </Typography>
        {paperKey ? (
          <Alert severity="success" sx={{ mb: 2 }}>
            Paper key has been generated and verified. Store it safely.
          </Alert>
        ) : (
          <Alert severity="info" sx={{ mb: 2 }}>
            No paper key generated yet. Click below to start the wizard.
          </Alert>
        )}
        {showWizard ? (
          <PaperKeyWizard
            onComplete={handlePaperKeyComplete}
            onCancel={() => setShowWizard(false)}
            generatePaperKey={generateDemoPaperKey}
            validatePaperKey={() => true}
          />
        ) : (
          <Button
            variant="contained"
            onClick={() => setShowWizard(true)}
            disabled={!!paperKey}
          >
            {paperKey ? 'Paper Key Already Set' : 'Start Paper Key Wizard'}
          </Button>
        )}
        {paperKey && (
          <Button
            variant="outlined"
            sx={{ ml: 2 }}
            onClick={() => {
              setPaperKey(null);
              addLog('Paper key reset for demo purposes.', 'warning');
            }}
          >
            Reset (Demo Only)
          </Button>
        )}
      </TabPanel>

      {/* ---- Tab 1: Devices ---- */}
      <TabPanel value={tab} index={1}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Each device you use with BrightChain gets its own key pair derived
          from your paper key. You can provision new devices, rename them, and
          revoke compromised ones. Revoking a device invalidates its key pair
          and triggers key rotation for any pools it had access to.
        </Typography>
        <DeviceManager
          devices={devices}
          onProvision={handleProvision}
          onRevoke={handleRevoke}
          onRename={handleRename}
        />
      </TabPanel>

      {/* ---- Tab 2: Identity Proofs ---- */}
      <TabPanel value={tab} index={2}>
        <Typography variant="body2" color="text.secondary" paragraph>
          Identity proofs link your BrightChain identity to external platforms
          (GitHub, Twitter, DNS, etc.) using signed statements. The wizard
          generates a cryptographically signed statement, you post it publicly,
          then BrightChain verifies it. Verified proofs are stored in the public
          key directory so others can confirm your identity.
        </Typography>
        {proofs.length > 0 && (
          <Stack spacing={1} sx={{ mb: 2 }}>
            {proofs.map((p, i) => (
              <Card key={i} variant="outlined">
                <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                  <Typography variant="subtitle2">
                    ✅ {p.platform} — verified {p.verifiedAt.toLocaleString()}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {p.proofUrl}
                  </Typography>
                </CardContent>
              </Card>
            ))}
          </Stack>
        )}
        {showProofWizard ? (
          <IdentityProofWizard
            onComplete={handleProofComplete}
            onCancel={() => setShowProofWizard(false)}
            generateStatement={generateStatement}
            verifyProof={verifyProof}
            getInstructions={getInstructions}
          />
        ) : (
          <Button variant="contained" onClick={() => setShowProofWizard(true)}>
            Link New Platform
          </Button>
        )}
      </TabPanel>

      {/* ---- Tab 3: Profile Search ---- */}
      <TabPanel value={tab} index={3}>
        <Typography variant="body2" color="text.secondary" paragraph>
          The public key directory allows you to search for other BrightChain
          members by name, username, or key fingerprint. Results show verified
          identity proofs so you can confirm you are communicating with the
          right person. Try searching for &quot;alice&quot;, &quot;bob&quot;, or
          &quot;carol&quot;.
        </Typography>
        <ProfileSearch
          onSearch={handleSearch}
          onSelectProfile={handleSelectProfile}
        />
      </TabPanel>

      <Divider sx={{ my: 3 }} />

      {/* ---- Activity Log ---- */}
      <Typography variant="h6" gutterBottom>
        Activity Log
      </Typography>
      <Card variant="outlined" sx={{ maxHeight: 280, overflow: 'auto' }}>
        <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
          {log.length === 0 && (
            <Typography variant="body2" color="text.secondary">
              Interact with the tabs above to see activity here.
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
          How Identity Works in BrightChain
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Paper Keys:</strong> A 24-word BIP-39 mnemonic serves as the
          master backup. The mnemonic derives a master key via PBKDF2/scrypt,
          from which device-specific key pairs are generated using hierarchical
          deterministic derivation (HD paths).
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Device Management:</strong> Each device gets its own key pair
          derived from the master key. Provisioning requires the paper key to
          prove ownership. Revoking a device invalidates its key pair and
          triggers automatic key rotation for all pools the device had access
          to.
        </Typography>
        <Typography variant="body2" paragraph>
          <strong>Identity Proofs:</strong> Signed statements posted on external
          platforms (GitHub Gists, tweets, DNS TXT records) create a verifiable
          link between your BrightChain identity and your real-world accounts.
          Proofs are stored in the public key directory and can be independently
          verified by any node.
        </Typography>
        <Typography variant="body2">
          <strong>Profile Search:</strong> The public key directory is a
          distributed index of member profiles, verified proofs, and public
          keys. Search uses a debounced query against the directory, returning
          results ranked by relevance with verified proof badges.
        </Typography>
      </Paper>
    </Container>
  );
};
