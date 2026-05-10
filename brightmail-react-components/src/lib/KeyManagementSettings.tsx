/**
 * KeyManagementSettings — User settings for managing GPG keypairs,
 * S/MIME certificates, and default encryption preferences.
 *
 * Three sections: GPG Keypair, S/MIME Certificate, Default Encryption Preference.
 * GPG: generate keypair, import/export public key, publish to keyserver, delete.
 * S/MIME: import PEM cert, import PKCS#12, view details, delete.
 * Preference: global default encryption scheme selector.
 *
 * Requirements: 1.3, 1.5, 2.1, 2.6, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7, 12.1–12.6, 13.1
 */

import type {
  IGpgKeyMetadata,
  ISmimeCertificateMetadata,
} from '@brightchain/brightchain-lib';
import {
  MessageEncryptionScheme,
} from '@brightchain/brightchain-lib';
import { useFormattedDate } from '@brightchain/brightchain-react-components';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import DeleteIcon from '@mui/icons-material/Delete';
import FileDownloadIcon from '@mui/icons-material/FileDownload';
import PublishIcon from '@mui/icons-material/Publish';
import SearchIcon from '@mui/icons-material/Search';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import VpnKeyIcon from '@mui/icons-material/VpnKey';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import IconButton from '@mui/material/IconButton';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import React, { FC, memo, useCallback, useMemo, useRef, useState } from 'react';

import GpgSetupWizard from './GpgSetupWizard';
import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface KeyManagementSettingsProps {
  // Existing props
  /** Current PEM-encoded S/MIME certificate, or undefined if none stored. */
  smimeCertificate?: string;
  /** Current ASCII-armored GPG public key, or undefined if none stored. */
  gpgPublicKey?: string;
  /** Callback to persist updated key values (legacy upload flow). */
  onUpdate: (changes: {
    smimeCertificate?: string | null;
    gpgPublicKey?: string | null;
  }) => Promise<void>;

  // New props
  /** GPG key metadata when a keypair exists. */
  gpgKeyMetadata?: IGpgKeyMetadata;
  /** S/MIME certificate metadata when a certificate exists. */
  smimeCertMetadata?: ISmimeCertificateMetadata;
  /** Whether the user has a GPG private key stored. */
  hasGpgPrivateKey: boolean;
  /** Whether the user has an S/MIME private key stored. */
  hasSmimePrivateKey: boolean;
  /** Generate a new GPG keypair with the given passphrase. */
  onGenerateGpgKeyPair: (passphrase: string) => Promise<void>;
  /** Export the user's GPG public key as ASCII armor. */
  onExportGpgPublicKey: () => Promise<string>;
  /** Import an S/MIME PKCS#12 bundle. */
  onImportSmimePkcs12: (data: Uint8Array, password: string) => Promise<void>;
  /** Publish the user's GPG public key to a keyserver. */
  onPublishGpgKey: () => Promise<void>;
  /** Import a GPG public key by searching for an email on a keyserver. */
  onImportGpgByEmail: (email: string) => Promise<void>;
  /** The user's current default encryption preference. */
  defaultEncryptionPreference: MessageEncryptionScheme;
  /** Set the user's default encryption preference. */
  onSetDefaultPreference: (scheme: MessageEncryptionScheme) => Promise<void>;
}

export interface KeyMetadata {
  label: string;
  value: string;
}

// ─── Validation helpers (exported for testing) ──────────────────────────────

/**
 * Validates that a string looks like a PEM-encoded X.509 certificate.
 */
export function isValidSmimeCertificate(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.includes('-----BEGIN CERTIFICATE-----') &&
    trimmed.includes('-----END CERTIFICATE-----')
  );
}

/**
 * Validates that a string looks like an ASCII-armored PGP public key block.
 */
export function isValidGpgPublicKey(content: string): boolean {
  const trimmed = content.trim();
  return (
    trimmed.includes('-----BEGIN PGP PUBLIC KEY BLOCK-----') &&
    trimmed.includes('-----END PGP PUBLIC KEY BLOCK-----')
  );
}

/**
 * Extracts basic metadata from a PEM certificate string.
 */
