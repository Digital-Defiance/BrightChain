/**
 * WebhookEndpointPanel — management UI for webhook endpoints.
 *
 * Requirements: 10.1, 10.6, 10.7, 14.5, 17.6, 17.7
 */
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import RefreshIcon from '@mui/icons-material/Refresh';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Paper,
  Select,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import { formatDateWithBD } from '../utils/formatBrightDate';
import { toBrightDateString } from '@brightchain/brightchain-lib';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IWebhookDeliveryStats {
  totalReceived: number;
  successfullyProcessed: number;
  failedValidation: number;
  lastReceivedAt?: string;
  lastSuccessAt?: string;
}

export interface IWebhookEndpointDisplay {
  id: string;
  connectionId: string;
  providerId: string;
  providerName: string;
  webhookUrl: string;
  secret: string;
  isActive: boolean;
  isDisabledByFailures: boolean;
  ipAllowlist: string[];
  rateLimitPerMinute: number;
  stats: IWebhookDeliveryStats;
  lastReceivedAt?: string;
  createdAt: string;
}

/** A single data point for the delivery chart over time */
export interface IDeliveryDataPoint {
  /** ISO timestamp for this bucket */
  timestamp: string;
  /** Successful deliveries in this bucket */
  successful: number;
  /** Failed deliveries in this bucket */
  failed: number;
}

export interface IWebhookEndpointPanelProps {
  endpoints: IWebhookEndpointDisplay[];
  onRotateSecret: (endpointId: string, gracePeriodMs?: number) => Promise<{ newSecret: string }>;
  onUpdateIpAllowlist: (endpointId: string, cidrs: string[]) => Promise<void>;
  onSendTestWebhook: (endpointId: string) => Promise<{ success: boolean; error?: string; processingTimeMs: number }>;
  onRefreshStats: (endpointId: string) => Promise<IWebhookDeliveryStats>;
  /** Optional: fetch delivery history for chart display */
  onFetchDeliveryHistory?: (endpointId: string) => Promise<IDeliveryDataPoint[]>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatTimestamp(iso?: string): string {
  if (!iso) return 'Never';
  return formatDateWithBD(iso);
}

function successRate(stats: IWebhookDeliveryStats): string {
  if (stats.totalReceived === 0) return 'N/A';
  return `${((stats.successfullyProcessed / stats.totalReceived) * 100).toFixed(0)}%`;
}

// ---------------------------------------------------------------------------
// SecretDisplay
// ---------------------------------------------------------------------------

function SecretDisplay({ secret, onCopy }: { secret: string; onCopy: (text: string) => void }) {
  const [visible, setVisible] = useState(false);
  return (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
      <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1 }} data-testid="secret-display">
        {visible ? secret : '•'.repeat(Math.min(secret.length, 32))}
      </Typography>
      <Tooltip title={visible ? 'Hide secret' : 'Show secret'}>
        <IconButton size="small" onClick={() => setVisible(v => !v)} aria-label={visible ? 'Hide secret' : 'Show secret'} data-testid="secret-visibility-toggle">
          {visible ? <VisibilityOffIcon fontSize="small" /> : <VisibilityIcon fontSize="small" />}
        </IconButton>
      </Tooltip>
      <Tooltip title="Copy secret">
        <IconButton size="small" onClick={() => onCopy(secret)} aria-label="Copy secret" data-testid="copy-secret-button">
          <ContentCopyIcon fontSize="small" />
        </IconButton>
      </Tooltip>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// IpAllowlistEditor
// ---------------------------------------------------------------------------

function IpAllowlistEditor({ endpointId, initialCidrs, onSave }: { endpointId: string; initialCidrs: string[]; onSave: (cidrs: string[]) => Promise<void> }) {
  const [cidrs, setCidrs] = useState(initialCidrs.join('\n'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    setError('');
    setSaving(true);
    try {
      const list = cidrs.split('\n').map(s => s.trim()).filter(Boolean);
      await onSave(list);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to update allowlist');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Box data-testid={`ip-allowlist-editor-${endpointId}`}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        IP Allowlist (CIDR ranges, one per line — empty = allow all)
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 1 }}>{error}</Alert>}
      <TextField
        multiline
        minRows={2}
        maxRows={6}
        fullWidth
        size="small"
        value={cidrs}
        onChange={e => setCidrs(e.target.value)}
        placeholder="192.168.1.0/24&#10;10.0.0.0/8"
        inputProps={{ 'data-testid': `ip-allowlist-input-${endpointId}` }}
      />
      <Button size="small" variant="outlined" onClick={handleSave} disabled={saving} sx={{ mt: 1 }} data-testid={`save-allowlist-${endpointId}`}>
        Save Allowlist
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// DeliveryChart — simple bar chart showing deliveries over time
// ---------------------------------------------------------------------------

function DeliveryChart({ data }: { data: IDeliveryDataPoint[] }) {
  if (data.length === 0) {
    return (
      <Typography variant="caption" color="text.secondary" data-testid="delivery-chart-empty">
        No delivery history available.
      </Typography>
    );
  }

  const maxValue = Math.max(...data.map(d => d.successful + d.failed), 1);

  return (
    <Box data-testid="delivery-chart" sx={{ mt: 1 }}>
      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
        Delivery History
      </Typography>
      <Box sx={{ display: 'flex', alignItems: 'flex-end', gap: '2px', height: 60 }}>
        {data.map((point, idx) => {
          const total = point.successful + point.failed;
          const barHeight = (total / maxValue) * 100;
          const successPct = total > 0 ? (point.successful / total) * 100 : 100;
          return (
            <Tooltip
              key={idx}
              title={`${new Date(point.timestamp).toLocaleDateString()} (BD ${toBrightDateString(point.timestamp, 3)}): ${point.successful} ok, ${point.failed} failed`}
            >
              <Box
                data-testid={`chart-bar-${idx}`}
                sx={{
                  flex: 1,
                  minWidth: 4,
                  maxWidth: 16,
                  height: `${barHeight}%`,
                  borderRadius: '2px 2px 0 0',
                  background: `linear-gradient(to top, #4caf50 ${successPct}%, #f44336 ${successPct}%)`,
                  cursor: 'pointer',
                }}
              />
            </Tooltip>
          );
        })}
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.25 }}>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
          {data.length > 0 ? new Date(data[0].timestamp).toLocaleDateString() : ''}
        </Typography>
        <Typography variant="caption" color="text.secondary" sx={{ fontSize: '0.55rem' }}>
          {data.length > 0 ? new Date(data[data.length - 1].timestamp).toLocaleDateString() : ''}
        </Typography>
      </Box>
      <Box sx={{ display: 'flex', gap: 1, mt: 0.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 1, backgroundColor: '#4caf50' }} />
          <Typography variant="caption" color="text.secondary">Success</Typography>
        </Box>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.25 }}>
          <Box sx={{ width: 8, height: 8, borderRadius: 1, backgroundColor: '#f44336' }} />
          <Typography variant="caption" color="text.secondary">Failed</Typography>
        </Box>
      </Box>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// GracePeriodSelector — dropdown for selecting rotation grace period
