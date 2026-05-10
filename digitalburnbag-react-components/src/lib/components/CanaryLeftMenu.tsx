/**
 * CanaryLeftMenu — left navigation section for canary provider management.
 *
 * Sub-sections: My Providers, Provider Marketplace, Multi-Canary Bindings, Webhook Endpoints.
 * Shows warning badge when providers need attention.
 * Shows overall canary system health indicator.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */
import LinkIcon from '@mui/icons-material/Link';
import NotificationsActiveIcon from '@mui/icons-material/NotificationsActive';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import WebhookIcon from '@mui/icons-material/Webhook';
import {
  Badge,
  Box,
  Chip,
  Collapse,
  Divider,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Tooltip,
  Typography,
} from '@mui/material';
import { useMemo, useState } from 'react';
import type { IApiProviderConnectionDTO } from '../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IMultiCanaryBindingSummary {
  id: string;
  name: string;
  targetNames: string[];
  providerCount: number;
  aggregateStatus: string;
}

export interface IWebhookEndpointSummary {
  id: string;
  providerName: string;
  lastReceivedAt?: string;
  successRate: string;
}

export type CanarySystemHealth = 'healthy' | 'degraded' | 'critical';

export interface ICanaryLeftMenuProps {
  /** All connected provider connections */
  connections: IApiProviderConnectionDTO[];
  /** Multi-canary binding summaries */
  multiCanaryBindings: IMultiCanaryBindingSummary[];
  /** Webhook endpoint summaries */
  webhookEndpoints: IWebhookEndpointSummary[];
  /** Called when user navigates to a section */
  onNavigate: (section: 'my-providers' | 'marketplace' | 'multi-canary' | 'webhooks' | 'provider-detail') => void;
  /** Called when user clicks a specific provider */
  onSelectProvider?: (connectionId: string) => void;
  /** Currently active section */
  activeSection?: string;
}

// ---------------------------------------------------------------------------
// Pure exported functions (for property-based testing)
// ---------------------------------------------------------------------------

const ATTENTION_STATUSES = new Set(['error', 'expired', 'paused', 'check_failed', 'absence']);

function needsAttention(conn: IApiProviderConnectionDTO): boolean {
  return ATTENTION_STATUSES.has(conn.status) || ATTENTION_STATUSES.has(conn.lastCheckResult ?? '');
}

/**
 * Classify overall canary system health based on provider statuses.
 * - "critical" if all providers need attention (CHECK_FAILED/ABSENCE/error/expired/paused) and total > 0
 * - "degraded" if any but not all need attention
 * - "healthy" if all PRESENCE or no providers connected
 *
 * Property 23: Overall system health classification
 * Validates: Requirements 14.7
 */
export function classifySystemHealth(connections: IApiProviderConnectionDTO[]): CanarySystemHealth {
  if (connections.length === 0) return 'healthy';
  const attentionCount = connections.filter(needsAttention).length;
  if (attentionCount === 0) return 'healthy';
  if (attentionCount === connections.length) return 'critical';
  return 'degraded';
}

/**
 * Count providers needing attention (CHECK_FAILED, ABSENCE, error, expired, or paused status).
 *
 * Property 24: Attention-needed badge count accuracy
 * Validates: Requirements 14.6
 */
export function getAttentionNeededCount(connections: IApiProviderConnectionDTO[]): number {
  return connections.filter(needsAttention).length;
}

/**
 * Compute overall canary system health.
 * @deprecated Use classifySystemHealth instead
 */
