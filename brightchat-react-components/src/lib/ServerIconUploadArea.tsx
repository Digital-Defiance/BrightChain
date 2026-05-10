/**
 * ServerIconUploadArea — Circular avatar with upload/change/remove controls.
 *
 * Manages the staging lifecycle: opens IconCropDialog → receives commitToken
 * → calls chatApi.uploadServerIcon → calls onIconUploaded. Displays upload
 * progress, error messages, and disabled state.
 *
 * Requirements: 6.1, 6.2, 6.3, 7.1, 7.2, 7.3, 9.1, 9.4
 */
import type {
  IServer,
  ITempUploadResponse,
} from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Typography from '@mui/material/Typography';
import { FC, memo, useCallback, useState } from 'react';
import IconCropDialog from './IconCropDialog';
import SafeFaIcon from './SafeFaIcon';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ServerIconUploadAreaProps {
  /** Current icon URL (if any) */
  currentIconUrl?: string;
  /** Current FontAwesome icon class (e.g. "fa-solid fa-gamepad") */
  currentIconFaClass?: string;
  /** Server name for letter avatar fallback */
  serverName: string;
  /** Server ID — needed for the icon commit call */
  serverId?: string;
  /** Called when icon upload completes successfully — returns updated IServer */
  onIconUploaded?: (server: IServer) => void;
  /** Called when user clicks "Remove Icon" */
  onIconRemove?: () => void;
  /** Called when a commit token is obtained from staging (for create-server flow) */
  onCommitTokenChange?: (commitToken: string | null) => void;
  /** Whether an icon is currently set (controls Remove button visibility) */
  hasIcon: boolean;
  /** Whether upload is in progress (external control) */
  uploading?: boolean;
  /** Error message to display (external control) */
  error?: string | null;
  /** Whether the component is disabled (e.g., during form submission) */
  disabled?: boolean;
  /** Chat API client with stageFile and uploadServerIcon methods */
  chatApi?: {
    stageFile: (file: File) => Promise<ITempUploadResponse>;
    uploadServerIcon: (
      serverId: string,
      commitToken: string,
    ) => Promise<IServer>;
  };
}

// ─── Constants ──────────────────────────────────────────────────────────────

const AVATAR_SIZE = 80;

// ─── Component ──────────────────────────────────────────────────────────────

