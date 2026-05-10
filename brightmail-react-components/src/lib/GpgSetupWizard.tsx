/**
 * GpgSetupWizard — Step-by-step guided setup for GPG encryption.
 *
 * Steps:
 *   1. Welcome — explain GPG, mention ECIES, choose Generate or Import
 *   2a. Generate — passphrase + confirm + strength indicator → generate
 *   2b. Import — tabs: upload file / paste key / search keyserver
 *   3. Success — fingerprint, publish to keyserver, set as default
 *
 * Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 11.1
 */

import { MessageEncryptionScheme } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import LockIcon from '@mui/icons-material/Lock';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import LinearProgress from '@mui/material/LinearProgress';
import Tab from '@mui/material/Tab';
import Tabs from '@mui/material/Tabs';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { FC, memo, useCallback, useRef, useState } from 'react';

import { isValidGpgPublicKey } from './KeyManagementSettings';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface GpgSetupWizardProps {
  open: boolean;
  onClose: () => void;
  /** Generate a new GPG keypair with the given passphrase. */
  onGenerateKeyPair: (passphrase: string) => Promise<void>;
  /** Import a GPG public key (ASCII-armored string). */
  onImportPublicKey: (armoredKey: string) => Promise<void>;
  /** Import a GPG public key by searching keyservers for an email. */
  onImportByEmail: (email: string) => Promise<void>;
  /** Publish the user's GPG public key to a keyserver. */
  onPublishKey?: () => Promise<void>;
  /** Set the user's default encryption preference. */
  onSetDefaultEncryption?: (scheme: MessageEncryptionScheme) => Promise<void>;
  /** Fingerprint of the newly created/imported key (shown on success step). */
  keyFingerprint?: string;
}

type WizardStep = 'welcome' | 'generate' | 'import' | 'success';
type ImportTab = 'file' | 'paste' | 'keyserver';

// ─── Passphrase strength (exported for testing) ─────────────────────────────

export type PassphraseStrength = 'weak' | 'fair' | 'good' | 'strong';

/**
 * Evaluate passphrase strength based on length and character variety.
 * Exported for unit testing.
 */
export function evaluatePassphraseStrength(
  passphrase: string,
): PassphraseStrength {
  if (passphrase.length < 8) return 'weak';
  let score = 0;
  if (passphrase.length >= 12) score++;
  if (passphrase.length >= 20) score++;
  if (/[a-z]/.test(passphrase) && /[A-Z]/.test(passphrase)) score++;
  if (/\d/.test(passphrase)) score++;
  if (/[^a-zA-Z0-9]/.test(passphrase)) score++;
  if (score <= 1) return 'fair';
  if (score <= 3) return 'good';
  return 'strong';
}

/** Map strength to a 0–100 progress value. */
function strengthToProgress(s: PassphraseStrength): number {
  switch (s) {
    case 'weak':
      return 25;
    case 'fair':
      return 50;
    case 'good':
      return 75;
    case 'strong':
      return 100;
  }
}

/** Map strength to a MUI color. */
function strengthToColor(
  s: PassphraseStrength,
): 'error' | 'warning' | 'info' | 'success' {
  switch (s) {
    case 'weak':
      return 'error';
    case 'fair':
      return 'warning';
    case 'good':
      return 'info';
    case 'strong':
      return 'success';
  }
}

// ─── Component ──────────────────────────────────────────────────────────────