export function computeSystemHealth(connections: IApiProviderConnectionDTO[]): CanarySystemHealth {
  return classifySystemHealth(connections);
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function healthColor(health: CanarySystemHealth): 'success' | 'warning' | 'error' {
  switch (health) {
    case 'healthy': return 'success';
    case 'degraded': return 'warning';
    case 'critical': return 'error';
  }
}

function signalColor(sig?: string): string {
  switch (sig) {
    case 'presence': return '#4caf50';
    case 'absence': return '#ff9800';
    case 'check_failed': case 'error': return '#f44336';
    case 'duress': return '#9c27b0';
    default: return '#9e9e9e';
  }
}

function formatTimeSince(iso?: string): string {
  if (!iso) return 'Never';
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ---------------------------------------------------------------------------
// CanaryLeftMenu
// ---------------------------------------------------------------------------

/**
 * Left navigation section for canary provider management.
 * Requirements: 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7
 */
export function CanaryLeftMenu({
  connections,
  multiCanaryBindings,
  webhookEndpoints,
  onNavigate,
  onSelectProvider,
  activeSection,
}: ICanaryLeftMenuProps) {
  const [myProvidersExpanded, setMyProvidersExpanded] = useState(true);
  const [multiCanaryExpanded, setMultiCanaryExpanded] = useState(false);
  const [webhooksExpanded, setWebhooksExpanded] = useState(false);

  const attentionCount = useMemo(() => getAttentionNeededCount(connections), [connections]);
  const systemHealth = useMemo(() => classifySystemHealth(connections), [connections]);

  return (
    <Box data-testid="canary-left-menu" sx={{ width: '100%' }}>
      {/* Overall health indicator */}
      <Box sx={{ px: 2, py: 1, display: 'flex', alignItems: 'center', gap: 1 }} data-testid="system-health-indicator">
        <Typography variant="caption" color="text.secondary">Canary System</Typography>
        <Chip
          label={systemHealth}
          size="small"
          color={healthColor(systemHealth)}
          variant="filled"
          data-testid={`health-chip-${systemHealth}`}
          sx={{ height: 18, fontSize: '0.65rem', textTransform: 'capitalize' }}
        />
      </Box>

      <Divider />

      <List dense disablePadding>
        {/* ── My Providers ── */}
        <ListItemButton
          onClick={() => { setMyProvidersExpanded(v => !v); onNavigate('my-providers'); }}
          selected={activeSection === 'my-providers'}
          data-testid="nav-my-providers"
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <Badge badgeContent={attentionCount > 0 ? attentionCount : undefined} color="warning" data-testid="attention-badge">
              <NotificationsActiveIcon fontSize="small" />
            </Badge>
          </ListItemIcon>
          <ListItemText
            primary={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                My Providers
                {attentionCount > 0 && (
                  <Tooltip title={`${attentionCount} provider${attentionCount !== 1 ? 's' : ''} need attention`}>
                    <WarningAmberIcon fontSize="small" color="warning" data-testid="warning-icon" />
                  </Tooltip>
                )}
              </Box>
            }
            secondary={`${connections.length} connected`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>

        {/* My Providers compact list */}
        <Collapse in={myProvidersExpanded} data-testid="my-providers-list">
          {connections.length === 0 && (
            <Box sx={{ px: 3, py: 1 }}>
              <Typography variant="caption" color="text.secondary">No providers connected.</Typography>
            </Box>
          )}
          {connections.map(conn => (
            <ListItemButton
              key={conn.id}
              sx={{ pl: 4, py: 0.5 }}
              onClick={() => onSelectProvider?.(conn.id)}
              data-testid={`provider-list-item-${conn.id}`}
            >
              <ListItemIcon sx={{ minWidth: 20 }}>
                <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: signalColor(conn.lastCheckResult ?? conn.status) }} data-testid={`provider-status-dot-${conn.id}`} />
              </ListItemIcon>
              <ListItemText
                primary={conn.providerDisplayName ?? conn.providerUsername ?? conn.providerId}
                secondary={formatTimeSince(conn.lastCheckedAt)}
                primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', sx: { fontSize: '0.6rem' } }}
              />
              {needsAttention(conn) && <WarningAmberIcon fontSize="small" color="warning" sx={{ ml: 0.5 }} />}
            </ListItemButton>
          ))}
        </Collapse>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Provider Marketplace ── */}
        <ListItemButton
          onClick={() => onNavigate('marketplace')}
          selected={activeSection === 'marketplace'}
          data-testid="nav-marketplace"
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <ShoppingBagIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Provider Marketplace"
            secondary="Browse & connect providers"
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Multi-Canary Bindings ── */}
        <ListItemButton
          onClick={() => { setMultiCanaryExpanded(v => !v); onNavigate('multi-canary'); }}
          selected={activeSection === 'multi-canary'}
          data-testid="nav-multi-canary"
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <LinkIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Multi-Canary Bindings"
            secondary={`${multiCanaryBindings.length} configured`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>

        <Collapse in={multiCanaryExpanded} data-testid="multi-canary-list">
          {multiCanaryBindings.length === 0 && (
            <Box sx={{ px: 3, py: 1 }}>
              <Typography variant="caption" color="text.secondary">No bindings configured.</Typography>
            </Box>
          )}
          {multiCanaryBindings.map(binding => (
            <ListItemButton key={binding.id} sx={{ pl: 4, py: 0.5 }} data-testid={`binding-list-item-${binding.id}`}>
              <ListItemText
                primary={binding.name}
                secondary={
                  <Box component="span" sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
                    <span>{binding.targetNames.slice(0, 2).join(', ')}{binding.targetNames.length > 2 ? '…' : ''}</span>
                    <Chip label={`${binding.providerCount} providers`} size="small" sx={{ height: 14, fontSize: '0.55rem' }} />
                    <Chip label={binding.aggregateStatus} size="small" color={binding.aggregateStatus === 'all_present' ? 'success' : 'warning'} sx={{ height: 14, fontSize: '0.55rem' }} />
                  </Box>
                }
                primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', component: 'div' }}
              />
            </ListItemButton>
          ))}
        </Collapse>

        <Divider sx={{ my: 0.5 }} />

        {/* ── Webhook Endpoints ── */}
        <ListItemButton
          onClick={() => { setWebhooksExpanded(v => !v); onNavigate('webhooks'); }}
          selected={activeSection === 'webhooks'}
          data-testid="nav-webhooks"
        >
          <ListItemIcon sx={{ minWidth: 32 }}>
            <WebhookIcon fontSize="small" />
          </ListItemIcon>
          <ListItemText
            primary="Webhook Endpoints"
            secondary={`${webhookEndpoints.length} active`}
            primaryTypographyProps={{ variant: 'body2', fontWeight: 600 }}
            secondaryTypographyProps={{ variant: 'caption' }}
          />
        </ListItemButton>

        <Collapse in={webhooksExpanded} data-testid="webhooks-list">
          {webhookEndpoints.length === 0 && (
            <Box sx={{ px: 3, py: 1 }}>
              <Typography variant="caption" color="text.secondary">No webhook endpoints.</Typography>
            </Box>
          )}
          {webhookEndpoints.map(ep => (
            <ListItemButton key={ep.id} sx={{ pl: 4, py: 0.5 }} data-testid={`webhook-list-item-${ep.id}`}>
              <ListItemText
                primary={ep.providerName}
                secondary={`${formatTimeSince(ep.lastReceivedAt)} · ${ep.successRate} success`}
                primaryTypographyProps={{ variant: 'caption', noWrap: true }}
                secondaryTypographyProps={{ variant: 'caption', sx: { fontSize: '0.6rem' } }}
              />
            </ListItemButton>
          ))}
        </Collapse>
      </List>
    </Box>
  );
}
