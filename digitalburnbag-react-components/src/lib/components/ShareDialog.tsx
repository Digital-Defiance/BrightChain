import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  MenuItem,
  Radio,
  RadioGroup,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

export interface IShareLinkOptions {
  encryptionMode:
    | 'server_proxied'
    | 'ephemeral_key_pair'
    | 'recipient_public_key';
  password?: string;
  expiresAt?: string;
  maxAccessCount?: number;
  blockDownload?: boolean;
  scope: 'specific_people' | 'organization' | 'anonymous';
  recipientPublicKey?: string;
}

export interface IShareDialogProps {
  open: boolean;
  onClose: () => void;
  fileId: string;
  fileName: string;
  onShareInternal: (email: string, permission: string) => Promise<void>;
  onCreateShareLink: (
    options: IShareLinkOptions,
  ) => Promise<{ token: string; url: string }>;
  onGetMagnetUrl?: () => Promise<{ magnetUrl: string }>;
}

export function ShareDialog({
  open,
  onClose,
  fileName,
  onShareInternal,
  onCreateShareLink,
  onGetMagnetUrl,
}: IShareDialogProps) {
  const { tBranded: t } = useI18n();
  const [email, setEmail] = useState('');
  const [permission, setPermission] = useState('Viewer');
  const [sharing, setSharing] = useState(false);
  const [shareResult, setShareResult] = useState<string | null>(null);
  const [error, setError] = useState('');

  // Advanced state
  const [encryptionMode, setEncryptionMode] =
    useState<IShareLinkOptions['encryptionMode']>('server_proxied');
  const [password, setPassword] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [maxAccessCount, setMaxAccessCount] = useState('');
  const [blockDownload, setBlockDownload] = useState(false);
  const [scope, setScope] =
    useState<IShareLinkOptions['scope']>('specific_people');
  const [recipientPublicKey, setRecipientPublicKey] = useState('');
  const [magnetUrl, setMagnetUrl] = useState<string | null>(null);

  const encryptionDescriptions: Record<
    string,
    { label: string; desc: string }
  > = {
    server_proxied: {
      label: t(DigitalBurnbagStrings.Share_ServerProxied),
      desc: t(DigitalBurnbagStrings.Share_ServerProxiedDesc),
    },
    ephemeral_key_pair: {
      label: t(DigitalBurnbagStrings.Share_EphemeralKeyPair),
      desc: t(DigitalBurnbagStrings.Share_EphemeralKeyPairDesc),
    },
    recipient_public_key: {
      label: t(DigitalBurnbagStrings.Share_RecipientPublicKey),
      desc: t(DigitalBurnbagStrings.Share_RecipientPublicKeyDesc),
    },
  };

  const resetForm = useCallback(() => {
    setEmail('');
    setPermission('Viewer');
    setSharing(false);
    setShareResult(null);
    setError('');
    setMagnetUrl(null);
    setEncryptionMode('server_proxied');
    setPassword('');
    setExpiresAt('');
    setMaxAccessCount('');
    setBlockDownload(false);
    setScope('specific_people');
    setRecipientPublicKey('');
  }, []);

  const handleClose = useCallback(() => {
    resetForm();
    onClose();
  }, [onClose, resetForm]);

  const handleShareInternal = useCallback(async () => {
    if (!email.trim()) return;
    setSharing(true);
    setError('');
    try {
      await onShareInternal(email.trim(), permission);
      setShareResult(`Shared with ${email.trim()} as ${permission}`);
      setEmail('');
    } catch (e: unknown) {
      setError(
        e instanceof Error ? e.message : t(DigitalBurnbagStrings.Share_Failed),
      );
    } finally {
      setSharing(false);
    }
  }, [email, permission, onShareInternal, t]);

  const handleCreateLink = useCallback(async () => {
    setSharing(true);
    setError('');
    try {
      const opts: IShareLinkOptions = { encryptionMode, scope, blockDownload };
      if (password) opts.password = password;
      if (expiresAt) opts.expiresAt = expiresAt;
      const mac = parseInt(maxAccessCount, 10);
      if (!isNaN(mac) && mac > 0) opts.maxAccessCount = mac;
      if (encryptionMode === 'recipient_public_key' && recipientPublicKey)
        opts.recipientPublicKey = recipientPublicKey;
      const result = await onCreateShareLink(opts);
      setShareResult(result.url);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(DigitalBurnbagStrings.Share_LinkFailed),
      );
    } finally {
      setSharing(false);
    }
  }, [
    encryptionMode,
    scope,
    blockDownload,
    password,
    expiresAt,
    maxAccessCount,
    recipientPublicKey,
    onCreateShareLink,
    t,
  ]);

  const handleGetMagnetUrl = useCallback(async () => {
    if (!onGetMagnetUrl) return;
    setSharing(true);
    setError('');
    try {
      const result = await onGetMagnetUrl();
      setMagnetUrl(result.magnetUrl);
    } catch (e: unknown) {
      setError(
        e instanceof Error
          ? e.message
          : t(DigitalBurnbagStrings.Share_MagnetFailed),
      );
    } finally {
      setSharing(false);
    }
  }, [onGetMagnetUrl, t]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      aria-labelledby="share-dialog-title"
    >
      <DialogTitle id="share-dialog-title">
        {t(DigitalBurnbagStrings.Share_Title).replace('{fileName}', fileName)}
      </DialogTitle>
      <DialogContent dividers>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}
        {shareResult && (
          <Alert severity="success" sx={{ mb: 2 }}>
            {shareResult}
          </Alert>
        )}

        {/* Simple mode: internal share */}
        <Typography variant="subtitle2" gutterBottom>
          {t(DigitalBurnbagStrings.Share_WithUser)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1, mb: 2 }}>
          <TextField
            size="small"
            label={t(DigitalBurnbagStrings.Share_EmailLabel)}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            sx={{ flexGrow: 1 }}
          />
          <Select
            size="small"
            value={permission}
            onChange={(e) => setPermission(e.target.value)}
            sx={{ minWidth: 100 }}
          >
            <MenuItem value="Viewer">
              {t(DigitalBurnbagStrings.Share_PermView)}
            </MenuItem>
            <MenuItem value="Editor">
              {t(DigitalBurnbagStrings.Share_PermEdit)}
            </MenuItem>
          </Select>
          <Button
            variant="contained"
            onClick={handleShareInternal}
            disabled={sharing || !email.trim()}
          >
            {t(DigitalBurnbagStrings.Share_Button)}
          </Button>
        </Box>

        {/* Advanced options */}
        <Accordion>
          <AccordionSummary expandIcon={<ExpandMoreIcon />}>
            <Typography variant="subtitle2">
              {t(DigitalBurnbagStrings.Share_AdvancedOptions)}
            </Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Typography variant="body2" gutterBottom>
              {t(DigitalBurnbagStrings.Share_EncryptionMode)}
            </Typography>
            <RadioGroup
              value={encryptionMode}
              onChange={(e) =>
                setEncryptionMode(
                  e.target.value as IShareLinkOptions['encryptionMode'],
                )
              }
            >
              {(
                [
                  'server_proxied',
                  'ephemeral_key_pair',
                  'recipient_public_key',
                ] as const
              ).map((mode) => (
                <FormControlLabel
                  key={mode}
                  value={mode}
                  control={<Radio size="small" />}
                  label={
                    <Box>
                      <Typography variant="body2">
                        {encryptionDescriptions[mode].label}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {encryptionDescriptions[mode].desc}
                      </Typography>
                    </Box>
                  }
                />
              ))}
            </RadioGroup>

            {encryptionMode === 'recipient_public_key' && (
              <TextField
                size="small"
                fullWidth
                margin="normal"
                label={t(DigitalBurnbagStrings.Share_RecipientKeyLabel)}
                value={recipientPublicKey}
                onChange={(e) => setRecipientPublicKey(e.target.value)}
                multiline
                minRows={2}
              />
            )}

            <TextField
              size="small"
              fullWidth
              margin="normal"
              label={t(DigitalBurnbagStrings.Share_PasswordLabel)}
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <TextField
              size="small"
              fullWidth
              margin="normal"
              label={t(DigitalBurnbagStrings.Share_ExpiresAtLabel)}
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              slotProps={{ inputLabel: { shrink: true } }}
            />
            <TextField
              size="small"
              fullWidth
              margin="normal"
              label={t(DigitalBurnbagStrings.Share_MaxAccessLabel)}
              type="number"
              value={maxAccessCount}
              onChange={(e) => setMaxAccessCount(e.target.value)}
            />

            <Typography variant="body2" gutterBottom sx={{ mt: 1 }}>
              {t(DigitalBurnbagStrings.Share_ScopeLabel)}
            </Typography>
            <RadioGroup
              value={scope}
              onChange={(e) =>
                setScope(e.target.value as IShareLinkOptions['scope'])
              }
              row
            >
              <FormControlLabel
                value="specific_people"
                control={<Radio size="small" />}
                label={t(DigitalBurnbagStrings.Share_ScopeSpecific)}
              />
              <FormControlLabel
                value="organization"
                control={<Radio size="small" />}
                label={t(DigitalBurnbagStrings.Share_ScopeOrganization)}
              />
              <FormControlLabel
                value="anonymous"
                control={<Radio size="small" />}
                label={t(DigitalBurnbagStrings.Share_ScopeAnonymous)}
              />
            </RadioGroup>

            <FormControlLabel
              control={
                <Checkbox
                  size="small"
                  checked={blockDownload}
                  onChange={(e) => setBlockDownload(e.target.checked)}
                />
              }
              label={t(DigitalBurnbagStrings.Share_BlockDownload)}
            />

            <Button
              variant="outlined"
              fullWidth
              sx={{ mt: 2 }}
              onClick={handleCreateLink}
              disabled={sharing}
            >
              {t(DigitalBurnbagStrings.Share_CreateLink)}
            </Button>
          </AccordionDetails>
        </Accordion>

        {/* Magnet URL */}
        {onGetMagnetUrl && (
          <Box sx={{ mt: 2 }}>
            <Alert severity="warning" sx={{ mb: 1 }}>
              {t(DigitalBurnbagStrings.Share_MagnetWarning)}
            </Alert>
            {magnetUrl ? (
              <Alert severity="info">{magnetUrl}</Alert>
            ) : (
              <Button
                variant="outlined"
                color="warning"
                onClick={handleGetMagnetUrl}
                disabled={sharing}
              >
                {t(DigitalBurnbagStrings.Share_GetMagnetUrl)}
              </Button>
            )}
          </Box>
        )}
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose}>
          {t(DigitalBurnbagStrings.Share_Close)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}
