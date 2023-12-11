/**
 * IdentityProofWizard — Multi-step wizard for creating identity proofs.
 *
 * Steps:
 *   1. Select platform (GitHub, Twitter, etc.)
 *   2. Generate signed statement
 *   3. Copy to clipboard and post
 *   4. Enter proof URL and verify
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5, 10.6
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

type ProofPlatform =
  | 'github'
  | 'twitter'
  | 'reddit'
  | 'hackernews'
  | 'dns'
  | 'website';

interface IdentityProofWizardProps {
  /** Called when proof is created and verified */
  onComplete: (platform: ProofPlatform, proofUrl: string) => void;
  onCancel?: () => void;
  /** Generate a signed proof statement for the platform */
  generateStatement: (platform: ProofPlatform) => string;
  /** Verify a proof URL */
  verifyProof: (platform: ProofPlatform, proofUrl: string) => Promise<boolean>;
  /** Get instructions for a platform */
  getInstructions: (platform: ProofPlatform) => string;
}

const PLATFORMS: { value: ProofPlatform; label: string; icon: string }[] = [
  { value: 'github', label: 'GitHub', icon: '🐙' },
  { value: 'twitter', label: 'Twitter/X', icon: '🐦' },
  { value: 'reddit', label: 'Reddit', icon: '🤖' },
  { value: 'hackernews', label: 'Hacker News', icon: '🟧' },
  { value: 'dns', label: 'DNS', icon: '🌐' },
  { value: 'website', label: 'Website', icon: '🔗' },
];

const STEPS = ['Select Platform', 'Generate Statement', 'Post Proof', 'Verify'];

// ─── Component ──────────────────────────────────────────────────────────────

export const IdentityProofWizard: FC<IdentityProofWizardProps> = ({
  onComplete,
  onCancel,
  generateStatement,
  verifyProof,
  getInstructions,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [platform, setPlatform] = useState<ProofPlatform | null>(null);
  const [statement, setStatement] = useState('');
  const [proofUrl, setProofUrl] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [verified, setVerified] = useState<boolean | null>(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  const handleSelectPlatform = (p: ProofPlatform) => {
    setPlatform(p);
    setStatement(generateStatement(p));
    setActiveStep(1);
  };

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(statement);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setError('Failed to copy to clipboard');
    }
  };

  const handleVerify = async () => {
    if (!platform || !proofUrl) return;
    setVerifying(true);
    setError('');
    setVerified(null);

    try {
      const result = await verifyProof(platform, proofUrl);
      setVerified(result);
      if (result) {
        onComplete(platform, proofUrl);
      } else {
        setError(
          'Verification failed. Make sure the proof is publicly accessible.',
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Verification failed');
    } finally {
      setVerifying(false);
    }
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Link Your Identity
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1: Select Platform */}
      {activeStep === 0 && (
        <Box
          sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}
          role="radiogroup"
          aria-label="Select platform"
        >
          {PLATFORMS.map((p) => (
            <Chip
              key={p.value}
              label={`${p.icon} ${p.label}`}
              onClick={() => handleSelectPlatform(p.value)}
              variant={platform === p.value ? 'filled' : 'outlined'}
              color={platform === p.value ? 'primary' : 'default'}
              sx={{ fontSize: '1rem', py: 2, px: 1 }}
              role="radio"
              aria-checked={platform === p.value}
            />
          ))}
        </Box>
      )}

      {/* Step 2: Generate Statement */}
      {activeStep === 1 && platform && (
        <Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {getInstructions(platform)}
          </Typography>
          <TextField
            value={statement}
            multiline
            rows={4}
            fullWidth
            slotProps={{ input: { readOnly: true } }}
            sx={{ mb: 2, fontFamily: 'monospace' }}
            inputProps={{ 'aria-label': 'Signed proof statement' }}
          />
          <Button
            variant="contained"
            onClick={handleCopy}
            fullWidth
            sx={{ mb: 1 }}
          >
            {copied ? '✓ Copied' : 'Copy to Clipboard'}
          </Button>
          <Button variant="outlined" onClick={() => setActiveStep(2)} fullWidth>
            I have posted the proof
          </Button>
        </Box>
      )}

      {/* Step 3: Post Proof */}
      {activeStep === 2 && (
        <Box>
          <Alert severity="info" sx={{ mb: 2 }}>
            Paste the signed statement on your{' '}
            {PLATFORMS.find((p) => p.value === platform)?.label} profile, then
            enter the URL below.
          </Alert>
          <TextField
            label="Proof URL"
            value={proofUrl}
            onChange={(e) => {
              setProofUrl(e.target.value);
              setError('');
            }}
            fullWidth
            placeholder="https://..."
            sx={{ mb: 2 }}
            inputProps={{ 'aria-label': 'Enter proof URL' }}
          />
          <Button
            variant="contained"
            onClick={() => setActiveStep(3)}
            disabled={!proofUrl}
            fullWidth
          >
            Verify Proof
          </Button>
        </Box>
      )}

      {/* Step 4: Verify */}
      {activeStep === 3 && (
        <Box sx={{ textAlign: 'center' }}>
          {verifying && <CircularProgress sx={{ mb: 2 }} />}
          {verified === true && (
            <Alert severity="success" sx={{ mb: 2 }}>
              Identity proof verified successfully.
            </Alert>
          )}
          {error && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {error}
            </Alert>
          )}
          {!verifying && verified === null && (
            <Button variant="contained" onClick={handleVerify}>
              Verify Now
            </Button>
          )}
          {!verifying && verified === false && (
            <Button
              variant="outlined"
              onClick={() => {
                setVerified(null);
                setActiveStep(2);
              }}
            >
              Try Again
            </Button>
          )}
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={
            activeStep === 0 ? onCancel : () => setActiveStep((s) => s - 1)
          }
          disabled={activeStep === 0 && !onCancel}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
      </Box>
    </Paper>
  );
};
