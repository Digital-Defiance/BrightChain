/**
 * ProviderLifecycleActions — pause/resume and disconnect functionality for
 * canary provider connections.
 *
 * - Pause/resume: stops heartbeat checks, excludes from aggregation, preserves credentials
 * - Disconnect: deletes credentials, removes from all multi-canary bindings, archives status history
 * - Shows disconnect warning when provider is part of multi-canary binding
 * - Shows below-minimum warning when disconnect would reduce binding to <2 providers
 *
 * Requirements: 16.2, 16.3, 16.4, 16.5, 16.6
 */
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import PlayCircleOutlineIcon from '@mui/icons-material/PlayCircleOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  List,
  ListItem,
  ListItemText,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IProviderLifecycleBinding {
  id: string;
  name: string;
  providerCount: number;
}

export interface IProviderLifecycleConnection {
  id: string;
  providerId: string;
  providerDisplayName?: string;
  isPaused: boolean;
}

export interface IDisconnectImpactReport {
  affectedBindings: IProviderLifecycleBinding[];
  bindingsReducedBelowMinimum: IProviderLifecycleBinding[];
  bindingsStillValid: IProviderLifecycleBinding[];
}

export interface IProviderLifecycleActionsProps {
  /** The provider connection to manage */
  connection: IProviderLifecycleConnection;
  /** Called to pause the provider (stops heartbeat, excludes from aggregation, preserves credentials) */
  onPause: (connectionId: string) => Promise<void>;
  /** Called to resume a paused provider */
  onResume: (connectionId: string) => Promise<void>;
  /** Called to get the disconnect impact report before confirming */
  onGetDisconnectImpact: (connectionId: string) => Promise<IDisconnectImpactReport>;
  /** Called to permanently disconnect the provider */
  onDisconnect: (connectionId: string) => Promise<void>;
  /** Optional: compact layout for embedding in cards */
  compact?: boolean;
}

// ---------------------------------------------------------------------------
// Pure functions (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Determine if a disconnect warning should be shown.
 * Returns true if the provider is part of any multi-canary binding.
 *
 * Validates: Requirements 16.5
 */
export function shouldShowDisconnectWarning(
  impact: IDisconnectImpactReport,
): boolean {
  return impact.affectedBindings.length > 0;
}

/**
 * Determine if a below-minimum warning should be shown.
 * Returns true if disconnecting would reduce any binding to <2 providers.
 *
 * Validates: Requirements 16.6
 */
export function shouldShowBelowMinimumWarning(
  impact: IDisconnectImpactReport,
): boolean {
  return impact.bindingsReducedBelowMinimum.length > 0;
}

// ---------------------------------------------------------------------------
// ProviderLifecycleActions
// ---------------------------------------------------------------------------

/**
 * Provider lifecycle management: pause/resume and disconnect with warnings.
 * Requirements: 16.2, 16.3, 16.4, 16.5, 16.6
 */