const GpgSetupWizard: FC<GpgSetupWizardProps> = ({
  open,
  onClose,
  onGenerateKeyPair,
  onImportPublicKey,
  onImportByEmail,
  onPublishKey,
  onSetDefaultEncryption,
  keyFingerprint,
}) => {
  const { t } = useBrightMailTranslation();

  // ── Wizard state ────────────────────────────────────────────────────
  const [step, setStep] = useState<WizardStep>('welcome');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // ── Generate state ──────────────────────────────────────────────────
  const [passphrase, setPassphrase] = useState('');
  const [passphraseConfirm, setPassphraseConfirm] = useState('');

  // ── Import state ────────────────────────────────────────────────────
  const [importTab, setImportTab] = useState<ImportTab>('file');
  const [pastedKey, setPastedKey] = useState('');
  const [keyserverEmail, setKeyserverEmail] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Success state ───────────────────────────────────────────────────
  const [published, setPublished] = useState(false);
  const [defaultSet, setDefaultSet] = useState(false);

  // ── Derived ─────────────────────────────────────────────────────────
  const strength = evaluatePassphraseStrength(passphrase);
  const passphrasesMatch = passphrase === passphraseConfirm;
  const canGenerate = passphrase.length >= 8 && passphrasesMatch && !loading;

  const strengthLabel = {
    weak: t(BrightMailStrings.GpgWizard_PassphraseStrengthWeak),
    fair: t(BrightMailStrings.GpgWizard_PassphraseStrengthFair),
    good: t(BrightMailStrings.GpgWizard_PassphraseStrengthGood),
    strong: t(BrightMailStrings.GpgWizard_PassphraseStrengthStrong),
  }[strength];

  // ── Reset on close ──────────────────────────────────────────────────
  const handleClose = useCallback(() => {
    setStep('welcome');
    setError(null);
    setLoading(false);
    setPassphrase('');
    setPassphraseConfirm('');
    setPastedKey('');
    setKeyserverEmail('');
    setPublished(false);
    setDefaultSet(false);
    onClose();
  }, [onClose]);

  // ── Generate handler ────────────────────────────────────────────────
  const handleGenerate = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await onGenerateKeyPair(passphrase);
      setStep('success');
    } catch {
      setError(t(BrightMailStrings.GpgWizard_ErrorGenerate));
    } finally {
      setLoading(false);
    }
  }, [onGenerateKeyPair, passphrase, t]);

  // ── Import file handler ─────────────────────────────────────────────
  const handleFileUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      setError(null);
      setLoading(true);
      try {
        const content = await file.text();
        if (!isValidGpgPublicKey(content)) {
          setError(t(BrightMailStrings.GpgWizard_ErrorImport));
          return;
        }
        await onImportPublicKey(content);
        setStep('success');
      } catch {
        setError(t(BrightMailStrings.GpgWizard_ErrorImport));
      } finally {
        setLoading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    },
    [onImportPublicKey, t],
  );

  // ── Import paste handler ────────────────────────────────────────────
  const handlePasteImport = useCallback(async () => {
    setError(null);
    if (!isValidGpgPublicKey(pastedKey)) {
      setError(t(BrightMailStrings.GpgWizard_ErrorImport));
      return;
    }
    setLoading(true);
    try {
      await onImportPublicKey(pastedKey);
      setStep('success');
    } catch {
      setError(t(BrightMailStrings.GpgWizard_ErrorImport));
    } finally {
      setLoading(false);
    }
  }, [onImportPublicKey, pastedKey, t]);

  // ── Import keyserver handler ────────────────────────────────────────
  const handleKeyserverImport = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      await onImportByEmail(keyserverEmail);
      setStep('success');
    } catch {
      setError(t(BrightMailStrings.GpgWizard_ErrorImport));
    } finally {
      setLoading(false);
    }
  }, [onImportByEmail, keyserverEmail, t]);

  // ── Publish handler ─────────────────────────────────────────────────
  const handlePublish = useCallback(async () => {
    if (!onPublishKey) return;
    setError(null);
    setLoading(true);
    try {
      await onPublishKey();
      setPublished(true);
    } catch {
      setError(t(BrightMailStrings.GpgWizard_ErrorPublish));
    } finally {
      setLoading(false);
    }
  }, [onPublishKey, t]);

  // ── Set default handler ─────────────────────────────────────────────
  const handleSetDefault = useCallback(async () => {
    if (!onSetDefaultEncryption) return;
    try {
      await onSetDefaultEncryption(MessageEncryptionScheme.GPG);
      setDefaultSet(true);
    } catch {
      // silently ignore — non-critical
    }
  }, [onSetDefaultEncryption]);

  // ── Step: Welcome ────────────────────────────────────────────────────
  const welcomeStep = (
    <Box
      data-testid="gpg-wizard-welcome"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Box sx={{ textAlign: 'center', mb: 1 }}>
        <LockIcon sx={{ fontSize: 48, color: 'primary.main', mb: 1 }} />
        <Typography variant="h6">
          {t(BrightMailStrings.GpgWizard_WelcomeHeading)}
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary">
        {t(BrightMailStrings.GpgWizard_WelcomeBody)}
      </Typography>
      <Alert severity="info" variant="outlined" sx={{ mt: 1 }}>
        {t(BrightMailStrings.GpgWizard_EciesNote)}
      </Alert>

      {/* Option cards */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          mt: 1,
        }}
      >
        <Button
          variant="contained"
          size="large"
          onClick={() => {
            setError(null);
            setStep('generate');
          }}
          data-testid="gpg-wizard-generate-option"
          sx={{
            textTransform: 'none',
            justifyContent: 'flex-start',
            px: 3,
            py: 1.5,
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle2">
              {t(BrightMailStrings.GpgWizard_OptionGenerate)}
            </Typography>
            <Typography variant="caption" sx={{ opacity: 0.85 }}>
              {t(BrightMailStrings.GpgWizard_OptionGenerateDesc)}
            </Typography>
          </Box>
        </Button>

        <Button
          variant="outlined"
          size="large"
          onClick={() => {
            setError(null);
            setStep('import');
          }}
          data-testid="gpg-wizard-import-option"
          sx={{
            textTransform: 'none',
            justifyContent: 'flex-start',
            px: 3,
            py: 1.5,
          }}
        >
          <Box sx={{ textAlign: 'left' }}>
            <Typography variant="subtitle2">
              {t(BrightMailStrings.GpgWizard_OptionImport)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {t(BrightMailStrings.GpgWizard_OptionImportDesc)}
            </Typography>
          </Box>
        </Button>
      </Box>
    </Box>
  );

  // ── Step: Generate ──────────────────────────────────────────────────
  const generateStep = (
    <Box
      data-testid="gpg-wizard-generate"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h6">
        {t(BrightMailStrings.GpgWizard_GenerateHeading)}
      </Typography>
      <Typography variant="body2" color="text.secondary">
        {t(BrightMailStrings.GpgWizard_GenerateBody)}
      </Typography>

      <TextField
        type="password"
        label={t(BrightMailStrings.GpgWizard_PassphraseLabel)}
        value={passphrase}
        onChange={(e) => setPassphrase(e.target.value)}
        fullWidth
        size="small"
        autoFocus
        data-testid="gpg-wizard-passphrase"
        inputProps={{
          'aria-label': t(BrightMailStrings.GpgWizard_PassphraseLabel),
        }}
      />

      {passphrase.length > 0 && (
        <Box data-testid="gpg-wizard-strength">
          <Box
            sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}
          >
            <Typography variant="caption" color="text.secondary">
              {strengthLabel}
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={strengthToProgress(strength)}
            color={strengthToColor(strength)}
            sx={{ height: 6, borderRadius: 3 }}
          />
        </Box>
      )}

      <TextField
        type="password"
        label={t(BrightMailStrings.GpgWizard_PassphraseConfirmLabel)}
        value={passphraseConfirm}
        onChange={(e) => setPassphraseConfirm(e.target.value)}
        fullWidth
        size="small"
        error={passphraseConfirm.length > 0 && !passphrasesMatch}
        helperText={
          passphraseConfirm.length > 0 && !passphrasesMatch
            ? t(BrightMailStrings.GpgWizard_PassphraseMismatch)
            : undefined
        }
        data-testid="gpg-wizard-passphrase-confirm"
        inputProps={{
          'aria-label': t(BrightMailStrings.GpgWizard_PassphraseConfirmLabel),
        }}
      />

      {error && (
        <Alert severity="error" data-testid="gpg-wizard-error">
          {error}
        </Alert>
      )}

      <Box
        sx={{ display: 'flex', gap: 1, justifyContent: 'space-between', mt: 1 }}
      >
        <Button onClick={() => setStep('welcome')} disabled={loading}>
          {t(BrightMailStrings.GpgWizard_Back)}
        </Button>
        <Button
          variant="contained"
          onClick={handleGenerate}
          disabled={!canGenerate}
          data-testid="gpg-wizard-generate-btn"
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
        >
          {loading
            ? t(BrightMailStrings.GpgWizard_Generating)
            : t(BrightMailStrings.GpgWizard_GenerateButton)}
        </Button>
      </Box>
    </Box>
  );

  // ── Step: Import ─────────────────────────────────────────────────────
  const importStep = (
    <Box
      data-testid="gpg-wizard-import"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      <Typography variant="h6">
        {t(BrightMailStrings.GpgWizard_ImportHeading)}
      </Typography>

      <Tabs
        value={importTab}
        onChange={(_, v) => {
          setImportTab(v as ImportTab);
          setError(null);
        }}
        variant="fullWidth"
        data-testid="gpg-wizard-import-tabs"
      >
        <Tab
          value="file"
          label={t(BrightMailStrings.GpgWizard_ImportTabFile)}
        />
        <Tab
          value="paste"
          label={t(BrightMailStrings.GpgWizard_ImportTabPaste)}
        />
        <Tab
          value="keyserver"
          label={t(BrightMailStrings.GpgWizard_ImportTabKeyserver)}
        />
      </Tabs>

      {/* File upload tab */}
      {importTab === 'file' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <Typography variant="body2" color="text.secondary">
            {t(BrightMailStrings.GpgWizard_ImportFilePrompt)}
          </Typography>
          <input
            ref={fileInputRef}
            type="file"
            accept=".asc,.gpg,.pgp,.pub"
            onChange={handleFileUpload}
            style={{ display: 'none' }}
            data-testid="gpg-wizard-file-input"
          />
          <Button
            variant="outlined"
            onClick={() => fileInputRef.current?.click()}
            disabled={loading}
            data-testid="gpg-wizard-file-btn"
          >
            {t(BrightMailStrings.GpgWizard_ImportTabFile)}
          </Button>
        </Box>
      )}

      {/* Paste tab */}
      {importTab === 'paste' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            multiline
            minRows={4}
            maxRows={8}
            label={t(BrightMailStrings.GpgWizard_ImportPasteLabel)}
            value={pastedKey}
            onChange={(e) => setPastedKey(e.target.value)}
            fullWidth
            size="small"
            data-testid="gpg-wizard-paste-field"
            inputProps={{
              'aria-label': t(BrightMailStrings.GpgWizard_ImportPasteLabel),
            }}
          />
          <Button
            variant="contained"
            onClick={handlePasteImport}
            disabled={!pastedKey.trim() || loading}
            data-testid="gpg-wizard-paste-import-btn"
          >
            {t(BrightMailStrings.GpgWizard_ImportButton)}
          </Button>
        </Box>
      )}

      {/* Keyserver tab */}
      {importTab === 'keyserver' && (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          <TextField
            type="email"
            label={t(BrightMailStrings.GpgWizard_ImportKeyserverLabel)}
            value={keyserverEmail}
            onChange={(e) => setKeyserverEmail(e.target.value)}
            fullWidth
            size="small"
            helperText={t(BrightMailStrings.GpgWizard_ImportKeyserverHint)}
            data-testid="gpg-wizard-keyserver-email"
            inputProps={{
              'aria-label': t(BrightMailStrings.GpgWizard_ImportKeyserverLabel),
            }}
          />
          <Button
            variant="contained"
            onClick={handleKeyserverImport}
            disabled={!keyserverEmail.trim() || loading}
            data-testid="gpg-wizard-keyserver-btn"
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
          >
            {loading
              ? t(BrightMailStrings.GpgWizard_Searching)
              : t(BrightMailStrings.GpgWizard_ImportButton)}
          </Button>
        </Box>
      )}

      {error && (
        <Alert severity="error" data-testid="gpg-wizard-error">
          {error}
        </Alert>
      )}

      <Box sx={{ display: 'flex', justifyContent: 'flex-start', mt: 1 }}>
        <Button onClick={() => setStep('welcome')} disabled={loading}>
          {t(BrightMailStrings.GpgWizard_Back)}
        </Button>
      </Box>
    </Box>
  );

  // ── Step: Success ───────────────────────────────────────────────────
  const successStep = (
    <Box
      data-testid="gpg-wizard-success"
      sx={{
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        alignItems: 'center',
      }}
    >
      <CheckCircleOutlineIcon sx={{ fontSize: 56, color: 'success.main' }} />
      <Typography variant="h6">
        {t(BrightMailStrings.GpgWizard_SuccessHeading)}
      </Typography>
      <Typography variant="body2" color="text.secondary" textAlign="center">
        {t(BrightMailStrings.GpgWizard_SuccessBody)}
      </Typography>

      {keyFingerprint && (
        <Box
          data-testid="gpg-wizard-fingerprint"
          sx={{
            bgcolor: 'action.hover',
            borderRadius: 1,
            px: 2,
            py: 1,
            fontFamily: 'monospace',
            fontSize: '0.85rem',
            wordBreak: 'break-all',
            textAlign: 'center',
            width: '100%',
          }}
        >
          <Typography variant="caption" color="text.secondary" display="block">
            {t(BrightMailStrings.GpgWizard_SuccessFingerprint)}
          </Typography>
          {keyFingerprint}
        </Box>
      )}

      {/* Optional actions */}
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          gap: 1.5,
          width: '100%',
          mt: 1,
        }}
      >
        {onPublishKey && !published && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t(BrightMailStrings.GpgWizard_PublishPrompt)}
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handlePublish}
              disabled={loading}
              data-testid="gpg-wizard-publish-btn"
              startIcon={loading ? <CircularProgress size={16} /> : undefined}
            >
              {t(BrightMailStrings.GpgWizard_PublishButton)}
            </Button>
          </Box>
        )}
        {published && (
          <Alert severity="success" data-testid="gpg-wizard-published">
            {t(BrightMailStrings.GpgWizard_PublishButton)} ✓
          </Alert>
        )}

        {onSetDefaultEncryption && !defaultSet && (
          <Box>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
              {t(BrightMailStrings.GpgWizard_SetDefaultPrompt)}
            </Typography>
            <Button
              variant="outlined"
              fullWidth
              onClick={handleSetDefault}
              data-testid="gpg-wizard-set-default-btn"
            >
              {t(BrightMailStrings.GpgWizard_SetDefaultButton)}
            </Button>
          </Box>
        )}
        {defaultSet && (
          <Alert severity="success" data-testid="gpg-wizard-default-set">
            {t(BrightMailStrings.GpgWizard_SetDefaultButton)} ✓
          </Alert>
        )}
      </Box>

      {error && (
        <Alert severity="error" data-testid="gpg-wizard-error">
          {error}
        </Alert>
      )}

      <Button
        variant="contained"
        onClick={handleClose}
        sx={{ mt: 1 }}
        data-testid="gpg-wizard-done-btn"
      >
        {t(BrightMailStrings.GpgWizard_Done)}
      </Button>
    </Box>
  );

  // ── Render ──────────────────────────────────────────────────────────
  const stepContent = {
    welcome: welcomeStep,
    generate: generateStep,
    import: importStep,
    success: successStep,
  }[step];

  return (
    <Dialog
      open={open}
      onClose={step === 'success' ? handleClose : undefined}
      maxWidth="sm"
      fullWidth
      aria-labelledby="gpg-wizard-title"
      data-testid="gpg-setup-wizard"
    >
      <DialogTitle id="gpg-wizard-title">
        {t(BrightMailStrings.GpgWizard_Title)}
      </DialogTitle>
      <DialogContent sx={{ pb: 3 }}>{stepContent}</DialogContent>
    </Dialog>
  );
};

export default memo(GpgSetupWizard);
