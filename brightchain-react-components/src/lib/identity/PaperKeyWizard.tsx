/**
 * PaperKeyWizard — Multi-step wizard for generating and verifying paper keys.
 *
 * Steps:
 *   1. Security warnings and acknowledgement
 *   2. Generate and display the 24-word paper key
 *   3. Confirmation prompt (write it down)
 *   4. Verification (enter 3 random words to prove they wrote it down)
 *
 * Requirements: 9.1, 9.2, 9.4, 9.5
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  Paper,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useCallback, useMemo, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaperKeyWizardProps {
  /** Called when the wizard completes successfully with the generated key */
  onComplete: (paperKey: string) => void;
  /** Called when the user cancels the wizard */
  onCancel?: () => void;
  /** Function to generate a paper key (injected for testability) */
  generatePaperKey: () => string;
  /** Function to validate a paper key (injected for testability) */
  validatePaperKey: (key: string) => boolean;
}

interface VerificationWord {
  index: number;
  word: string;
  userInput: string;
}

const STEPS = [
  'Security Warning',
  'Generate Paper Key',
  'Write It Down',
  'Verify',
];

// ─── Component ──────────────────────────────────────────────────────────────

export const PaperKeyWizard: FC<PaperKeyWizardProps> = ({
  onComplete,
  onCancel,
  generatePaperKey,
  validatePaperKey,
}) => {
  const [activeStep, setActiveStep] = useState(0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [paperKey, setPaperKey] = useState('');
  const [verificationWords, setVerificationWords] = useState<
    VerificationWord[]
  >([]);
  const [verificationError, setVerificationError] = useState('');

  const words = useMemo(() => paperKey.split(' ').filter(Boolean), [paperKey]);

  const selectRandomWords = useCallback(
    (allWords: string[]): VerificationWord[] => {
      const indices = new Set<number>();
      while (indices.size < 3 && indices.size < allWords.length) {
        indices.add(Math.floor(Math.random() * allWords.length));
      }
      return Array.from(indices)
        .sort((a, b) => a - b)
        .map((idx) => ({
          index: idx,
          word: allWords[idx],
          userInput: '',
        }));
    },
    [],
  );

  const handleNext = () => {
    if (activeStep === 0 && !acknowledged) return;

    if (activeStep === 1 && !paperKey) {
      const key = generatePaperKey();
      setPaperKey(key);
      return;
    }

    if (activeStep === 2) {
      setVerificationWords(selectRandomWords(words));
    }

    if (activeStep === 3) {
      const allCorrect = verificationWords.every(
        (vw) => vw.userInput.trim().toLowerCase() === vw.word.toLowerCase(),
      );
      if (!allCorrect) {
        setVerificationError(
          'One or more words are incorrect. Please check and try again.',
        );
        return;
      }
      if (!validatePaperKey(paperKey)) {
        setVerificationError('Paper key validation failed.');
        return;
      }
      onComplete(paperKey);
      return;
    }

    setActiveStep((prev) => prev + 1);
  };

  const handleBack = () => {
    setVerificationError('');
    setActiveStep((prev) => prev - 1);
  };

  const handleVerificationInput = (idx: number, value: string) => {
    setVerificationError('');
    setVerificationWords((prev) =>
      prev.map((vw, i) => (i === idx ? { ...vw, userInput: value } : vw)),
    );
  };

  return (
    <Paper sx={{ p: 3, maxWidth: 600, mx: 'auto' }}>
      <Typography variant="h5" gutterBottom>
        Paper Key Setup
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }}>
        {STEPS.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      {/* Step 1: Security Warning */}
      {activeStep === 0 && (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Your paper key is the only way to recover your account. If you lose
            it, your data cannot be recovered. Never share it with anyone.
          </Alert>
          <Alert severity="info" sx={{ mb: 2 }}>
            You will be shown a 24-word phrase. Write it down on paper and store
            it in a safe place. Do not take a screenshot or store it digitally.
          </Alert>
          <Button
            variant={acknowledged ? 'contained' : 'outlined'}
            onClick={() => setAcknowledged(!acknowledged)}
            fullWidth
            sx={{ mb: 2 }}
            aria-pressed={acknowledged}
          >
            {acknowledged
              ? '✓ I understand the risks'
              : 'I understand the risks'}
          </Button>
        </Box>
      )}

      {/* Step 2: Generate Paper Key */}
      {activeStep === 1 && (
        <Box>
          {!paperKey ? (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Typography variant="body1" sx={{ mb: 2 }}>
                Click the button below to generate your paper key.
              </Typography>
              <Button variant="contained" onClick={handleNext}>
                Generate Paper Key
              </Button>
            </Box>
          ) : (
            <Box>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Your 24-word paper key:
              </Typography>
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(4, 1fr)',
                  gap: 1,
                  mb: 2,
                }}
                role="list"
                aria-label="Paper key words"
              >
                {words.map((word, idx) => (
                  <Chip
                    key={idx}
                    label={`${idx + 1}. ${word}`}
                    variant="outlined"
                    role="listitem"
                  />
                ))}
              </Box>
            </Box>
          )}
        </Box>
      )}

      {/* Step 3: Write It Down */}
      {activeStep === 2 && (
        <Box>
          <Alert severity="warning" sx={{ mb: 2 }}>
            Have you written down all 24 words in order? You will need to verify
            3 random words in the next step.
          </Alert>
          <Typography variant="body2" color="text.secondary">
            Store your paper key in a secure location. Consider using a
            fireproof safe or safety deposit box.
          </Typography>
        </Box>
      )}

      {/* Step 4: Verify */}
      {activeStep === 3 && (
        <Box>
          <Typography variant="body1" sx={{ mb: 2 }}>
            Enter the following words from your paper key to verify you wrote
            them down correctly:
          </Typography>
          {verificationWords.map((vw, idx) => (
            <TextField
              key={vw.index}
              label={`Word #${vw.index + 1}`}
              value={vw.userInput}
              onChange={(e) => handleVerificationInput(idx, e.target.value)}
              fullWidth
              sx={{ mb: 2 }}
              autoComplete="off"
              inputProps={{ 'aria-label': `Enter word number ${vw.index + 1}` }}
            />
          ))}
          {verificationError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              {verificationError}
            </Alert>
          )}
        </Box>
      )}

      {/* Navigation */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 3 }}>
        <Button
          onClick={activeStep === 0 ? onCancel : handleBack}
          disabled={activeStep === 0 && !onCancel}
        >
          {activeStep === 0 ? 'Cancel' : 'Back'}
        </Button>
        <Button
          variant="contained"
          onClick={handleNext}
          disabled={activeStep === 0 && !acknowledged}
        >
          {activeStep === 3 ? 'Verify & Complete' : 'Next'}
        </Button>
      </Box>
    </Paper>
  );
};
