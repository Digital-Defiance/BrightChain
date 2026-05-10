/**
 * CanaryContextMenu — right-click context menu integration for attaching canary
 * providers to vaults, files, and folders directly from the file browser.
 *
 * Critical UX constraint: NO manual ID entry anywhere. All providers are
 * selected from visual lists. All configuration uses dropdowns and sliders.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
import { HeartbeatSignalType } from '@brightchain/digitalburnbag-lib';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import EditIcon from '@mui/icons-material/Edit';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import {
  Alert,
  Badge,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  InputLabel,
  ListItemIcon,
  ListItemText,
  Menu,
  MenuItem,
  Paper,
  Popover,
  Select,
  Slider,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import type { IApiProviderConnectionDTO } from '../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ICanaryBinding {
  id: string;
  providerId: string;
  providerDisplayName: string;
  condition: 'ABSENCE' | 'DURESS';
  action: string;
  absenceThresholdHours: number;
}

export interface ICanaryContextMenuTarget {
  id: string;
  name: string;
  type: 'vault' | 'file' | 'folder';
}

export interface ICanaryContextMenuProps {
  /** The target item that was right-clicked */
  target: ICanaryContextMenuTarget;
  /** Anchor element for the context menu */
  anchorEl: HTMLElement | null;
  /** Whether the menu is open */
  open: boolean;
  /** Close the menu */
  onClose: () => void;
  /** All connected provider connections */
  connections: IApiProviderConnectionDTO[];
  /** Existing canary bindings for this target */
  existingBindings: ICanaryBinding[];
  /** Called when user creates a new binding */
  onCreateBinding: (params: {
    targetId: string;
    targetType: string;
    providerConnectionId: string;
    condition: 'ABSENCE' | 'DURESS';
    action: string;
    absenceThresholdHours: number;
  }) => Promise<void>;
  /** Called when user removes a binding */
  onRemoveBinding: (bindingId: string) => Promise<void>;
  /** Called when user wants to open the full MultiCanaryBindingPanel */
  onOpenMultiCanarySetup: (target: ICanaryContextMenuTarget) => void;
  /** Called when user wants to navigate to the Provider Marketplace */
  onNavigateToMarketplace: () => void;
}

// ---------------------------------------------------------------------------
// Pure functions (exported for property testing)
// ---------------------------------------------------------------------------

/**
 * Compute the binding count badge value for a context menu target.
 * For any target with N bindings (N ≥ 0), returns exactly N.
 *
 * Property 21: Context menu binding count badge accuracy
 * Validates: Requirements 13.5, 13.6
 */
