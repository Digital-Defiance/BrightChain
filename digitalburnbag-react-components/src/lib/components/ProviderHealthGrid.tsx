/**
 * ProviderHealthGrid — real-time visual grid of all connected providers.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import { HeartbeatSignalType, ProviderCategory } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import GridViewIcon from '@mui/icons-material/GridView';
import PauseCircleOutlineIcon from '@mui/icons-material/PauseCircleOutline';
import SortIcon from '@mui/icons-material/Sort';
import ViewListIcon from '@mui/icons-material/ViewList';
import { Box, Chip, FormControl, IconButton, InputLabel, MenuItem, Select, Tooltip, Typography } from '@mui/material';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type SortCriterion = 'name' | 'lastActivity' | 'statusSeverity' | 'category';
export type ViewMode = 'compact' | 'expanded';

export interface IProviderConnectionExtendedForGrid {
  id: string;
  providerId: string;
  providerDisplayName?: string;
  providerUsername?: string;
  status: 'connected' | 'expired' | 'error' | 'paused' | 'pending';
  lastCheckSignalType?: HeartbeatSignalType | string;
  lastCheckedAt?: string;
  lastActivityAt?: string;
  isPaused?: boolean;
  providerConfig?: ICanaryProviderConfig<string>;
  signalHistory?: Array<HeartbeatSignalType | string>;
}

export interface IProviderHealthGridProps {
  connections: IProviderConnectionExtendedForGrid[];
  onStatusUpdate?: (handler: (event: MessageEvent) => void) => () => void;
  initialView?: ViewMode;
}

export interface IHealthPercentages {
  presence: number;
  absence: number;
  checkFailed: number;
  other: number;
}

// ---------------------------------------------------------------------------
// Pure exported functions (for property-based testing)
// ---------------------------------------------------------------------------

export function computeHealthPercentages(connections: Array<{ lastCheckSignalType?: HeartbeatSignalType | string }>): IHealthPercentages {
  const total = connections.length;
  if (total === 0) return { presence: 0, absence: 0, checkFailed: 0, other: 0 };
  let presence = 0, absence = 0, checkFailed = 0, other = 0;
  for (const c of connections) {
    const sig = c.lastCheckSignalType;
    if (sig === HeartbeatSignalType.PRESENCE || sig === 'presence') presence++;
    else if (sig === HeartbeatSignalType.ABSENCE || sig === 'absence') absence++;
    else if (sig === HeartbeatSignalType.CHECK_FAILED || sig === 'check_failed') checkFailed++;
    else other++;
  }
  return { presence: (presence / total) * 100, absence: (absence / total) * 100, checkFailed: (checkFailed / total) * 100, other: (other / total) * 100 };
}

function statusSeverity(sig?: HeartbeatSignalType | string): number {
  switch (sig) {
    case HeartbeatSignalType.CHECK_FAILED: case 'check_failed': return 0;
    case HeartbeatSignalType.ABSENCE: case 'absence': return 1;
    case HeartbeatSignalType.DURESS: case 'duress': return 2;
    case HeartbeatSignalType.PRESENCE: case 'presence': return 3;
    default: return 4;
  }
}

export function sortConnections(connections: IProviderConnectionExtendedForGrid[], criterion: SortCriterion): IProviderConnectionExtendedForGrid[] {
  const copy = [...connections];
  switch (criterion) {
    case 'name':
      copy.sort((a, b) => (a.providerDisplayName ?? a.providerConfig?.name ?? a.providerId).toLowerCase().localeCompare((b.providerDisplayName ?? b.providerConfig?.name ?? b.providerId).toLowerCase()));
      break;
    case 'lastActivity':
      copy.sort((a, b) => {
        const tsA = a.lastActivityAt ?? a.lastCheckedAt ?? '';
        const tsB = b.lastActivityAt ?? b.lastCheckedAt ?? '';
        if (!tsA && !tsB) return 0;
        if (!tsA) return 1;
        if (!tsB) return -1;
        return tsB.localeCompare(tsA);
      });
      break;
    case 'statusSeverity':
      copy.sort((a, b) => statusSeverity(a.lastCheckSignalType) - statusSeverity(b.lastCheckSignalType));
      break;
    case 'category':
      copy.sort((a, b) => (a.providerConfig?.category ?? '').toLowerCase().localeCompare((b.providerConfig?.category ?? '').toLowerCase()));
      break;
  }
  return copy;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalToColor(sig?: HeartbeatSignalType | string): string {
  switch (sig) {
    case HeartbeatSignalType.PRESENCE: case 'presence': return '#4caf50';
    case HeartbeatSignalType.ABSENCE: case 'absence': return '#ff9800';
    case HeartbeatSignalType.CHECK_FAILED: case 'check_failed': return '#f44336';
    case HeartbeatSignalType.DURESS: case 'duress': return '#9c27b0';
    default: return '#9e9e9e';
  }
}

function signalToMuiColor(sig?: HeartbeatSignalType | string): 'success' | 'warning' | 'error' | 'secondary' | 'default' {
  switch (sig) {
    case HeartbeatSignalType.PRESENCE: case 'presence': return 'success';
    case HeartbeatSignalType.ABSENCE: case 'absence': return 'warning';
    case HeartbeatSignalType.CHECK_FAILED: case 'check_failed': return 'error';
    case HeartbeatSignalType.DURESS: case 'duress': return 'secondary';
    default: return 'default';
  }
}

function signalLabel(sig?: HeartbeatSignalType | string): string {
  switch (sig) {
    case HeartbeatSignalType.PRESENCE: case 'presence': return 'Presence';
    case HeartbeatSignalType.ABSENCE: case 'absence': return 'Absence';
    case HeartbeatSignalType.CHECK_FAILED: case 'check_failed': return 'Check Failed';
    case HeartbeatSignalType.DURESS: case 'duress': return 'Duress';
    default: return 'Unknown';
  }
}

function shouldPulse(sig?: HeartbeatSignalType | string): boolean {
  return sig === HeartbeatSignalType.CHECK_FAILED || sig === 'check_failed' || sig === HeartbeatSignalType.ABSENCE || sig === 'absence';
}

function formatTimeSince(isoString?: string): string {
  if (!isoString) return 'Never';
  const diffMs = Date.now() - new Date(isoString).getTime();
  if (diffMs < 0) return 'Just now';
  const s = Math.floor(diffMs / 1000);
  if (s < 60) return `${s}s ago`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// MiniSparkline
// ---------------------------------------------------------------------------

function MiniSparkline({ history, width = 60, height = 20 }: { history: Array<HeartbeatSignalType | string>; width?: number; height?: number }) {
  if (history.length === 0) {
    return <Box component="svg" width={width} height={height} aria-label="No signal history" data-testid="sparkline-empty"><line x1={0} y1={height / 2} x2={width} y2={height / 2} stroke="#e0e0e0" strokeWidth={1} /></Box>;
  }
  const barWidth = Math.max(2, Math.floor(width / history.length) - 1);
  const gap = Math.max(1, Math.floor(width / history.length) - barWidth);
  return (
    <Box component="svg" width={width} height={height} aria-label="Signal history sparkline" data-testid="sparkline">
      {history.map((sig, i) => <rect key={i} x={i * (barWidth + gap)} y={0} width={barWidth} height={height} fill={signalToColor(sig)} opacity={0.8} />)}
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ProviderConnectionCard
// ---------------------------------------------------------------------------

function ProviderConnectionCard({ connection, viewMode, isPulsing }: { connection: IProviderConnectionExtendedForGrid; viewMode: ViewMode; isPulsing: boolean }) {
  const displayName = connection.providerDisplayName ?? connection.providerConfig?.name ?? connection.providerUsername ?? connection.providerId;
  const sig = connection.lastCheckSignalType;
  const isPaused = connection.isPaused === true || connection.status === 'paused';
  const color = isPaused ? '#9e9e9e' : signalToColor(sig);
  const history = connection.signalHistory ?? [];

  // Paused providers: grayed out with pause icon (Req 16.3)
  const pausedStyles = isPaused ? { opacity: 0.5, filter: 'grayscale(80%)' } : {};

  if (viewMode === 'compact') {
    return (
      <Tooltip title={`${displayName} — ${isPaused ? 'Paused' : signalLabel(sig)} — ${formatTimeSince(connection.lastCheckedAt)}`} arrow>
        <Box data-testid={`provider-card-compact-${connection.id}`} sx={{ display: 'flex', alignItems: 'center', gap: 0.5, p: 0.75, borderRadius: 1, border: '1px solid', borderColor: 'divider', ...pausedStyles }} className={isPulsing && !isPaused ? 'provider-status-pulse' : ''}>
          <Box sx={{ width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.875rem', position: 'relative' }}>
            {connection.providerConfig?.icon ? <i className={connection.providerConfig.icon} aria-hidden="true" /> : <Typography variant="caption" sx={{ fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</Typography>}
            {isPaused && <PauseCircleOutlineIcon sx={{ position: 'absolute', bottom: -4, right: -4, fontSize: 12, color: 'text.secondary' }} data-testid={`pause-icon-${connection.id}`} />}
          </Box>
          <Box data-testid={`status-dot-${connection.id}`} sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: color, flexShrink: 0 }} aria-label={`Status: ${isPaused ? 'Paused' : signalLabel(sig)}`} />
        </Box>
      </Tooltip>
    );
  }

  return (
    <Box data-testid={`provider-card-expanded-${connection.id}`} sx={{ p: 1.5, borderRadius: 1, border: '1px solid', borderColor: 'divider', display: 'flex', flexDirection: 'column', gap: 1, ...pausedStyles }} className={isPulsing && !isPaused ? 'provider-status-pulse' : ''}>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
        <Box data-testid={`provider-icon-${connection.id}`} sx={{ width: 32, height: 32, borderRadius: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: `${color}20`, color, fontSize: '1rem', flexShrink: 0, position: 'relative' }}>
          {connection.providerConfig?.icon ? <i className={connection.providerConfig.icon} aria-hidden="true" /> : <Typography variant="caption" sx={{ fontWeight: 700 }}>{displayName.charAt(0).toUpperCase()}</Typography>}
          {isPaused && <PauseCircleOutlineIcon sx={{ position: 'absolute', bottom: -4, right: -4, fontSize: 14, color: 'text.secondary' }} data-testid={`pause-icon-${connection.id}`} />}
        </Box>
        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} data-testid={`provider-name-${connection.id}`}>{displayName}</Typography>
          {connection.providerConfig?.category && <Typography variant="caption" color="text.secondary">{connection.providerConfig.category}</Typography>}
        </Box>
        {isPaused ? (
          <Chip label="Paused" size="small" color="default" variant="outlined" icon={<PauseCircleOutlineIcon sx={{ fontSize: '0.85rem' }} />} data-testid={`paused-chip-${connection.id}`} sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }} />
        ) : (
          <Chip label={signalLabel(sig)} size="small" color={signalToMuiColor(sig)} variant="filled" data-testid={`status-chip-${connection.id}`} sx={{ height: 20, fontSize: '0.65rem', flexShrink: 0 }} />
        )}
      </Box>
      <Typography variant="caption" color="text.secondary" data-testid={`last-heartbeat-${connection.id}`}>
        {isPaused ? 'Paused — heartbeat checks stopped' : `Last heartbeat: ${formatTimeSince(connection.lastCheckedAt)}`}
      </Typography>
      <Box data-testid={`sparkline-container-${connection.id}`}><MiniSparkline history={history} /></Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// AggregateHealthBar
// ---------------------------------------------------------------------------

function AggregateHealthBar({ connections }: { connections: IProviderConnectionExtendedForGrid[] }) {
  const pct = computeHealthPercentages(connections);
  const total = connections.length;
  if (total === 0) {
    return <Box data-testid="aggregate-health-bar" sx={{ mb: 2 }}><Typography variant="body2" color="text.secondary">No providers connected.</Typography></Box>;
  }
  return (
    <Box data-testid="aggregate-health-bar" sx={{ mb: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
        <Typography variant="caption" color="text.secondary">Provider Health</Typography>
        <Typography variant="caption" color="text.secondary">{total} provider{total !== 1 ? 's' : ''}</Typography>
      </Box>
      <Box sx={{ display: 'flex', height: 8, borderRadius: 4, overflow: 'hidden', backgroundColor: 'action.hover' }} role="progressbar" aria-label="Aggregate provider health" aria-valuenow={pct.presence} aria-valuemin={0} aria-valuemax={100}>
        {pct.presence > 0 && <Box data-testid="health-bar-presence" sx={{ width: `${pct.presence}%`, backgroundColor: '#4caf50' }} />}
        {pct.absence > 0 && <Box data-testid="health-bar-absence" sx={{ width: `${pct.absence}%`, backgroundColor: '#ff9800' }} />}
        {pct.checkFailed > 0 && <Box data-testid="health-bar-check-failed" sx={{ width: `${pct.checkFailed}%`, backgroundColor: '#f44336' }} />}
        {pct.other > 0 && <Box data-testid="health-bar-other" sx={{ width: `${pct.other}%`, backgroundColor: '#9e9e9e' }} />}
      </Box>
      <Box sx={{ display: 'flex', gap: 1.5, mt: 0.5, flexWrap: 'wrap' }}>
        {pct.presence > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#4caf50' }} /><Typography variant="caption" data-testid="health-pct-presence">{pct.presence.toFixed(0)}% Presence</Typography></Box>}
        {pct.absence > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#ff9800' }} /><Typography variant="caption" data-testid="health-pct-absence">{pct.absence.toFixed(0)}% Absence</Typography></Box>}
        {pct.checkFailed > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#f44336' }} /><Typography variant="caption" data-testid="health-pct-check-failed">{pct.checkFailed.toFixed(0)}% Check Failed</Typography></Box>}
        {pct.other > 0 && <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}><Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: '#9e9e9e' }} /><Typography variant="caption" data-testid="health-pct-other">{pct.other.toFixed(0)}% Other</Typography></Box>}
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ProviderHealthGrid
// ---------------------------------------------------------------------------

/**
 * Real-time visual grid of all connected providers.
 * Requirements: 12.1, 12.2, 12.3, 12.4, 12.5, 12.6, 12.7
 */