// ---------------------------------------------------------------------------

const GRACE_PERIOD_OPTIONS = [
  { label: 'No grace period', value: 0 },
  { label: '5 minutes', value: 5 * 60 * 1000 },
  { label: '15 minutes', value: 15 * 60 * 1000 },
  { label: '1 hour', value: 60 * 60 * 1000 },
  { label: '4 hours', value: 4 * 60 * 60 * 1000 },
  { label: '24 hours', value: 24 * 60 * 60 * 1000 },
];

// ---------------------------------------------------------------------------
// EndpointCard
// ---------------------------------------------------------------------------

interface IEndpointCardProps {
  endpoint: IWebhookEndpointDisplay;
  onRotateSecret: (endpointId: string, gracePeriodMs?: number) => Promise<{ newSecret: string }>;
  onUpdateIpAllowlist: (endpointId: string, cidrs: string[]) => Promise<void>;
  onSendTestWebhook: (endpointId: string) => Promise<{ success: boolean; error?: string; processingTimeMs: number }>;
  onRefreshStats: (endpointId: string) => Promise<IWebhookDeliveryStats>;
  onFetchDeliveryHistory?: (endpointId: string) => Promise<IDeliveryDataPoint[]>;
}

function EndpointCard({ endpoint, onRotateSecret, onUpdateIpAllowlist, onSendTestWebhook, onRefreshStats, onFetchDeliveryHistory }: IEndpointCardProps) {
  const [rotatingSecret, setRotatingSecret] = useState(false);
  const [rotateResult, setRotateResult] = useState<string | null>(null);
  const [gracePeriodMs, setGracePeriodMs] = useState<number>(GRACE_PERIOD_OPTIONS[2].value); // default 15 min
  const [showGracePeriod, setShowGracePeriod] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; error?: string; processingTimeMs: number } | null>(null);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [stats, setStats] = useState(endpoint.stats);
  const [refreshingStats, setRefreshingStats] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showAllowlistEditor, setShowAllowlistEditor] = useState(false);
  const [deliveryHistory, setDeliveryHistory] = useState<IDeliveryDataPoint[] | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);

  const handleCopy = useCallback((text: string) => {
    void navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, []);

  const handleRotateSecret = async () => {
    setRotatingSecret(true);
    setRotateResult(null);
    try {
      const result = await onRotateSecret(endpoint.id, gracePeriodMs > 0 ? gracePeriodMs : undefined);
      setRotateResult(`New secret: ${result.newSecret.slice(0, 8)}… (copied to clipboard)`);
      void navigator.clipboard.writeText(result.newSecret);
      setShowGracePeriod(false);
    } catch (e) {
      setRotateResult(`Error: ${e instanceof Error ? e.message : 'Failed to rotate'}`);
    } finally {
      setRotatingSecret(false);
    }
  };

  const handleTestWebhook = async () => {
    setTestingWebhook(true);
    setTestResult(null);
    try {
      const result = await onSendTestWebhook(endpoint.id);
      setTestResult(result);
    } catch (e) {
      setTestResult({ success: false, error: e instanceof Error ? e.message : 'Test failed', processingTimeMs: 0 });
    } finally {
      setTestingWebhook(false);
    }
  };

  const handleRefreshStats = async () => {
    setRefreshingStats(true);
    try {
      const updated = await onRefreshStats(endpoint.id);
      setStats(updated);
    } finally {
      setRefreshingStats(false);
    }
  };

  const handleLoadHistory = async () => {
    if (!onFetchDeliveryHistory) return;
    setLoadingHistory(true);
    try {
      const history = await onFetchDeliveryHistory(endpoint.id);
      setDeliveryHistory(history);
    } finally {
      setLoadingHistory(false);
    }
  };

  return (
    <Paper variant="outlined" sx={{ p: 2, mb: 2 }} data-testid={`endpoint-card-${endpoint.id}`}>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1.5 }}>
        <Typography variant="subtitle2" sx={{ flex: 1 }}>{endpoint.providerName}</Typography>
        {endpoint.isDisabledByFailures && <Chip label="Disabled" color="error" size="small" />}
        {!endpoint.isDisabledByFailures && endpoint.isActive && <Chip label="Active" color="success" size="small" />}
        <Typography variant="caption" color="text.secondary">Last received: {formatTimestamp(endpoint.lastReceivedAt)}</Typography>
      </Box>

      {/* Webhook URL */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">Webhook URL</Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, mt: 0.25 }}>
          <Typography variant="caption" sx={{ fontFamily: 'monospace', wordBreak: 'break-all', flex: 1, backgroundColor: 'action.hover', p: 0.5, borderRadius: 0.5 }} data-testid={`webhook-url-${endpoint.id}`}>
            {endpoint.webhookUrl}
          </Typography>
          <Tooltip title={copied ? 'Copied!' : 'Copy URL'}>
            <IconButton size="small" onClick={() => handleCopy(endpoint.webhookUrl)} aria-label="Copy webhook URL" data-testid={`copy-url-${endpoint.id}`}>
              <ContentCopyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* Secret */}
      <Box sx={{ mb: 1.5 }}>
        <Typography variant="caption" color="text.secondary">Webhook Secret</Typography>
        <SecretDisplay secret={endpoint.secret} onCopy={handleCopy} />
      </Box>

      {/* Delivery stats */}
      <Box sx={{ mb: 1.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <Typography variant="caption" color="text.secondary">Delivery Stats</Typography>
          <Tooltip title="Refresh stats">
            <IconButton size="small" onClick={handleRefreshStats} disabled={refreshingStats} aria-label="Refresh stats" data-testid={`refresh-stats-${endpoint.id}`}>
              <RefreshIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }} data-testid={`delivery-stats-${endpoint.id}`}>
          <Box><Typography variant="caption" color="text.secondary">Total</Typography><Typography variant="body2">{stats.totalReceived}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Success</Typography><Typography variant="body2" color="success.main">{stats.successfullyProcessed}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Failed</Typography><Typography variant="body2" color="error.main">{stats.failedValidation}</Typography></Box>
          <Box><Typography variant="caption" color="text.secondary">Rate</Typography><Typography variant="body2">{successRate(stats)}</Typography></Box>
        </Box>
      </Box>

      <Divider sx={{ my: 1.5 }} />

      {/* Actions */}
      <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 1 }}>
        <Button size="small" variant="outlined" onClick={() => setShowGracePeriod(v => !v)} disabled={rotatingSecret} data-testid={`rotate-secret-${endpoint.id}`}>
          Rotate Secret
        </Button>
        <Button size="small" variant="outlined" onClick={handleTestWebhook} disabled={testingWebhook} data-testid={`test-webhook-${endpoint.id}`}>
          Test Webhook
        </Button>
        <Button size="small" variant="outlined" onClick={() => setShowAllowlistEditor(v => !v)} data-testid={`edit-allowlist-${endpoint.id}`}>
          IP Allowlist
        </Button>
        {onFetchDeliveryHistory && (
          <Button size="small" variant="outlined" onClick={handleLoadHistory} disabled={loadingHistory} data-testid={`show-chart-${endpoint.id}`}>
            {deliveryHistory ? 'Refresh Chart' : 'Show Chart'}
          </Button>
        )}
      </Box>

      {/* Grace period configuration for secret rotation */}
      {showGracePeriod && (
        <Paper variant="outlined" sx={{ p: 1.5, mb: 1 }} data-testid={`grace-period-config-${endpoint.id}`}>
          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
            Grace period: both old and new secrets will be accepted during this time.
          </Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FormControl size="small" sx={{ minWidth: 160 }}>
              <InputLabel>Grace Period</InputLabel>
              <Select
                value={gracePeriodMs}
                label="Grace Period"
                onChange={e => setGracePeriodMs(e.target.value as number)}
                data-testid={`grace-period-select-${endpoint.id}`}
              >
                {GRACE_PERIOD_OPTIONS.map(opt => (
                  <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={handleRotateSecret}
              disabled={rotatingSecret}
              data-testid={`confirm-rotate-${endpoint.id}`}
            >
              Confirm Rotation
            </Button>
            <Button size="small" onClick={() => setShowGracePeriod(false)}>Cancel</Button>
          </Box>
        </Paper>
      )}

      {rotateResult && (
        <Alert severity={rotateResult.startsWith('Error') ? 'error' : 'success'} sx={{ mb: 1 }} data-testid={`rotate-result-${endpoint.id}`}>
          {rotateResult}
        </Alert>
      )}

      {testResult && (
        <Alert severity={testResult.success ? 'success' : 'error'} sx={{ mb: 1 }} data-testid={`test-result-${endpoint.id}`}>
          {testResult.success
            ? `Test webhook delivered successfully in ${testResult.processingTimeMs}ms`
            : `Test failed: ${testResult.error}`}
        </Alert>
      )}

      {showAllowlistEditor && (
        <IpAllowlistEditor
          endpointId={endpoint.id}
          initialCidrs={endpoint.ipAllowlist}
          onSave={cidrs => onUpdateIpAllowlist(endpoint.id, cidrs)}
        />
      )}

      {/* Delivery chart over time */}
      {deliveryHistory && (
        <Box sx={{ mt: 1.5 }}>
          <DeliveryChart data={deliveryHistory} />
        </Box>
      )}
    </Paper>
  );
}

// ---------------------------------------------------------------------------
// WebhookEndpointPanel
// ---------------------------------------------------------------------------

/**
 * Management UI for webhook endpoints.
 * Requirements: 10.1, 10.6, 10.7, 14.5, 17.6, 17.7
 */
export function WebhookEndpointPanel({ endpoints, onRotateSecret, onUpdateIpAllowlist, onSendTestWebhook, onRefreshStats, onFetchDeliveryHistory }: IWebhookEndpointPanelProps) {
  return (
    <Box data-testid="webhook-endpoint-panel">
      <Typography variant="h6" gutterBottom>Webhook Endpoints</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Manage inbound webhook URLs for push-based canary providers.
      </Typography>

      {endpoints.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="no-endpoints-state">
          <Typography variant="body2" color="text.secondary">No webhook endpoints configured.</Typography>
          <Typography variant="caption" color="text.secondary">Webhook endpoints are created automatically when you connect a push-based provider.</Typography>
        </Box>
      )}

      {endpoints.map(endpoint => (
        <EndpointCard
          key={endpoint.id}
          endpoint={endpoint}
          onRotateSecret={onRotateSecret}
          onUpdateIpAllowlist={onUpdateIpAllowlist}
          onSendTestWebhook={onSendTestWebhook}
          onRefreshStats={onRefreshStats}
          onFetchDeliveryHistory={onFetchDeliveryHistory}
        />
      ))}
    </Box>
  );
}