const ServerIconUploadArea: FC<ServerIconUploadAreaProps> = ({
  currentIconUrl,
  currentIconFaClass,
  serverName,
  serverId,
  onIconUploaded,
  onIconRemove,
  onCommitTokenChange,
  hasIcon,
  uploading: externalUploading,
  error: externalError,
  disabled,
  chatApi,
}) => {
  const { tBranded: t } = useI18n();

  const [cropDialogOpen, setCropDialogOpen] = useState(false);
  const [internalUploading, setInternalUploading] = useState(false);
  const [internalError, setInternalError] = useState<string | null>(null);
  const [stagedCommitToken, setStagedCommitToken] = useState<string | null>(
    null,
  );
  const [stagedPreviewUrl, setStagedPreviewUrl] = useState<string | null>(null);

  const uploading = externalUploading || internalUploading;
  const error = externalError ?? internalError;

  // ─── Crop dialog handlers ───────────────────────────────────────────

  const handleOpenCropDialog = useCallback(() => {
    setInternalError(null);
    setCropDialogOpen(true);
  }, []);

  const handleCloseCropDialog = useCallback(() => {
    setCropDialogOpen(false);
  }, []);

  const handleImageStaged = useCallback(
    (commitToken: string, previewUrl: string) => {
      setStagedCommitToken(commitToken);
      setStagedPreviewUrl(previewUrl);
    },
    [],
  );

  const handleCropComplete = useCallback(
    async (commitToken: string) => {
      setCropDialogOpen(false);

      if (!chatApi || !serverId) {
        // If no chatApi or serverId, just store the token for parent to use
        setStagedCommitToken(commitToken);
        onCommitTokenChange?.(commitToken);
        return;
      }

      setInternalUploading(true);
      setInternalError(null);

      try {
        const updatedServer = await chatApi.uploadServerIcon(
          serverId,
          commitToken,
        );
        setStagedCommitToken(null);
        setStagedPreviewUrl(null);
        onIconUploaded?.(updatedServer);
      } catch (err) {
        // Check for staging expiry (410)
        const message = err instanceof Error ? err.message : String(err);
        if (message.includes('410') || message.includes('expired')) {
          setInternalError(t(BrightChatStrings.Server_Icon_StagingExpired));
        } else {
          setInternalError(t(BrightChatStrings.Server_Icon_UploadFailed));
        }
      } finally {
        setInternalUploading(false);
      }
    },
    [chatApi, serverId, onIconUploaded, onCommitTokenChange, t],
  );

  // ─── Remove handler ─────────────────────────────────────────────────

  const handleRemove = useCallback(() => {
    onIconRemove?.();
  }, [onIconRemove]);

  // ─── Render ─────────────────────────────────────────────────────────

  const displayUrl = stagedPreviewUrl ?? currentIconUrl;
  const letterFallback = serverName.charAt(0).toUpperCase() || '?';

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 1.5,
      }}
      data-testid="server-icon-upload-area"
    >
      {/* Avatar display */}
      <Box sx={{ position: 'relative' }}>
        {displayUrl ? (
          <Avatar
            src={displayUrl}
            alt={serverName}
            sx={{ width: AVATAR_SIZE, height: AVATAR_SIZE }}
            data-testid="server-icon-avatar"
          />
        ) : currentIconFaClass ? (
          <Avatar
            sx={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              fontSize: 32,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
            data-testid="server-icon-avatar"
          >
            <SafeFaIcon className={currentIconFaClass} />
          </Avatar>
        ) : (
          <Avatar
            sx={{
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              fontSize: 32,
              fontWeight: 600,
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            }}
            data-testid="server-icon-avatar"
          >
            {letterFallback}
          </Avatar>
        )}

        {/* Upload progress overlay */}
        {uploading && (
          <Box
            sx={{
              position: 'absolute',
              top: 0,
              left: 0,
              width: AVATAR_SIZE,
              height: AVATAR_SIZE,
              borderRadius: '50%',
              bgcolor: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
            data-testid="upload-progress"
          >
            <CircularProgress size={32} sx={{ color: 'white' }} />
          </Box>
        )}
      </Box>

      {/* Upload progress status for screen readers (Req 9.4) */}
      <Box
        aria-live="polite"
        role="status"
        sx={{ position: 'absolute', left: -9999 }}
      >
        {uploading && t(BrightChatStrings.Server_Icon_Uploading)}
      </Box>

      {/* Action buttons */}
      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          variant="outlined"
          size="small"
          onClick={handleOpenCropDialog}
          disabled={disabled || uploading}
          data-testid="upload-icon-button"
        >
          {hasIcon
            ? t(BrightChatStrings.Server_Icon_Change)
            : t(BrightChatStrings.Server_Icon_Upload)}
        </Button>

        {hasIcon && (
          <Button
            variant="text"
            size="small"
            color="error"
            onClick={handleRemove}
            disabled={disabled || uploading}
            data-testid="remove-icon-button"
          >
            {t(BrightChatStrings.Server_Icon_Remove)}
          </Button>
        )}
      </Box>

      {/* Error display */}
      {error && (
        <Typography
          color="error"
          variant="body2"
          data-testid="icon-upload-error"
        >
          {error}
        </Typography>
      )}

      {/* IconCropDialog */}
      {chatApi && (
        <IconCropDialog
          open={cropDialogOpen}
          onClose={handleCloseCropDialog}
          onImageStaged={handleImageStaged}
          onCropComplete={handleCropComplete}
          initialPreviewUrl={stagedPreviewUrl ?? undefined}
          initialCommitToken={stagedCommitToken ?? undefined}
          chatApi={chatApi}
        />
      )}
    </Box>
  );
};

export default memo(ServerIconUploadArea);
