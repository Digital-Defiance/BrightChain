/**
 * CreateServerDialog — MUI Dialog for creating a new Server.
 *
 * Validates server name (1-100 chars), optional icon via staging upload,
 * calls createServer() on submit. If a commitToken is present, uploads
 * the icon after server creation. Displays API errors inline without
 * closing the dialog.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6
 */
import {
  CONSTANTS,
  type IServer,
  type ITempUploadResponse,
} from '@brightchain/brightchain-lib';
import { IEnvironment } from '@brightchain/brightchain-react-components';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  ChangeEvent,
  FC,
  FormEvent,
  memo,
  useCallback,
  useState,
} from 'react';
import FontAwesomeIconPicker from './FontAwesomeIconPicker';
import SafeFaIcon from './SafeFaIcon';
import ServerIconUploadArea from './ServerIconUploadArea';

// ─── Validation helper (exported for property-based testing) ────────────────

/**
 * Validates a server name. Returns null if valid, or an error message string.
 *
 * Valid: 1-100 characters (inclusive).
 * Invalid: empty string or length > 100.
 */
export function validateServerName(name: string): string | null {
  if (name.length === 0) {
    return 'Server name is required';
  }
  if (name.length > 100) {
    return 'Server name must be 100 characters or fewer';
  }
  return null;
}

// ─── Component ──────────────────────────────────────────────────────────────

export interface CreateServerDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated: (server: IServer) => void;
  /** API call to create a server. Injected for testability. */
  createServer: (params: {
    name: string;
    iconUrl?: string;
  }) => Promise<IServer>;
  /** Chat API client for staging and icon upload. */
  chatApi?: {
    stageFile: (file: File) => Promise<ITempUploadResponse>;
    uploadServerIcon: (
      serverId: string,
      commitToken: string,
    ) => Promise<IServer>;
  };
}