export function getBindingCountBadge(bindings: ICanaryBinding[]): number {
  return bindings.length;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalToColor(sig?: string): string {
  switch (sig) {
    case 'presence': return '#4caf50';
    case 'absence': return '#ff9800';
    case HeartbeatSignalType.CHECK_FAILED:
    case 'check_failed':
    case 'error': return '#f44336';
    case 'duress': return '#9c27b0';
    default: return '#9e9e9e';
  }
}

function groupByCategory(connections: IApiProviderConnectionDTO[]): Map<string, IApiProviderConnectionDTO[]> {
  const groups = new Map<string, IApiProviderConnectionDTO[]>();
  for (const c of connections) {
    const cat = c.providerId.split('-')[0] ?? 'other';
    groups.set(cat, [...(groups.get(cat) ?? []), c]);
  }
  return groups;
}

// ---------------------------------------------------------------------------
// BindingConfigPopover — compact binding configuration panel
// ---------------------------------------------------------------------------

interface IBindingConfigPopoverProps {
  anchorEl: HTMLElement | null;
  open: boolean;
  onClose: () => void;
  connection: IApiProviderConnectionDTO;
  onAttach: (params: { condition: 'ABSENCE' | 'DURESS'; action: string; absenceThresholdHours: number }) => Promise<void>;
  onAddMoreProviders: () => void;
}

function BindingConfigPopover({ anchorEl, open, onClose, connection, onAttach, onAddMoreProviders }: IBindingConfigPopoverProps) {
  const [condition, setCondition] = useState<'ABSENCE' | 'DURESS'>('ABSENCE');
  const [action, setAction] = useState('notify');
  const [thresholdHours, setThresholdHours] = useState(24);
  const [isAttaching, setIsAttaching] = useState(false);
  const [error, setError] = useState('');

  const handleAttach = async () => {
    setError('');
    setIsAttaching(true);
    try {
      await onAttach({ condition, action, absenceThresholdHours: thresholdHours });
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to attach canary');
    } finally {
      setIsAttaching(false);
    }
  };

  return (
    <Popover
      open={open}
      anchorEl={anchorEl}
      onClose={onClose}
      anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
      transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      data-testid="binding-config-popover"
    >
      <Paper sx={{ p: 2, width: 300 }}>
        <Typography variant="subtitle2" gutterBottom>
          Configure Canary — {connection.providerDisplayName ?? connection.providerId}
        </Typography>

        {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}

        {/* Condition dropdown — no text input */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Condition</InputLabel>
          <Select
            value={condition}
            label="Condition"
            onChange={e => setCondition(e.target.value as 'ABSENCE' | 'DURESS')}
            data-testid="condition-dropdown"
          >
            <MenuItem value="ABSENCE">Absence — trigger when no activity detected</MenuItem>
            <MenuItem value="DURESS">Duress — trigger on duress code login</MenuItem>
          </Select>
        </FormControl>

        {/* Protocol action dropdown — no text input */}
        <FormControl fullWidth size="small" sx={{ mb: 2 }}>
          <InputLabel>Protocol Action</InputLabel>
          <Select
            value={action}
            label="Protocol Action"
            onChange={e => setAction(e.target.value)}
            data-testid="action-dropdown"
          >
            <MenuItem value="notify">Notify recipients</MenuItem>
            <MenuItem value="destroy">Destroy vault contents</MenuItem>
            <MenuItem value="release">Release to public</MenuItem>
            <MenuItem value="lock">Lock vault</MenuItem>
          </Select>
        </FormControl>

        {/* Absence threshold — visual slider, not numeric input */}
        {condition === 'ABSENCE' && (
          <Box sx={{ mb: 2 }}>
            <Typography variant="caption" color="text.secondary">
              Absence threshold: {thresholdHours}h
            </Typography>
            <Slider
              value={thresholdHours}
              onChange={(_, v) => setThresholdHours(v as number)}
              min={1}
              max={168}
              step={1}
              marks={[{ value: 24, label: '24h' }, { value: 72, label: '72h' }, { value: 168, label: '7d' }]}
              size="small"
              data-testid="threshold-slider"
            />
          </Box>
        )}

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button size="small" variant="outlined" onClick={onAddMoreProviders} startIcon={<AddIcon />} data-testid="add-more-providers-button">
            Add more providers
          </Button>
          <Button size="small" variant="contained" onClick={handleAttach} disabled={isAttaching} data-testid="attach-button">
            Attach
          </Button>
          <Button size="small" onClick={onClose}>Cancel</Button>
        </Box>
      </Paper>
    </Popover>
  );
}

// ---------------------------------------------------------------------------
// ManageCanariesPanel — shows existing bindings with edit/remove
// ---------------------------------------------------------------------------

interface IManageCanariesPanelProps {
  bindings: ICanaryBinding[];
  onRemove: (bindingId: string) => Promise<void>;
  onClose: () => void;
}

function ManageCanariesPanel({ bindings, onRemove, onClose }: IManageCanariesPanelProps) {
  const [removing, setRemoving] = useState<string | null>(null);

  const handleRemove = async (id: string) => {
    setRemoving(id);
    try { await onRemove(id); } finally { setRemoving(null); }
  };

  return (
    <Box sx={{ p: 2, minWidth: 280 }} data-testid="manage-canaries-panel">
      <Typography variant="subtitle2" gutterBottom>Manage Canaries</Typography>
      {bindings.map(b => (
        <Box key={b.id} sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <Box sx={{ flex: 1 }}>
            <Typography variant="body2" sx={{ fontWeight: 600 }}>{b.providerDisplayName}</Typography>
            <Typography variant="caption" color="text.secondary">{b.condition} → {b.action}</Typography>
          </Box>
          <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleRemove(b.id)} disabled={removing === b.id} data-testid={`remove-binding-${b.id}`}>
            Remove
          </Button>
        </Box>
      ))}
      <Button size="small" onClick={onClose} sx={{ mt: 1 }}>Close</Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// CanaryContextMenu
// ---------------------------------------------------------------------------

/**
 * Right-click context menu for attaching canary providers to vaults, files, and folders.
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.6, 13.7
 */
export function CanaryContextMenu({
  target,
  anchorEl,
  open,
  onClose,
  connections,
  existingBindings,
  onCreateBinding,
  onRemoveBinding,
  onOpenMultiCanarySetup,
  onNavigateToMarketplace,
}: ICanaryContextMenuProps) {
  const [subMenuAnchor, setSubMenuAnchor] = useState<HTMLElement | null>(null);
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  const [selectedConnection, setSelectedConnection] = useState<IApiProviderConnectionDTO | null>(null);
  const [showManage, setShowManage] = useState(false);
  const [manageAnchor, setManageAnchor] = useState<HTMLElement | null>(null);

  const connectedConnections = useMemo(
    () => connections.filter(c => c.status === 'connected' || c.status === 'active'),
    [connections],
  );

  const groupedConnections = useMemo(() => groupByCategory(connectedConnections), [connectedConnections]);

  const bindingCount = existingBindings.length;

  const handleAttachCanaryClick = useCallback((event: React.MouseEvent<HTMLElement>) => {
    if (connectedConnections.length === 0) return;
    setSubMenuAnchor(event.currentTarget);
  }, [connectedConnections.length]);

  const handleProviderSelect = useCallback((event: React.MouseEvent<HTMLElement>, connection: IApiProviderConnectionDTO) => {
    setSelectedConnection(connection);
    setPopoverAnchor(event.currentTarget);
    setSubMenuAnchor(null);
  }, []);

  const handleAttach = useCallback(async (params: { condition: 'ABSENCE' | 'DURESS'; action: string; absenceThresholdHours: number }) => {
    if (!selectedConnection) return;
    await onCreateBinding({
      targetId: target.id,
      targetType: target.type,
      providerConnectionId: selectedConnection.id,
      ...params,
    });
    setPopoverAnchor(null);
    setSelectedConnection(null);
    onClose();
  }, [selectedConnection, target, onCreateBinding, onClose]);

  const handleMultiCanarySetup = useCallback(() => {
    onClose();
    onOpenMultiCanarySetup(target);
  }, [onClose, onOpenMultiCanarySetup, target]);

  const handleManageCanaries = useCallback((event: React.MouseEvent<HTMLElement>) => {
    setManageAnchor(event.currentTarget);
    setShowManage(true);
    onClose();
  }, [onClose]);

  return (
    <>
      {/* Main context menu */}
      <Menu
        anchorEl={anchorEl}
        open={open}
        onClose={onClose}
        data-testid="canary-context-menu"
      >
        {/* "Attach Canary" with count badge */}
        <MenuItem
          onClick={connectedConnections.length === 0 ? undefined : handleAttachCanaryClick}
          data-testid="attach-canary-menu-item"
          disabled={connectedConnections.length === 0}
        >
          <ListItemIcon>
            <Badge badgeContent={bindingCount > 0 ? bindingCount : undefined} color="primary" data-testid="binding-count-badge">
              <NotificationsActiveIcon fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                Attach Canary
                {bindingCount > 0 && (
                  <Chip label={bindingCount} size="small" color="primary" sx={{ height: 18, fontSize: '0.65rem' }} data-testid="binding-count-chip" />
                )}
              </Box>
            }
          />
        </MenuItem>

        {/* "Connect a Provider First" when no providers connected */}
        {connectedConnections.length === 0 && (
          <MenuItem onClick={() => { onClose(); onNavigateToMarketplace(); }} data-testid="connect-provider-first-item">
            <ListItemIcon><OpenInNewIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Connect a Provider First" secondary="Open Provider Marketplace" />
          </MenuItem>
        )}

        {/* "Multi-Canary Setup" */}
        {connectedConnections.length >= 2 && (
          <MenuItem onClick={handleMultiCanarySetup} data-testid="multi-canary-setup-item">
            <ListItemIcon><AddIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Multi-Canary Setup" secondary="Configure redundancy with multiple providers" />
          </MenuItem>
        )}

        {/* "Manage Canaries" when bindings exist */}
        {bindingCount > 0 && (
          <>
            <Divider />
            <MenuItem onClick={handleManageCanaries} data-testid="manage-canaries-item">
              <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
              <ListItemText primary="Manage Canaries" secondary={`${bindingCount} binding${bindingCount !== 1 ? 's' : ''} attached`} />
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Provider submenu — grouped by category, visual list */}
      <Menu
        anchorEl={subMenuAnchor}
        open={Boolean(subMenuAnchor)}
        onClose={() => setSubMenuAnchor(null)}
        data-testid="provider-submenu"
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.5, display: 'block' }}>
          Select a provider
        </Typography>
        {Array.from(groupedConnections.entries()).map(([category, conns]) => (
          <Box key={category}>
            <Typography variant="caption" color="text.secondary" sx={{ px: 2, py: 0.25, display: 'block', textTransform: 'uppercase', fontSize: '0.6rem', letterSpacing: 1 }}>
              {category}
            </Typography>
            {conns.map(conn => (
              <MenuItem
                key={conn.id}
                onClick={e => handleProviderSelect(e, conn)}
                data-testid={`provider-submenu-item-${conn.id}`}
              >
                <ListItemIcon>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: signalToColor(conn.lastCheckResult ?? conn.status) }} />
                </ListItemIcon>
                <ListItemText
                  primary={conn.providerDisplayName ?? conn.providerUsername ?? conn.providerId}
                  secondary={conn.status}
                />
              </MenuItem>
            ))}
          </Box>
        ))}
      </Menu>

      {/* Binding config popover */}
      {selectedConnection && (
        <BindingConfigPopover
          anchorEl={popoverAnchor}
          open={Boolean(popoverAnchor)}
          onClose={() => { setPopoverAnchor(null); setSelectedConnection(null); }}
          connection={selectedConnection}
          onAttach={handleAttach}
          onAddMoreProviders={() => { setPopoverAnchor(null); setSelectedConnection(null); handleMultiCanarySetup(); }}
        />
      )}

      {/* Manage canaries popover */}
      <Popover
        open={showManage}
        anchorEl={manageAnchor}
        onClose={() => setShowManage(false)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
        data-testid="manage-canaries-popover"
      >
        <ManageCanariesPanel
          bindings={existingBindings}
          onRemove={onRemoveBinding}
          onClose={() => setShowManage(false)}
        />
      </Popover>
    </>
  );
}

export default CanaryContextMenu;