export function extractSmimeMetadata(pem: string): KeyMetadata[] {
  const lines = pem.trim().split('\n');
  const contentLines = lines.filter(
    (l) => !l.startsWith('-----') && l.trim().length > 0,
  );
  return [
    { label: 'Format', value: 'X.509 PEM' },
    { label: 'Size', value: `${contentLines.length} lines` },
  ];
}

/**
 * Extracts basic metadata from an ASCII-armored GPG public key.
 */
export function extractGpgMetadata(armored: string): KeyMetadata[] {
  const lines = armored.trim().split('\n');
  const contentLines = lines.filter(
    (l) => !l.startsWith('-----') && l.trim().length > 0,
  );
  return [
    { label: 'Format', value: 'ASCII-armored PGP' },
    { label: 'Size', value: `${contentLines.length} lines` },
  ];
}

// ─── Component ──────────────────────────────────────────────────────────────

const KeyManagementSettings: FC<KeyManagementSettingsProps> = ({
  smimeCertificate,
  gpgPublicKey,
  onUpdate,
  gpgKeyMetadata,
  smimeCertMetadata,
  hasGpgPrivateKey,
  hasSmimePrivateKey,
  onGenerateGpgKeyPair,
  onExportGpgPublicKey,
  onImportSmimePkcs12,
  onPublishGpgKey,
  onImportGpgByEmail,
  defaultEncryptionPreference,
  onSetDefaultPreference,
}) => {
  const [smimeError, setSmimeError] = useState<string | null>(null);
  const [gpgError, setGpgError] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);
  const { t } = useBrightMailTranslation();
  const { formatDate } = useFormattedDate();

  const PREFERENCE_OPTIONS = useMemo(
    () => [
      {
        value: MessageEncryptionScheme.NONE,
        label: t(BrightMailStrings.Encryption_None),
      },
      {
        value: MessageEncryptionScheme.GPG,
        label: t(BrightMailStrings.Encryption_GPG),
      },
      {
        value: MessageEncryptionScheme.S_MIME,
        label: t(BrightMailStrings.Encryption_SMIME),
      },
      {
        value: MessageEncryptionScheme.RECIPIENT_KEYS,
        label: t(BrightMailStrings.Encryption_ECIES),
      },
    ],
    [t],
  );

  // GPG generate dialog state
  const [showPassphraseInput, setShowPassphraseInput] = useState(false);
  const [passphrase, setPassphrase] = useState('');

  // GPG import-by-email state
  const [showImportByEmail, setShowImportByEmail] = useState(false);
  const [importEmail, setImportEmail] = useState('');

  // S/MIME PKCS#12 import state
  const [showPkcs12Import, setShowPkcs12Import] = useState(false);
  const [pkcs12Password, setPkcs12Password] = useState('');

  const smimeInputRef = useRef<HTMLInputElement>(null);
  const gpgInputRef = useRef<HTMLInputElement>(null);
  const pkcs12InputRef = useRef<HTMLInputElement>(null);
  const pkcs12FileRef = useRef<Uint8Array | null>(null);

  // GPG setup wizard state
  const [showGpgWizard, setShowGpgWizard] = useState(false);

  // ── S/MIME PEM upload handler ─────────────────────────────────────────
  const handleSmimeUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setSmimeError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        if (!isValidSmimeCertificate(content)) {
          setSmimeError(t(BrightMailStrings.KeyMgmt_ErrorInvalidCert));
          return;
        }
        setUpdating(true);
        await onUpdate({ smimeCertificate: content });
      } catch {
        setSmimeError(t(BrightMailStrings.KeyMgmt_ErrorUploadCert));
      } finally {
        setUpdating(false);
        if (smimeInputRef.current) smimeInputRef.current.value = '';
      }
    },
    [onUpdate],
  );

  // ── GPG upload handler ────────────────────────────────────────────────
  const handleGpgUpload = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      setGpgError(null);
      const file = e.target.files?.[0];
      if (!file) return;

      try {
        const content = await file.text();
        if (!isValidGpgPublicKey(content)) {
          setGpgError(t(BrightMailStrings.KeyMgmt_ErrorInvalidKey));
          return;
        }
        setUpdating(true);
        await onUpdate({ gpgPublicKey: content });
      } catch {
        setGpgError(t(BrightMailStrings.KeyMgmt_ErrorUploadKey));
      } finally {
        setUpdating(false);
        if (gpgInputRef.current) gpgInputRef.current.value = '';
      }
    },
    [onUpdate],
  );

  // ── Delete handlers ───────────────────────────────────────────────────
  const handleDeleteSmime = useCallback(async () => {
    setSmimeError(null);
    setUpdating(true);
    try {
      await onUpdate({ smimeCertificate: null });
    } catch {
      setSmimeError(t(BrightMailStrings.KeyMgmt_ErrorDeleteCert));
    } finally {
      setUpdating(false);
    }
  }, [onUpdate]);

  const handleDeleteGpg = useCallback(async () => {
    setGpgError(null);
    setUpdating(true);
    try {
      await onUpdate({ gpgPublicKey: null });
    } catch {
      setGpgError(t(BrightMailStrings.KeyMgmt_ErrorDeleteKey));
    } finally {
      setUpdating(false);
    }
  }, [onUpdate]);

  // ── GPG generate keypair handler ──────────────────────────────────────
  const handleGenerateGpgKeyPair = useCallback(async () => {
    if (!passphrase) return;
    setGpgError(null);
    setUpdating(true);
    try {
      await onGenerateGpgKeyPair(passphrase);
      setShowPassphraseInput(false);
      setPassphrase('');
    } catch {
      setGpgError(t(BrightMailStrings.KeyMgmt_ErrorGenerateKeypair));
    } finally {
      setUpdating(false);
    }
  }, [onGenerateGpgKeyPair, passphrase]);

  // ── GPG export public key handler ─────────────────────────────────────
  const handleExportGpgPublicKey = useCallback(async () => {
    setGpgError(null);
    try {
      const armored = await onExportGpgPublicKey();
      const blob = new Blob([armored], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'gpg-public-key.asc';
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setGpgError(t(BrightMailStrings.KeyMgmt_ErrorExportKey));
    }
  }, [onExportGpgPublicKey]);

  // ── GPG publish to keyserver handler ──────────────────────────────────
  const handlePublishGpgKey = useCallback(async () => {
    setGpgError(null);
    setUpdating(true);
    try {
      await onPublishGpgKey();
    } catch {
      setGpgError(t(BrightMailStrings.KeyMgmt_ErrorPublishKey));
    } finally {
      setUpdating(false);
    }
  }, [onPublishGpgKey]);

  // ── GPG import by email handler ───────────────────────────────────────
  const handleImportGpgByEmail = useCallback(async () => {
    if (!importEmail) return;
    setGpgError(null);
    setUpdating(true);
    try {
      await onImportGpgByEmail(importEmail);
      setShowImportByEmail(false);
      setImportEmail('');
    } catch {
      setGpgError(t(BrightMailStrings.KeyMgmt_ErrorImportByEmail));
    } finally {
      setUpdating(false);
    }
  }, [onImportGpgByEmail, importEmail]);

  // ── S/MIME PKCS#12 file select handler ────────────────────────────────
  const handlePkcs12FileSelect = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      const buffer = await file.arrayBuffer();
      pkcs12FileRef.current = new Uint8Array(buffer);
      setShowPkcs12Import(true);
      if (pkcs12InputRef.current) pkcs12InputRef.current.value = '';
    },
    [],
  );

  // ── S/MIME PKCS#12 import handler ─────────────────────────────────────
  const handleImportPkcs12 = useCallback(async () => {
    if (!pkcs12FileRef.current) return;
    setSmimeError(null);
    setUpdating(true);
    try {
      await onImportSmimePkcs12(pkcs12FileRef.current, pkcs12Password);
      setShowPkcs12Import(false);
      setPkcs12Password('');
      pkcs12FileRef.current = null;
    } catch {
      setSmimeError(t(BrightMailStrings.KeyMgmt_ErrorImportPkcs12));
    } finally {
      setUpdating(false);
    }
  }, [onImportSmimePkcs12, pkcs12Password]);

  // ── Default preference handler ────────────────────────────────────────
  const handlePreferenceChange = useCallback(
    async (e: SelectChangeEvent<string>) => {
      try {
        await onSetDefaultPreference(e.target.value as MessageEncryptionScheme);
      } catch {
        // Silently handle — parent can show error
      }
    },
    [onSetDefaultPreference],
  );

  const smimeMetadata = smimeCertificate
    ? extractSmimeMetadata(smimeCertificate)
    : null;
  const gpgMetadata = gpgPublicKey ? extractGpgMetadata(gpgPublicKey) : null;

  const hasGpgKeypair = hasGpgPrivateKey || !!gpgKeyMetadata;
  const hasSmimeCertStored = hasSmimePrivateKey || !!smimeCertMetadata;

  return (
    <Box
      data-testid="key-management-settings"
      sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}
    >
      {/* ── GPG Keypair Section ────────────────────────────────────────── */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightMailStrings.KeyMgmt_GpgKeypair)}
          </Typography>

          {gpgKeyMetadata ? (
            <Box data-testid="gpg-key-metadata" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Key ID: {gpgKeyMetadata.keyId}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Fingerprint: {gpgKeyMetadata.fingerprint}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Created:{' '}
                {formatDate(gpgKeyMetadata.createdAt)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                User ID: {gpgKeyMetadata.userId}
              </Typography>
              <Box sx={{ mt: 1, display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<FileDownloadIcon />}
                  onClick={handleExportGpgPublicKey}
                  disabled={updating}
                  data-testid="gpg-export-btn"
                >
                  {t(BrightMailStrings.KeyMgmt_ExportPublicKey)}
                </Button>
                <Button
                  variant="outlined"
                  size="small"
                  startIcon={<PublishIcon />}
                  onClick={handlePublishGpgKey}
                  disabled={updating}
                  data-testid="gpg-publish-btn"
                >
                  {t(BrightMailStrings.KeyMgmt_PublishToKeyserver)}
                </Button>
                <IconButton
                  data-testid="gpg-delete-btn"
                  onClick={handleDeleteGpg}
                  disabled={updating}
                  aria-label={t(BrightMailStrings.KeyMgmt_DeleteGpgKeypair)}
                  size="small"
                  color="error"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              </Box>
            </Box>
          ) : gpgMetadata ? (
            <Box data-testid="gpg-metadata" sx={{ mb: 1 }}>
              {gpgMetadata.map((m) => (
                <Typography
                  key={m.label}
                  variant="body2"
                  color="text.secondary"
                >
                  {m.label}: {m.value}
                </Typography>
              ))}
              <IconButton
                data-testid="gpg-delete-btn"
                onClick={handleDeleteGpg}
                disabled={updating}
                aria-label={t(BrightMailStrings.KeyMgmt_DeleteGpgPublicKey)}
                size="small"
                color="error"
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Box data-testid="gpg-no-keypair-prompt" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                {t(BrightMailStrings.KeyMgmt_NoGpgKeypair)}
              </Typography>
              <Button
                variant="contained"
                size="small"
                startIcon={<VpnKeyIcon />}
                onClick={() => setShowGpgWizard(true)}
                disabled={updating}
                data-testid="gpg-setup-wizard-btn"
              >
                {t(BrightMailStrings.GpgWizard_Title)}
              </Button>
            </Box>
          )}

          {gpgError && (
            <Alert severity="error" data-testid="gpg-error" sx={{ mb: 1 }}>
              {gpgError}
            </Alert>
          )}

          {/* Passphrase input for keypair generation */}
          {showPassphraseInput && (
            <Box
              data-testid="gpg-passphrase-input"
              sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                size="small"
                type="password"
                label={t(BrightMailStrings.KeyMgmt_Passphrase)}
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                data-testid="gpg-passphrase-field"
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleGenerateGpgKeyPair}
                disabled={updating || !passphrase}
                data-testid="gpg-generate-confirm-btn"
              >
                {t(BrightMailStrings.Action_Generate)}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setShowPassphraseInput(false);
                  setPassphrase('');
                }}
              >
                {t(BrightMailStrings.Action_Cancel)}
              </Button>
            </Box>
          )}

          {/* Import by email input */}
          {showImportByEmail && (
            <Box
              data-testid="gpg-import-email-input"
              sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                size="small"
                type="email"
                label={t(BrightMailStrings.KeyMgmt_EmailAddress)}
                value={importEmail}
                onChange={(e) => setImportEmail(e.target.value)}
                data-testid="gpg-import-email-field"
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleImportGpgByEmail}
                disabled={updating || !importEmail}
                data-testid="gpg-import-email-confirm-btn"
              >
                {t(BrightMailStrings.Action_Search)}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setShowImportByEmail(false);
                  setImportEmail('');
                }}
              >
                {t(BrightMailStrings.Action_Cancel)}
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {!hasGpgKeypair && !showPassphraseInput && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<VpnKeyIcon />}
                onClick={() => setShowPassphraseInput(true)}
                disabled={updating}
                data-testid="gpg-generate-btn"
              >
                {t(BrightMailStrings.KeyMgmt_GenerateKeypair)}
              </Button>
            )}

            <input
              ref={gpgInputRef}
              type="file"
              accept=".asc,.gpg,.pgp,.pub"
              onChange={handleGpgUpload}
              style={{ display: 'none' }}
              data-testid="gpg-file-input"
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => gpgInputRef.current?.click()}
              disabled={updating}
              data-testid="gpg-upload-btn"
            >
              {gpgPublicKey
                ? t(BrightMailStrings.KeyMgmt_ReplaceKey)
                : t(BrightMailStrings.KeyMgmt_ImportPublicKey)}
            </Button>

            {!showImportByEmail && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<SearchIcon />}
                onClick={() => setShowImportByEmail(true)}
                disabled={updating}
                data-testid="gpg-import-by-email-btn"
              >
                {t(BrightMailStrings.KeyMgmt_ImportByEmail)}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── S/MIME Certificate Section ─────────────────────────────────── */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightMailStrings.KeyMgmt_SmimeCertificate)}
          </Typography>

          {smimeCertMetadata ? (
            <Box data-testid="smime-cert-metadata" sx={{ mb: 1 }}>
              <Typography variant="body2" color="text.secondary">
                Subject: {smimeCertMetadata.subject}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Issuer: {smimeCertMetadata.issuer}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Serial: {smimeCertMetadata.serialNumber}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Valid From:{' '}
                {formatDate(smimeCertMetadata.validFrom)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Valid To:{' '}
                {formatDate(smimeCertMetadata.validTo)}
              </Typography>
              {smimeCertMetadata.emailAddresses.length > 0 && (
                <Typography variant="body2" color="text.secondary">
                  Email: {smimeCertMetadata.emailAddresses.join(', ')}
                </Typography>
              )}
              {smimeCertMetadata.isExpired && (
                <Alert
                  severity="warning"
                  sx={{ mt: 1 }}
                  data-testid="smime-expired-warning"
                >
                  {t(BrightMailStrings.KeyMgmt_CertExpired)}
                </Alert>
              )}
              <IconButton
                data-testid="smime-delete-btn"
                onClick={handleDeleteSmime}
                disabled={updating}
                aria-label={t(BrightMailStrings.KeyMgmt_DeleteSmimeCert)}
                size="small"
                color="error"
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : smimeMetadata ? (
            <Box data-testid="smime-metadata" sx={{ mb: 1 }}>
              {smimeMetadata.map((m) => (
                <Typography
                  key={m.label}
                  variant="body2"
                  color="text.secondary"
                >
                  {m.label}: {m.value}
                </Typography>
              ))}
              <IconButton
                data-testid="smime-delete-btn"
                onClick={handleDeleteSmime}
                disabled={updating}
                aria-label={t(BrightMailStrings.KeyMgmt_DeleteSmimeCert)}
                size="small"
                color="error"
                sx={{ mt: 0.5 }}
              >
                <DeleteIcon fontSize="small" />
              </IconButton>
            </Box>
          ) : (
            <Typography
              variant="body2"
              color="text.secondary"
              sx={{ mb: 1 }}
              data-testid="smime-no-cert-prompt"
            >
              {t(BrightMailStrings.KeyMgmt_NoSmimeCert)}
            </Typography>
          )}

          {smimeError && (
            <Alert severity="error" data-testid="smime-error" sx={{ mb: 1 }}>
              {smimeError}
            </Alert>
          )}

          {/* PKCS#12 password dialog */}
          {showPkcs12Import && (
            <Box
              data-testid="pkcs12-password-input"
              sx={{ mb: 1, display: 'flex', gap: 1, alignItems: 'center' }}
            >
              <TextField
                size="small"
                type="password"
                label={t(BrightMailStrings.KeyMgmt_Pkcs12Password)}
                value={pkcs12Password}
                onChange={(e) => setPkcs12Password(e.target.value)}
                data-testid="pkcs12-password-field"
              />
              <Button
                variant="contained"
                size="small"
                onClick={handleImportPkcs12}
                disabled={updating}
                data-testid="pkcs12-import-confirm-btn"
              >
                {t(BrightMailStrings.Action_Import)}
              </Button>
              <Button
                size="small"
                onClick={() => {
                  setShowPkcs12Import(false);
                  setPkcs12Password('');
                  pkcs12FileRef.current = null;
                }}
              >
                {t(BrightMailStrings.Action_Cancel)}
              </Button>
            </Box>
          )}

          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <input
              ref={smimeInputRef}
              type="file"
              accept=".pem,.crt,.cer"
              onChange={handleSmimeUpload}
              style={{ display: 'none' }}
              data-testid="smime-file-input"
            />
            <Button
              variant="outlined"
              size="small"
              startIcon={<UploadFileIcon />}
              onClick={() => smimeInputRef.current?.click()}
              disabled={updating}
              data-testid="smime-upload-btn"
            >
              {smimeCertificate
                ? t(BrightMailStrings.KeyMgmt_ReplaceCertificate)
                : t(BrightMailStrings.KeyMgmt_ImportCertPem)}
            </Button>

            <input
              ref={pkcs12InputRef}
              type="file"
              accept=".p12,.pfx"
              onChange={handlePkcs12FileSelect}
              style={{ display: 'none' }}
              data-testid="pkcs12-file-input"
            />
            {!hasSmimeCertStored && (
              <Button
                variant="outlined"
                size="small"
                startIcon={<UploadFileIcon />}
                onClick={() => pkcs12InputRef.current?.click()}
                disabled={updating}
                data-testid="pkcs12-upload-btn"
              >
                {t(BrightMailStrings.KeyMgmt_ImportPkcs12)}
              </Button>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* ── Default Encryption Preference Section ──────────────────────── */}
      <Card variant="outlined">
        <CardContent>
          <Typography variant="subtitle1" gutterBottom>
            {t(BrightMailStrings.Encryption_DefaultPreference)}
          </Typography>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="default-encryption-pref-label">
              {t(BrightMailStrings.Encryption_DefaultLabel)}
            </InputLabel>
            <Select
              labelId="default-encryption-pref-label"
              id="default-encryption-pref-select"
              value={defaultEncryptionPreference}
              label={t(BrightMailStrings.Encryption_DefaultLabel)}
              onChange={handlePreferenceChange}
              data-testid="default-encryption-pref-select"
            >
              {PREFERENCE_OPTIONS.map((opt) => (
                <MenuItem key={opt.value} value={opt.value}>
                  {opt.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </CardContent>
      </Card>

      {/* ── GPG Setup Wizard ───────────────────────────────────────────── */}
      <GpgSetupWizard
        open={showGpgWizard}
        onClose={() => setShowGpgWizard(false)}
        onGenerateKeyPair={onGenerateGpgKeyPair}
        onImportPublicKey={async (armoredKey) => {
          await onUpdate({ gpgPublicKey: armoredKey });
        }}
        onImportByEmail={onImportGpgByEmail}
        onPublishKey={onPublishGpgKey}
        onSetDefaultEncryption={onSetDefaultPreference}
        keyFingerprint={gpgKeyMetadata?.fingerprint}
      />
    </Box>
  );
};

export default memo(KeyManagementSettings);