const CreateServerDialog: FC<CreateServerDialogProps> = ({
  open,
  onClose,
  onCreated,
  createServer,
  chatApi,
}) => {
  const { tBranded: t } = useI18n();
  const [name, setName] = useState('');
  const [commitToken, setCommitToken] = useState<string | null>(null);
  const [iconFaClass, setIconFaClass] = useState<string>('');
  const [faPickerOpen, setFaPickerOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [iconWarning, setIconWarning] = useState<string | null>(null);

  const handleNameChange = useCallback((e: ChangeEvent<HTMLInputElement>) => {
    setName(e.target.value);
    setError(null);
  }, []);

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();

      const validationError = validateServerName(name);
      if (validationError) {
        if (name.length === 0) {
          setError(t(BrightChatStrings.Create_Server_NameRequired));
        } else {
          setError(t(BrightChatStrings.Create_Server_NameTooLong));
        }
        return;
      }

      setSubmitting(true);
      setError(null);
      setIconWarning(null);

      try {
        // Step 1: Create server without icon
        const server = await createServer({
          name: name.trim(),
        });

        // Only one icon type should be active. FA icon takes precedence if
        // both were somehow set (the UI should prevent this, but be safe).
        // Step 2: If we have a staged image icon AND no FA icon, upload it
        let uploadedServer: typeof server | null = null;
        if (commitToken && chatApi && !iconFaClass) {
          try {
            uploadedServer = await chatApi.uploadServerIcon(server.id, commitToken);
          } catch {
            // Server created but icon upload failed — show warning, still navigate
            setIconWarning(t(BrightChatStrings.Server_Icon_UploadFailed));
          }
        }

        // Step 3: Build the final server object with the correct icon state.
        // If an FA icon was selected, attach it (image upload was skipped).
        // If an image was uploaded, use the server returned by uploadServerIcon.
        const finalServer = iconFaClass
          ? { ...server, iconFaClass }
          : uploadedServer
            ? { ...server, iconUrl: uploadedServer.iconUrl }
            : server;

        setName('');
        setCommitToken(null);
        setIconFaClass('');
        onClose();
        onCreated(finalServer);
      } catch (err) {
        // Display API error without closing dialog (Requirement 5.4)
        setError(
          err instanceof Error
            ? err.message
            : t(BrightChatStrings.Create_Server_Failed),
        );
      } finally {
        setSubmitting(false);
      }
    },
    [name, commitToken, iconFaClass, chatApi, createServer, onCreated, onClose, t],
  );

  const handleClose = useCallback(() => {
    if (!submitting) {
      setName('');
      setCommitToken(null);
      setIconFaClass('');
      setError(null);
      setIconWarning(null);
      onClose();
    }
  }, [submitting, onClose]);

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="create-server-dialog-title"
    >
      <form onSubmit={handleSubmit}>
        <DialogTitle id="create-server-dialog-title">
          {t(BrightChatStrings.Create_Server_Title)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            required
            fullWidth
            margin="dense"
            label={t(BrightChatStrings.Create_Server_NameLabel)}
            value={name}
            onChange={handleNameChange}
            inputProps={{ maxLength: 100 }}
            error={error !== null && error.includes('name')}
            helperText={error && error.includes('name') ? error : undefined}
            disabled={submitting}
          />

          {/* Server Icon Upload Area (Req 6.1, 6.2, 6.3) */}
          <ServerIconUploadArea
            serverName={name || '?'}
            currentIconFaClass={iconFaClass}
            hasIcon={commitToken !== null || !!iconFaClass}
            disabled={submitting}
            chatApi={chatApi}
            onCommitTokenChange={(token) => {
              setCommitToken(token);
              // Uploading an image clears any FA icon selection
              if (token) setIconFaClass('');
            }}
            onIconRemove={() => setCommitToken(null)}
          />

          {/* FontAwesome Icon Alternative */}
          <Box sx={{ my: 1 }}>
            <Typography variant="body2" color="text.secondary" gutterBottom>
              Or choose a FontAwesome icon:
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {iconFaClass && (
                <Box
                  sx={{
                    width: 32,
                    height: 32,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    border: 1,
                    borderColor: 'divider',
                    borderRadius: 1,
                    fontSize: 18,
                  }}
                >
                  <SafeFaIcon className={iconFaClass} />
                </Box>
              )}
              <Button
                variant="outlined"
                size="small"
                onClick={() => setFaPickerOpen(true)}
                disabled={submitting}
              >
                {iconFaClass ? 'Change Icon' : 'Pick Icon'}
              </Button>
              {iconFaClass && (
                <Button
                  variant="text"
                  size="small"
                  color="error"
                  onClick={() => setIconFaClass('')}
                  disabled={submitting}
                >
                  Remove
                </Button>
              )}
            </Box>
          </Box>

          <FontAwesomeIconPicker
            open={faPickerOpen}
            onClose={() => setFaPickerOpen(false)}
            currentFaClass={iconFaClass || undefined}
            onSelect={(faClass) => {
              setFaPickerOpen(false);
              setIconFaClass(faClass);
              // Selecting an FA icon clears any staged image upload
              if (faClass) setCommitToken(null);
            }}
            maxDisplay={
              (
                (window.APP_CONFIG as unknown as IEnvironment) ??
                CONSTANTS.BRIGHTCHAT.FONTAWESOME_MAX_DISPLAY
              ).brightChatFontAwesomeMaxDisplay
            }
            maxIconGridSize={
              (
                (window.APP_CONFIG as unknown as IEnvironment) ??
                CONSTANTS.BRIGHTCHAT.FONTAWESOME_ICON_GRID_SIZE
              ).brightChatFontAwesomeIconGridSize
            }
          />

          {error && !error.includes('name') && (
            <Typography color="error" variant="body2" sx={{ mt: 1 }}>
              {error}
            </Typography>
          )}
          {iconWarning && (
            <Typography
              color="warning.main"
              variant="body2"
              sx={{ mt: 1 }}
              data-testid="icon-upload-warning"
            >
              {iconWarning}
            </Typography>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={handleClose} disabled={submitting}>
            {t(BrightChatStrings.Create_Server_Cancel)}
          </Button>
          <Button type="submit" variant="contained" disabled={submitting}>
            {submitting
              ? t(BrightChatStrings.Create_Server_Creating)
              : t(BrightChatStrings.Create_Server_Submit)}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
};

export default memo(CreateServerDialog);
