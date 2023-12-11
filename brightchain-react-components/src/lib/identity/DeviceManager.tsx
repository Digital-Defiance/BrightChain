/**
 * DeviceManager — Device listing, provisioning, revocation, and renaming.
 *
 * Requirements: 9.8
 */

import {
  Alert,
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  Paper,
  TextField,
  Typography,
} from '@mui/material';
import { FC, useState } from 'react';

// ─── Types ──────────────────────────────────────────────────────────────────

interface DeviceInfo {
  id: string;
  deviceName: string;
  deviceType: string;
  publicKeyHex: string;
  provisionedAt: string;
  revokedAt?: string;
}

interface DeviceManagerProps {
  /** List of devices for the current member */
  devices: DeviceInfo[];
  /** Called when a new device should be provisioned */
  onProvision: (paperKey: string, deviceName: string) => Promise<void>;
  /** Called when a device should be revoked */
  onRevoke: (deviceId: string) => Promise<void>;
  /** Called when a device should be renamed */
  onRename: (deviceId: string, newName: string) => Promise<void>;
  /** Whether a provisioning operation is in progress */
  loading?: boolean;
}

// ─── Component ──────────────────────────────────────────────────────────────

export const DeviceManager: FC<DeviceManagerProps> = ({
  devices,
  onProvision,
  onRevoke,
  onRename,
  loading = false,
}) => {
  const [showProvision, setShowProvision] = useState(false);
  const [provisionKey, setProvisionKey] = useState('');
  const [provisionName, setProvisionName] = useState('');
  const [renameId, setRenameId] = useState<string | null>(null);
  const [renameName, setRenameName] = useState('');
  const [error, setError] = useState('');

  const activeDevices = devices.filter((d) => !d.revokedAt);
  const revokedDevices = devices.filter((d) => d.revokedAt);

  const handleProvision = async () => {
    setError('');
    try {
      await onProvision(provisionKey, provisionName);
      setShowProvision(false);
      setProvisionKey('');
      setProvisionName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Provisioning failed');
    }
  };

  const handleRename = async () => {
    if (!renameId) return;
    setError('');
    try {
      await onRename(renameId, renameName);
      setRenameId(null);
      setRenameName('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Rename failed');
    }
  };

  return (
    <Paper sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h5">Devices</Typography>
        <Button
          variant="contained"
          onClick={() => setShowProvision(true)}
          disabled={loading}
        >
          Add Device
        </Button>
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Active Devices */}
      <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 1 }}>
        Active ({activeDevices.length})
      </Typography>
      <List>
        {activeDevices.map((device) => (
          <ListItem key={device.id} divider>
            <ListItemText
              primary={device.deviceName}
              secondary={`${device.deviceType} — provisioned ${new Date(device.provisionedAt).toLocaleDateString()}`}
            />
            <ListItemSecondaryAction>
              <IconButton
                aria-label={`Rename ${device.deviceName}`}
                onClick={() => {
                  setRenameId(device.id);
                  setRenameName(device.deviceName);
                }}
                size="small"
                sx={{ mr: 1 }}
              >
                ✏️
              </IconButton>
              <Button
                size="small"
                color="error"
                onClick={() => onRevoke(device.id)}
                disabled={loading}
              >
                Revoke
              </Button>
            </ListItemSecondaryAction>
          </ListItem>
        ))}
        {activeDevices.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
            No active devices. Add one to get started.
          </Typography>
        )}
      </List>

      {/* Revoked Devices */}
      {revokedDevices.length > 0 && (
        <>
          <Typography
            variant="subtitle2"
            color="text.secondary"
            sx={{ mt: 2, mb: 1 }}
          >
            Revoked ({revokedDevices.length})
          </Typography>
          <List>
            {revokedDevices.map((device) => (
              <ListItem key={device.id} divider sx={{ opacity: 0.5 }}>
                <ListItemText
                  primary={device.deviceName}
                  secondary={`Revoked ${new Date(device.revokedAt!).toLocaleDateString()}`}
                />
                <Chip label="Revoked" size="small" color="error" />
              </ListItem>
            ))}
          </List>
        </>
      )}

      {/* Provision Dialog */}
      <Dialog
        open={showProvision}
        onClose={() => setShowProvision(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Provision New Device</DialogTitle>
        <DialogContent>
          <TextField
            label="Paper Key"
            value={provisionKey}
            onChange={(e) => setProvisionKey(e.target.value)}
            fullWidth
            multiline
            rows={2}
            sx={{ mt: 1, mb: 2 }}
            autoComplete="off"
            inputProps={{ 'aria-label': 'Enter paper key' }}
          />
          <TextField
            label="Device Name"
            value={provisionName}
            onChange={(e) => setProvisionName(e.target.value)}
            fullWidth
            placeholder="e.g., MacBook Pro, iPhone 15"
            inputProps={{ 'aria-label': 'Enter device name' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowProvision(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleProvision}
            disabled={!provisionKey || !provisionName || loading}
          >
            Provision
          </Button>
        </DialogActions>
      </Dialog>

      {/* Rename Dialog */}
      <Dialog
        open={renameId !== null}
        onClose={() => setRenameId(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>Rename Device</DialogTitle>
        <DialogContent>
          <TextField
            label="New Name"
            value={renameName}
            onChange={(e) => setRenameName(e.target.value)}
            fullWidth
            sx={{ mt: 1 }}
            inputProps={{ 'aria-label': 'Enter new device name' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRenameId(null)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleRename}
            disabled={!renameName || loading}
          >
            Rename
          </Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};
