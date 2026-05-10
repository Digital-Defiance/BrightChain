/**
 * MultiCanaryBindingPanel — full configuration panel for multi-canary redundancy bindings.
 *
 * All provider selection uses checkboxes (visual, not ID-based).
 * All configuration uses dropdowns, sliders, and buttons — no manual ID entry.
 *
 * Requirements: 9.1, 9.2, 9.5, 9.6
 */
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import {
  Alert,
  Box,
  Button,
  Checkbox,
  Chip,
  Divider,
  FormControl,
  FormControlLabel,
  FormGroup,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  Slider,
  Typography,
} from '@mui/material';
import { useCallback, useMemo, useState } from 'react';
import type { IApiProviderConnectionDTO } from '../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RedundancyPolicy = 'all_must_fail' | 'majority_must_fail' | 'any_fails' | 'weighted_consensus';

export interface IMultiCanaryBinding {
  id: string;
  name: string;
  providerConnectionIds: string[];
  redundancyPolicy: RedundancyPolicy;
  providerWeights?: Record<string, number>;
  weightedThresholdPercent?: number;
  protocolAction: string;
  canaryCondition: 'ABSENCE' | 'DURESS';
  absenceThresholdHours: number;
  aggregateStatus?: string;
  providerSignals?: Record<string, string>;
}

export interface IMultiCanaryTarget {
  id: string;
  name: string;
  type: 'vault' | 'file' | 'folder';
}

export interface IMultiCanaryBindingPanelProps {
  /** All connected provider connections */
  connections: IApiProviderConnectionDTO[];
  /** Available targets (vaults, files, folders) for visual selection */
  availableTargets: IMultiCanaryTarget[];
  /** Existing multi-canary bindings to display */
  existingBindings: IMultiCanaryBinding[];
  /** Called when user creates a new binding */
  onCreateBinding: (params: {
    name: string;
    providerConnectionIds: string[];
    targetIds: string[];
    redundancyPolicy: RedundancyPolicy;
    providerWeights?: Record<string, number>;
    weightedThresholdPercent?: number;
    protocolAction: string;
    canaryCondition: 'ABSENCE' | 'DURESS';
    absenceThresholdHours: number;
  }) => Promise<void>;
  /** Called when user deletes a binding */
  onDeleteBinding: (bindingId: string) => Promise<void>;
}

// ---------------------------------------------------------------------------
// Pure exported functions (for property-based testing)
// ---------------------------------------------------------------------------

/**
 * Display info extracted from a multi-canary binding.
 * Used by Property 20: Multi-canary binding display completeness.
 */
export interface IBindingDisplayInfo {
  /** Target names (not IDs) — human-readable */
  targetNames: string[];
  /** Number of bound providers */
  providerCount: number;
  /** Current aggregate status */
  aggregateStatus: string;
  /** Per-provider signal indicators: provider display name → signal */
  perProviderSignals: Array<{ name: string; signal: string }>;
}

/**
 * Extract display info from a binding for rendering.
 * Resolves provider connection IDs to display names and maps signals.
 *
 * Property 20: Multi-canary binding display completeness
 * Validates: Requirements 9.6, 14.4
 */