export function ProviderLifecycleActions({
  connection,
  onPause,
  onResume,
  onGetDisconnectImpact,
  onDisconnect,
  compact = false,
}: IProviderLifecycleActionsProps) {
  const [pauseLoading, setPauseLoading] = useState(false);
  const [disconnectDialogOpen, setDisconnectDialogOpen] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);
  const [impactReport, setImpactReport] = useState<IDisconnectImpactReport | null>(null);
  const [impactLoading, setImpactLoading] = useState(false);
  const [error, setError] = useState('');

  const displayName = connection.providerDisplayName ?? connection.providerId;

  // ── Pause / Resume ──────────────────────────────────────────────────────

  const handlePauseResume = useCallback(async () => {
    setPauseLoading(true);
    setError('');
    try {
      if (connection.isPaused) {
        await onResume(connection.id);
      } else {
        await onPause(connection.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update provider state');
    } finally {
      setPauseLoading(false);
    }
  }, [connection.id, connection.isPaused, onPause, onResume]);

  // ── Disconnect ──────────────────────────────────────────────────────────

  const handleDisconnectClick = useCallback(async () => {
    setImpactLoading(true);
    setError('');
    try {
      const report = await onGetDisconnectImpact(connection.id);
      setImpactReport(report);
      setDisconnectDialogOpen(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to check disconnect impact');
    } finally {
      setImpactLoading(false);
    }
  }, [connection.id, onGetDisconnectImpact]);

  const handleDisconnectConfirm = useCallback(async () => {
    setDisconnectLoading(true);
    setError('');
    try {
      await onDisconnect(connection.id);
      setDisconnectDialogOpen(false);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to disconnect provider');
    } finally {
      setDisconnectLoading(false);
    }
  }, [connection.id, onDisconnect]);

  const handleDisconnectCancel = useCallback(() => {
    setDisconnectDialogOpen(false);
    setImpactReport(null);
  }, []);

  // ── Render ──────────────────────────────────────────────────────────────

  const showDisconnectWarning = impactReport ? shouldShowDisconnectWarning(impactReport) : false;
  const showBelowMinimumWarning = impactReport ? shouldShowBelowMinimumWarning(impactReport) : false;

  return (
    <Box data-testid="provider-lifecycle-actions">
      {error && (
        <Alert severity="error" sx={{ mb: 1 }} data-testid="lifecycle-error">
          {error}
        </Alert>
      )}

      <Box
        sx={{
          display: 'flex',
          gap: compact ? 0.5 : 1,
          flexWrap: 'wrap',
          alignItems: 'center',
        }}
      >
        {/* Pause / Resume button */}
        <Button
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          color={connection.isPaused ? 'primary' : 'warning'}
          onClick={handlePauseResume}
          disabled={pauseLoading}
          startIcon={
            pauseLoading ? (
              <CircularProgress size={16} />
            ) : connection.isPaused ? (
              <PlayCircleOutlineIcon />
            ) : (
              <PauseCircleOutlineIcon />
            )
          }
          data-testid={connection.isPaused ? 'resume-button' : 'pause-button'}
          aria-label={connection.isPaused ? `Resume ${displayName}` : `Pause ${displayName}`}
        >
          {connection.isPaused ? 'Resume' : 'Pause'}
        </Button>

        {/* Disconnect button */}
        <Button
          size={compact ? 'small' : 'medium'}
          variant="outlined"
          color="error"
          onClick={handleDisconnectClick}
          disabled={impactLoading || disconnectLoading}
          startIcon={
            impactLoading ? (
              <CircularProgress size={16} />
            ) : (
              <DeleteForeverIcon />
            )
          }
          data-testid="disconnect-button"
          aria-label={`Disconnect ${displayName}`}
        >
          Disconnect
        </Button>
      </Box>

      {/* Disconnect confirmation dialog */}
      <Dialog
        open={disconnectDialogOpen}
        onClose={handleDisconnectCancel}
        maxWidth="sm"
        fullWidth
        data-testid="disconnect-dialog"
        aria-labelledby="disconnect-dialog-title"
      >
        <DialogTitle id="disconnect-dialog-title">
          Disconnect {displayName}?
        </DialogTitle>
        <DialogContent>
          <DialogContentText sx={{ mb: 2 }}>
            This will permanently remove the provider connection. All stored
            credentials will be deleted and status history will be archived.
          </DialogContentText>

          {/* Warning: provider is part of multi-canary binding (Req 16.5) */}
          {showDisconnectWarning && impactReport && (
            <Alert
              severity="warning"
              icon={<WarningAmberIcon />}
              sx={{ mb: 2 }}
              data-testid="disconnect-binding-warning"
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                This provider is part of {impactReport.affectedBindings.length}{' '}
                multi-canary binding{impactReport.affectedBindings.length !== 1 ? 's' : ''}.
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Disconnecting will remove it from all bindings, reducing their redundancy.
              </Typography>
              <List dense disablePadding sx={{ mt: 0.5 }}>
                {impactReport.affectedBindings.map((binding) => (
                  <ListItem key={binding.id} disablePadding sx={{ pl: 1 }}>
                    <ListItemText
                      primary={binding.name}
                      secondary={`${binding.providerCount} providers currently`}
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}

          {/* Warning: binding would fall below minimum (Req 16.6) */}
          {showBelowMinimumWarning && impactReport && (
            <Alert
              severity="error"
              icon={<WarningAmberIcon />}
              sx={{ mb: 2 }}
              data-testid="below-minimum-warning"
            >
              <Typography variant="body2" sx={{ fontWeight: 600, mb: 0.5 }}>
                Multi-canary redundancy will be lost!
              </Typography>
              <Typography variant="body2" color="text.secondary">
                The following binding{impactReport.bindingsReducedBelowMinimum.length !== 1 ? 's' : ''}{' '}
                will be reduced to fewer than 2 providers and will revert to single-provider mode:
              </Typography>
              <List dense disablePadding sx={{ mt: 0.5 }}>
                {impactReport.bindingsReducedBelowMinimum.map((binding) => (
                  <ListItem key={binding.id} disablePadding sx={{ pl: 1 }}>
                    <ListItemText
                      primary={binding.name}
                      secondary={`Will have ${binding.providerCount - 1} provider${binding.providerCount - 1 !== 1 ? 's' : ''} remaining`}
                      primaryTypographyProps={{ variant: 'caption', fontWeight: 600 }}
                      secondaryTypographyProps={{ variant: 'caption' }}
                    />
                  </ListItem>
                ))}
              </List>
            </Alert>
          )}
        </DialogContent>
        <DialogActions>
          <Button
            onClick={handleDisconnectCancel}
            data-testid="disconnect-cancel-button"
          >
            Cancel
          </Button>
          <Button
            onClick={handleDisconnectConfirm}
            color="error"
            variant="contained"
            disabled={disconnectLoading}
            startIcon={disconnectLoading ? <CircularProgress size={16} /> : <DeleteForeverIcon />}
            data-testid="disconnect-confirm-button"
          >
            {disconnectLoading ? 'Disconnecting…' : 'Disconnect'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ProviderLifecycleActions;