export function ProviderHealthGrid({ connections: initialConnections, onStatusUpdate, initialView = 'expanded' }: IProviderHealthGridProps) {
  const { tBranded: _t } = useI18n();
  const [connections, setConnections] = useState<IProviderConnectionExtendedForGrid[]>(initialConnections);
  const [sortCriterion, setSortCriterion] = useState<SortCriterion>('statusSeverity');
  const [viewMode, setViewMode] = useState<ViewMode>(initialView);
  const [pulsingIds, setPulsingIds] = useState<Set<string>>(new Set());

  useEffect(() => { setConnections(initialConnections); }, [initialConnections]);

  const handleWebSocketMessage = useCallback((event: MessageEvent) => {
    try {
      const data = JSON.parse(event.data as string) as { connectionId?: string; signal?: HeartbeatSignalType | string; lastCheckedAt?: string; lastActivityAt?: string };
      if (!data.connectionId) return;
      setConnections(prev => prev.map(c => {
        if (c.id !== data.connectionId) return c;
        const newSig = data.signal ?? c.lastCheckSignalType;
        const prevSig = c.lastCheckSignalType;
        if (newSig !== prevSig && shouldPulse(newSig)) {
          setPulsingIds(ids => { const n = new Set(ids); n.add(c.id); return n; });
          setTimeout(() => setPulsingIds(ids => { const n = new Set(ids); n.delete(c.id); return n; }), 700);
        }
        return { ...c, lastCheckSignalType: newSig, lastCheckedAt: data.lastCheckedAt ?? c.lastCheckedAt, lastActivityAt: data.lastActivityAt ?? c.lastActivityAt, signalHistory: newSig ? [...(c.signalHistory ?? []).slice(-19), newSig] : c.signalHistory };
      }));
    } catch { /* ignore malformed */ }
  }, []);

  const handlerRef = useRef(handleWebSocketMessage);
  handlerRef.current = handleWebSocketMessage;

  useEffect(() => {
    if (!onStatusUpdate) return;
    const stableHandler = (event: MessageEvent) => handlerRef.current(event);
    const unsubscribe = onStatusUpdate(stableHandler);
    return unsubscribe;
  }, [onStatusUpdate]);

  const sortedConnections = useMemo(() => sortConnections(connections, sortCriterion), [connections, sortCriterion]);

  return (
    <Box data-testid="provider-health-grid">
      <AggregateHealthBar connections={connections} />
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, flexWrap: 'wrap' }} data-testid="grid-controls">
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <SortIcon fontSize="small" color="action" />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel id="sort-criterion-label">Sort by</InputLabel>
            <Select labelId="sort-criterion-label" value={sortCriterion} label="Sort by" onChange={e => setSortCriterion(e.target.value as SortCriterion)} inputProps={{ 'data-testid': 'sort-select' }}>
              <MenuItem value="name">Name</MenuItem>
              <MenuItem value="lastActivity">Last Activity</MenuItem>
              <MenuItem value="statusSeverity">Status Severity</MenuItem>
              <MenuItem value="category">Category</MenuItem>
            </Select>
          </FormControl>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', ml: 'auto' }}>
          <Tooltip title="Compact view">
            <IconButton size="small" onClick={() => setViewMode('compact')} color={viewMode === 'compact' ? 'primary' : 'default'} data-testid="view-toggle-compact" aria-label="Switch to compact view" aria-pressed={viewMode === 'compact'}>
              <GridViewIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          <Tooltip title="Expanded view">
            <IconButton size="small" onClick={() => setViewMode('expanded')} color={viewMode === 'expanded' ? 'primary' : 'default'} data-testid="view-toggle-expanded" aria-label="Switch to expanded view" aria-pressed={viewMode === 'expanded'}>
              <ViewListIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>
      {sortedConnections.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 6 }} data-testid="health-grid-empty">
          <Typography variant="body1" color="text.secondary">No providers connected.</Typography>
        </Box>
      )}
      <Box sx={{ display: 'grid', gridTemplateColumns: viewMode === 'compact' ? 'repeat(auto-fill, minmax(48px, 1fr))' : 'repeat(auto-fill, minmax(220px, 1fr))', gap: viewMode === 'compact' ? 0.5 : 1.5 }} data-testid="provider-grid">
        {sortedConnections.map(connection => (
          <ProviderConnectionCard key={connection.id} connection={connection} viewMode={viewMode} isPulsing={pulsingIds.has(connection.id)} />
        ))}
      </Box>
    </Box>
  );
}