export function getBindingDisplayInfo(
  binding: IMultiCanaryBinding,
  connections: IApiProviderConnectionDTO[],
  targets: IMultiCanaryTarget[],
  /** Optional: IDs of targets bound to this binding (if not embedded in binding) */
  boundTargetIds?: string[],
): IBindingDisplayInfo {
  // Resolve target IDs to names
  const targetIds = boundTargetIds ?? [];
  const targetNames = targetIds
    .map(id => targets.find(t => t.id === id)?.name)
    .filter((name): name is string => name !== undefined);

  // If no target IDs provided but targets exist, use all target names as fallback
  // (in real usage, the binding would carry its own target references)
  const resolvedTargetNames = targetNames.length > 0 ? targetNames : [];

  // Provider count
  const providerCount = binding.providerConnectionIds.length;

  // Aggregate status
  const aggregateStatus = binding.aggregateStatus ?? 'unknown';

  // Per-provider signals
  const perProviderSignals: Array<{ name: string; signal: string }> = binding.providerConnectionIds.map(connId => {
    const conn = connections.find(c => c.id === connId);
    const name = conn?.providerDisplayName ?? conn?.providerUsername ?? conn?.providerId ?? connId;
    const signal = binding.providerSignals?.[connId] ?? 'unknown';
    return { name, signal };
  });

  return {
    targetNames: resolvedTargetNames,
    providerCount,
    aggregateStatus,
    perProviderSignals,
  };
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const POLICY_DESCRIPTIONS: Record<RedundancyPolicy, string> = {
  all_must_fail: 'Trigger only when ALL providers report absence',
  majority_must_fail: 'Trigger when more than half report absence',
  any_fails: 'Trigger when any single provider reports absence',
  weighted_consensus: 'Trigger based on weighted provider scores',
};

function signalColor(sig?: string): string {
  switch (sig) {
    case 'presence': return '#4caf50';
    case 'absence': return '#ff9800';
    case 'check_failed': case 'error': return '#f44336';
    case 'duress': return '#9c27b0';
    default: return '#9e9e9e';
  }
}

// ---------------------------------------------------------------------------
// CreateBindingForm
// ---------------------------------------------------------------------------

interface ICreateBindingFormProps {
  connections: IApiProviderConnectionDTO[];
  availableTargets: IMultiCanaryTarget[];
  onSubmit: IMultiCanaryBindingPanelProps['onCreateBinding'];
  onCancel: () => void;
}

function CreateBindingForm({ connections, availableTargets, onSubmit, onCancel }: ICreateBindingFormProps) {
  const [name, setName] = useState('');
  const [selectedConnectionIds, setSelectedConnectionIds] = useState<string[]>([]);
  const [selectedTargetIds, setSelectedTargetIds] = useState<string[]>([]);
  const [policy, setPolicy] = useState<RedundancyPolicy>('all_must_fail');
  const [weights, setWeights] = useState<Record<string, number>>({});
  const [threshold, setThreshold] = useState(75);
  const [action, setAction] = useState('notify');
  const [condition, setCondition] = useState<'ABSENCE' | 'DURESS'>('ABSENCE');
  const [absenceHours, setAbsenceHours] = useState(24);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const connectedConnections = useMemo(
    () => connections.filter(c => c.status === 'connected' || c.status === 'active'),
    [connections],
  );

  const toggleConnection = (id: string) => {
    setSelectedConnectionIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
    if (!weights[id]) setWeights(prev => ({ ...prev, [id]: 1.0 }));
  };

  const toggleTarget = (id: string) => {
    setSelectedTargetIds(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id],
    );
  };

  const handleSubmit = async () => {
    setError('');
    if (selectedConnectionIds.length < 2) { setError('Select at least 2 providers'); return; }
    if (selectedConnectionIds.length > 20) { setError('Maximum 20 providers allowed'); return; }
    if (selectedTargetIds.length === 0) { setError('Select at least one target'); return; }
    if (!name.trim()) { setError('Enter a name for this binding'); return; }

    setIsSubmitting(true);
    try {
      await onSubmit({
        name: name.trim(),
        providerConnectionIds: selectedConnectionIds,
        targetIds: selectedTargetIds,
        redundancyPolicy: policy,
        providerWeights: policy === 'weighted_consensus' ? weights : undefined,
        weightedThresholdPercent: policy === 'weighted_consensus' ? threshold : undefined,
        protocolAction: action,
        canaryCondition: condition,
        absenceThresholdHours: absenceHours,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to create binding');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box data-testid="create-binding-form">
      <Typography variant="subtitle2" gutterBottom>New Multi-Canary Binding</Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* Name */}
      <Box sx={{ mb: 2 }}>
        <Typography variant="caption" color="text.secondary">Binding name</Typography>
        <Box
          component="input"
          value={name}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setName(e.target.value)}
          placeholder="e.g. Primary vault protection"
          data-testid="binding-name-input"
          sx={{ display: 'block', width: '100%', mt: 0.5, p: 1, border: '1px solid', borderColor: 'divider', borderRadius: 1, fontSize: '0.875rem', fontFamily: 'inherit', '&:focus': { outline: '2px solid', outlineColor: 'primary.main' } }}
        />
      </Box>

      {/* Provider picker — checkboxes, not ID input */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Select providers ({selectedConnectionIds.length} selected, min 2, max 20)
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 2, maxHeight: 200, overflowY: 'auto' }} data-testid="provider-picker">
        <FormGroup>
          {connectedConnections.map(conn => (
            <FormControlLabel
              key={conn.id}
              control={
                <Checkbox
                  checked={selectedConnectionIds.includes(conn.id)}
                  onChange={() => toggleConnection(conn.id)}
                  size="small"
                  data-testid={`provider-checkbox-${conn.id}`}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: signalColor(conn.lastCheckResult ?? conn.status), flexShrink: 0 }} />
                  <Typography variant="body2">{conn.providerDisplayName ?? conn.providerUsername ?? conn.providerId}</Typography>
                </Box>
              }
            />
          ))}
          {connectedConnections.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No connected providers available.</Typography>
          )}
        </FormGroup>
      </Paper>

      {/* Weight sliders for weighted_consensus */}
      {policy === 'weighted_consensus' && selectedConnectionIds.length > 0 && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Provider weights (0.1–10.0)</Typography>
          {selectedConnectionIds.map(id => {
            const conn = connections.find(c => c.id === id);
            return (
              <Box key={id} sx={{ mb: 1 }}>
                <Typography variant="caption">{conn?.providerDisplayName ?? id}: {(weights[id] ?? 1.0).toFixed(1)}</Typography>
                <Slider
                  value={weights[id] ?? 1.0}
                  onChange={(_, v) => setWeights(prev => ({ ...prev, [id]: v as number }))}
                  min={0.1}
                  max={10.0}
                  step={0.1}
                  size="small"
                  data-testid={`weight-slider-${id}`}
                />
              </Box>
            );
          })}
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>Trigger threshold: {threshold}%</Typography>
          <Slider
            value={threshold}
            onChange={(_, v) => setThreshold(v as number)}
            min={0}
            max={100}
            step={1}
            marks={[{ value: 50, label: '50%' }, { value: 75, label: '75%' }, { value: 100, label: '100%' }]}
            size="small"
            data-testid="threshold-slider"
          />
        </Box>
      )}

      {/* Redundancy policy selector */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Redundancy Policy</InputLabel>
        <Select value={policy} label="Redundancy Policy" onChange={e => setPolicy(e.target.value as RedundancyPolicy)} data-testid="policy-selector">
          {(Object.entries(POLICY_DESCRIPTIONS) as [RedundancyPolicy, string][]).map(([val, desc]) => (
            <MenuItem key={val} value={val}>
              <Box>
                <Typography variant="body2">{val.replace(/_/g, ' ')}</Typography>
                <Typography variant="caption" color="text.secondary">{desc}</Typography>
              </Box>
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {/* Target selector — file/folder browser tree with checkboxes */}
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Select targets ({selectedTargetIds.length} selected)
      </Typography>
      <Paper variant="outlined" sx={{ p: 1, mb: 2, maxHeight: 160, overflowY: 'auto' }} data-testid="target-selector">
        <FormGroup>
          {availableTargets.map(t => (
            <FormControlLabel
              key={t.id}
              control={
                <Checkbox
                  checked={selectedTargetIds.includes(t.id)}
                  onChange={() => toggleTarget(t.id)}
                  size="small"
                  data-testid={`target-checkbox-${t.id}`}
                />
              }
              label={
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <Chip label={t.type} size="small" variant="outlined" sx={{ height: 16, fontSize: '0.6rem' }} />
                  <Typography variant="body2">{t.name}</Typography>
                </Box>
              }
            />
          ))}
          {availableTargets.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 1 }}>No targets available.</Typography>
          )}
        </FormGroup>
      </Paper>

      {/* Protocol action */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Protocol Action</InputLabel>
        <Select value={action} label="Protocol Action" onChange={e => setAction(e.target.value)} data-testid="action-selector">
          <MenuItem value="notify">Notify recipients</MenuItem>
          <MenuItem value="destroy">Destroy vault contents</MenuItem>
          <MenuItem value="release">Release to public</MenuItem>
          <MenuItem value="lock">Lock vault</MenuItem>
        </Select>
      </FormControl>

      {/* Canary condition */}
      <FormControl fullWidth size="small" sx={{ mb: 2 }}>
        <InputLabel>Canary Condition</InputLabel>
        <Select value={condition} label="Canary Condition" onChange={e => setCondition(e.target.value as 'ABSENCE' | 'DURESS')} data-testid="condition-selector">
          <MenuItem value="ABSENCE">Absence</MenuItem>
          <MenuItem value="DURESS">Duress</MenuItem>
        </Select>
      </FormControl>

      {condition === 'ABSENCE' && (
        <Box sx={{ mb: 2 }}>
          <Typography variant="caption" color="text.secondary">Absence threshold: {absenceHours}h</Typography>
          <Slider value={absenceHours} onChange={(_, v) => setAbsenceHours(v as number)} min={1} max={168} step={1} marks={[{ value: 24, label: '24h' }, { value: 72, label: '72h' }, { value: 168, label: '7d' }]} size="small" data-testid="absence-threshold-slider" />
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" size="small" onClick={handleSubmit} disabled={isSubmitting} data-testid="create-binding-submit">
          Create Binding
        </Button>
        <Button size="small" onClick={onCancel}>Cancel</Button>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// MultiCanaryBindingPanel
// ---------------------------------------------------------------------------

/**
 * Full configuration panel for multi-canary redundancy bindings.
 * Requirements: 9.1, 9.2, 9.5, 9.6
 */
export function MultiCanaryBindingPanel({ connections, availableTargets, existingBindings, onCreateBinding, onDeleteBinding }: IMultiCanaryBindingPanelProps) {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const handleDelete = useCallback(async (id: string) => {
    setDeletingId(id);
    try { await onDeleteBinding(id); } finally { setDeletingId(null); }
  }, [onDeleteBinding]);

  return (
    <Box data-testid="multi-canary-binding-panel">
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Multi-Canary Bindings</Typography>
        <Button size="small" variant="contained" startIcon={<AddIcon />} onClick={() => setShowCreateForm(true)} data-testid="new-binding-button">
          New Binding
        </Button>
      </Box>

      {showCreateForm && (
        <Paper variant="outlined" sx={{ p: 2, mb: 2 }}>
          <CreateBindingForm
            connections={connections}
            availableTargets={availableTargets}
            onSubmit={async params => { await onCreateBinding(params); setShowCreateForm(false); }}
            onCancel={() => setShowCreateForm(false)}
          />
        </Paper>
      )}

      {existingBindings.length === 0 && !showCreateForm && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="no-bindings-state">
          <Typography variant="body2" color="text.secondary">No multi-canary bindings configured.</Typography>
          <Typography variant="caption" color="text.secondary">Create a binding to protect vaults with multiple providers.</Typography>
        </Box>
      )}

      {existingBindings.map(binding => (
        <Paper key={binding.id} variant="outlined" sx={{ p: 2, mb: 1.5 }} data-testid={`binding-card-${binding.id}`}>
          <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1 }}>
            <Box sx={{ flex: 1 }}>
              <Typography variant="subtitle2">{binding.name}</Typography>
              <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mt: 0.5 }}>
                <Chip label={binding.redundancyPolicy.replace(/_/g, ' ')} size="small" variant="outlined" />
                <Chip label={`${binding.providerConnectionIds.length} providers`} size="small" color="primary" variant="outlined" />
                {binding.aggregateStatus && (
                  <Chip label={binding.aggregateStatus} size="small" color={binding.aggregateStatus === 'all_present' ? 'success' : binding.aggregateStatus === 'triggered' ? 'error' : 'warning'} />
                )}
              </Box>
              {/* Per-provider signal indicators */}
              {binding.providerSignals && Object.keys(binding.providerSignals).length > 0 && (
                <Box sx={{ display: 'flex', gap: 0.5, mt: 0.5, flexWrap: 'wrap' }}>
                  {Object.entries(binding.providerSignals).map(([connId, sig]) => {
                    const conn = connections.find(c => c.id === connId);
                    return (
                      <Box key={connId} sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
                        <Box sx={{ width: 6, height: 6, borderRadius: '50%', backgroundColor: signalColor(sig) }} />
                        <Typography variant="caption" color="text.secondary">{conn?.providerDisplayName ?? connId}</Typography>
                      </Box>
                    );
                  })}
                </Box>
              )}
            </Box>
            <Button size="small" color="error" startIcon={<DeleteIcon />} onClick={() => handleDelete(binding.id)} disabled={deletingId === binding.id} data-testid={`delete-binding-${binding.id}`}>
              Delete
            </Button>
          </Box>
        </Paper>
      ))}
    </Box>
  );
}
