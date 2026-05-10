/**
 * CanaryProviderPage — main container/orchestrator component that wires all
 * canary provider expansion components together.
 *
 * Renders CanaryLeftMenu as the sidebar navigation and shows the appropriate
 * content panel based on the active section (marketplace, health grid, bindings, webhooks).
 * Passes BurnbagApiClient methods as callbacks to child components.
 * Handles navigation between sections.
 * Wires ActivationFlow as a dialog/modal that opens from ProviderMarketplace.
 *
 * Requirements: 11.1, 13.1, 14.1, 14.3
 */
import type { ICanaryProviderConfig } from '@brightchain/digitalburnbag-lib';
import CloseIcon from '@mui/icons-material/Close';
import { Box, Dialog, DialogContent, DialogTitle, Divider, IconButton, Paper } from '@mui/material';
import { useCallback, useEffect, useMemo, useState } from 'react';
import type { BurnbagApiClient, IApiProviderConnectionDTO } from '../services/burnbag-api-client';
import { ActivationFlow } from './ActivationFlow';
import type { IActivationFlowProvider } from './ActivationFlow';
import { CanaryLeftMenu } from './CanaryLeftMenu';
import type { IMultiCanaryBindingSummary, IWebhookEndpointSummary } from './CanaryLeftMenu';
import { MultiCanaryBindingPanel } from './MultiCanaryBindingPanel';
import type { IMultiCanaryBinding, IMultiCanaryTarget } from './MultiCanaryBindingPanel';
import { ProviderHealthGrid } from './ProviderHealthGrid';
import type { IProviderConnectionExtendedForGrid } from './ProviderHealthGrid';
import { ProviderMarketplace } from './ProviderMarketplace';
import { WebhookEndpointPanel } from './WebhookEndpointPanel';
import type { IWebhookEndpointDisplay } from './WebhookEndpointPanel';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type CanaryPageSection = 'my-providers' | 'marketplace' | 'multi-canary' | 'webhooks' | 'provider-detail';

export interface ICanaryProviderPageProps {
  /** BurnbagApiClient instance for making API calls */
  apiClient: BurnbagApiClient;
  /** Provider catalog configs (from BUILTIN_PROVIDER_CONFIGS or API) */
  providerCatalog: ICanaryProviderConfig<string>[];
  /** WebSocket subscription for real-time provider status updates */
  onStatusUpdate?: (handler: (event: MessageEvent) => void) => () => void;
  /** Available targets for multi-canary binding (vaults, files, folders) */
  availableTargets?: IMultiCanaryTarget[];
  /** Initial section to display */
  initialSection?: CanaryPageSection;
  /** IDs of providers marked as recommended (high-reliability) */
  recommendedProviderIds?: string[];
}

// ---------------------------------------------------------------------------
// CanaryProviderPage
// ---------------------------------------------------------------------------

/**
 * Main container/orchestrator for the canary provider management UI.
 * Requirements: 11.1, 13.1, 14.1, 14.3
 */
export function CanaryProviderPage({
  apiClient,
  providerCatalog,
  onStatusUpdate,
  availableTargets = [],
  initialSection = 'my-providers',
  recommendedProviderIds = [],
}: ICanaryProviderPageProps) {
  const [activeSection, setActiveSection] = useState<CanaryPageSection>(initialSection);
  const [connections, setConnections] = useState<IApiProviderConnectionDTO[]>([]);
  const [multiCanaryBindings, setMultiCanaryBindings] = useState<IMultiCanaryBinding[]>([]);
  const [webhookEndpoints, setWebhookEndpoints] = useState<IWebhookEndpointDisplay[]>([]);
  const [activationProvider, setActivationProvider] = useState<ICanaryProviderConfig<string> | null>(null);
  const [loading, setLoading] = useState(true);

  // ── Data fetching ──────────────────────────────────────────────────────────

  const fetchConnections = useCallback(async () => {
    try {
      const data = await apiClient.getMyConnections();
      setConnections(data);
    } catch {
      /* silently handle — UI shows empty state */
    }
  }, [apiClient]);

  const fetchMultiCanaryBindings = useCallback(async () => {
    try {
      const data = await apiClient.getMultiCanaryBindings();
      setMultiCanaryBindings(data.map(b => ({
        id: b.id,
        name: b.name,
        providerConnectionIds: b.providerConnectionIds,
        redundancyPolicy: b.redundancyPolicy as IMultiCanaryBinding['redundancyPolicy'],
        providerWeights: b.providerWeights,
        weightedThresholdPercent: b.weightedThresholdPercent,
        protocolAction: b.protocolAction,
        canaryCondition: b.canaryCondition as 'ABSENCE' | 'DURESS',
        absenceThresholdHours: b.absenceThresholdHours,
        aggregateStatus: b.aggregateStatus,
        providerSignals: b.providerSignals,
      })));
    } catch {
      /* silently handle */
    }
  }, [apiClient]);

  const fetchWebhookEndpoints = useCallback(async () => {
    try {
      const data = await apiClient.getWebhookEndpoints();
      setWebhookEndpoints(data.map(ep => ({
        id: ep.id,
        connectionId: ep.connectionId,
        providerId: ep.providerId,
        providerName: ep.providerName,
        webhookUrl: ep.webhookUrl,
        secret: ep.secret,
        isActive: ep.isActive,
        isDisabledByFailures: ep.isDisabledByFailures,
        ipAllowlist: ep.ipAllowlist,
        rateLimitPerMinute: ep.rateLimitPerMinute,
        stats: ep.stats,
        lastReceivedAt: ep.lastReceivedAt,
        createdAt: ep.createdAt,
      })));
    } catch {
      /* silently handle */
    }
  }, [apiClient]);

  useEffect(() => {
    const loadAll = async () => {
      setLoading(true);
      await Promise.all([fetchConnections(), fetchMultiCanaryBindings(), fetchWebhookEndpoints()]);
      setLoading(false);
    };
    void loadAll();
  }, [fetchConnections, fetchMultiCanaryBindings, fetchWebhookEndpoints]);

  // ── Derived data ───────────────────────────────────────────────────────────

  const connectedProviderIds = useMemo(
    () => connections.map(c => c.providerId),
    [connections],
  );

  const bindingSummaries: IMultiCanaryBindingSummary[] = useMemo(
    () => multiCanaryBindings.map(b => ({
      id: b.id,
      name: b.name,
      targetNames: [], // populated from targets if available
      providerCount: b.providerConnectionIds.length,
      aggregateStatus: b.aggregateStatus ?? 'all_present',
    })),
    [multiCanaryBindings],
  );

  const webhookSummaries: IWebhookEndpointSummary[] = useMemo(
    () => webhookEndpoints.map(ep => ({
      id: ep.id,
      providerName: ep.providerName,
      lastReceivedAt: ep.lastReceivedAt,
      successRate: ep.stats.totalReceived > 0
        ? `${Math.round((ep.stats.successfullyProcessed / ep.stats.totalReceived) * 100)}%`
        : '—',
    })),
    [webhookEndpoints],
  );

  const gridConnections: IProviderConnectionExtendedForGrid[] = useMemo(
    () => connections.map(c => ({
      id: c.id,
      providerId: c.providerId,
      providerDisplayName: c.providerDisplayName,
      providerUsername: c.providerUsername,
      status: c.status as IProviderConnectionExtendedForGrid['status'],
      lastCheckSignalType: c.lastCheckResult,
      lastCheckedAt: c.lastCheckedAt,
      lastActivityAt: c.lastCheckedAt,
      isPaused: c.status === 'paused',
      providerConfig: providerCatalog.find(p => p.id === c.providerId),
    })),
    [connections, providerCatalog],
  );

  // ── Navigation ─────────────────────────────────────────────────────────────

  const handleNavigate = useCallback((section: CanaryPageSection) => {
    setActiveSection(section);
  }, []);

  // ── ActivationFlow callbacks ───────────────────────────────────────────────

  const handleConnectProvider = useCallback((provider: ICanaryProviderConfig<string>) => {
    setActivationProvider(provider);
  }, []);

  const handleActivationComplete = useCallback(async () => {
    setActivationProvider(null);
    await fetchConnections();
  }, [fetchConnections]);

  const handleActivationCancel = useCallback(() => {
    setActivationProvider(null);
  }, []);

  const activationFlowProvider: IActivationFlowProvider | null = useMemo(() => {
    if (!activationProvider) return null;
    return {
      id: activationProvider.id,
      name: activationProvider.name,
      description: activationProvider.description,
      icon: activationProvider.icon,
      authType: activationProvider.auth.type as IActivationFlowProvider['authType'],
      oauthAuthorizationUrl: activationProvider.auth.oauth2?.authorizationUrl,
      requiresApiKey: activationProvider.auth.type === 'api_key',
    };
  }, [activationProvider]);

  // ── MultiCanaryBindingPanel callbacks ──────────────────────────────────────

  const handleCreateBinding = useCallback(async (params: {
    name: string;
    providerConnectionIds: string[];
    targetIds: string[];
    redundancyPolicy: string;
    providerWeights?: Record<string, number>;
    weightedThresholdPercent?: number;
    protocolAction: string;
    canaryCondition: string;
    absenceThresholdHours: number;
  }) => {
    await apiClient.createMultiCanaryBinding({
      name: params.name,
      providerConnectionIds: params.providerConnectionIds,
      targetIds: params.targetIds,
      redundancyPolicy: params.redundancyPolicy,
      providerWeights: params.providerWeights,
      weightedThresholdPercent: params.weightedThresholdPercent,
      protocolAction: params.protocolAction,
      canaryCondition: params.canaryCondition,
      absenceThresholdHours: params.absenceThresholdHours,
    });
    await fetchMultiCanaryBindings();
  }, [apiClient, fetchMultiCanaryBindings]);

  const handleDeleteBinding = useCallback(async (bindingId: string) => {
    await apiClient.deleteMultiCanaryBinding(bindingId);
    await fetchMultiCanaryBindings();
  }, [apiClient, fetchMultiCanaryBindings]);

  // ── WebhookEndpointPanel callbacks ─────────────────────────────────────────

  const handleRotateSecret = useCallback(async (endpointId: string, gracePeriodMs?: number) => {
    const result = await apiClient.rotateWebhookSecret(endpointId, gracePeriodMs);
    await fetchWebhookEndpoints();
    return result;
  }, [apiClient, fetchWebhookEndpoints]);

  const handleUpdateIpAllowlist = useCallback(async (endpointId: string, cidrs: string[]) => {
    await apiClient.updateWebhookIpAllowlist(endpointId, cidrs);
    await fetchWebhookEndpoints();
  }, [apiClient, fetchWebhookEndpoints]);

  const handleSendTestWebhook = useCallback(async (endpointId: string) => {
    return apiClient.sendTestWebhook(endpointId);
  }, [apiClient]);

  const handleRefreshStats = useCallback(async (endpointId: string) => {
    return apiClient.getWebhookDeliveryStats(endpointId);
  }, [apiClient]);

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <Box data-testid="canary-provider-page" sx={{ display: 'flex', height: '100%', minHeight: 0 }}>
      {/* Sidebar navigation */}
      <Paper
        elevation={0}
        sx={{ width: 260, flexShrink: 0, borderRight: 1, borderColor: 'divider', overflowY: 'auto' }}
        data-testid="canary-sidebar"
      >
        <CanaryLeftMenu
          connections={connections}
          multiCanaryBindings={bindingSummaries}
          webhookEndpoints={webhookSummaries}
          onNavigate={handleNavigate}
          onSelectProvider={(connectionId) => {
            setActiveSection('provider-detail');
          }}
          activeSection={activeSection}
        />
      </Paper>

      <Divider orientation="vertical" flexItem />

      {/* Main content area */}
      <Box sx={{ flex: 1, overflowY: 'auto', p: 3, minWidth: 0 }} data-testid="canary-content">
        {activeSection === 'marketplace' && (
          <ProviderMarketplace
            providers={providerCatalog}
            connectedProviderIds={connectedProviderIds}
            recommendedProviderIds={recommendedProviderIds}
            onConnect={handleConnectProvider}
          />
        )}

        {activeSection === 'my-providers' && (
          <ProviderHealthGrid
            connections={gridConnections}
            onStatusUpdate={onStatusUpdate}
          />
        )}

        {activeSection === 'multi-canary' && (
          <MultiCanaryBindingPanel
            connections={connections}
            availableTargets={availableTargets}
            existingBindings={multiCanaryBindings}
            onCreateBinding={handleCreateBinding}
            onDeleteBinding={handleDeleteBinding}
          />
        )}

        {activeSection === 'webhooks' && (
          <WebhookEndpointPanel
            endpoints={webhookEndpoints}
            onRotateSecret={handleRotateSecret}
            onUpdateIpAllowlist={handleUpdateIpAllowlist}
            onSendTestWebhook={handleSendTestWebhook}
            onRefreshStats={handleRefreshStats}
          />
        )}
      </Box>

      {/* ActivationFlow dialog — opens from ProviderMarketplace "Connect" buttons */}
      <Dialog
        open={activationProvider !== null}
        onClose={handleActivationCancel}
        maxWidth="sm"
        fullWidth
        data-testid="activation-flow-dialog"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          Connect {activationProvider?.name ?? 'Provider'}
          <IconButton size="small" onClick={handleActivationCancel} aria-label="Close" data-testid="activation-flow-close">
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {activationFlowProvider && (
            <ActivationFlow
              provider={activationFlowProvider}
              onInitiateOAuth={async (providerId) => {
                const result = await apiClient.initiateOAuth(providerId, window.location.href);
                return { authorizationUrl: result.authorizationUrl };
              }}
              onConnectWithApiKey={async (providerId, apiKey) => {
                return apiClient.connectWithApiKey(providerId, apiKey);
              }}
              onTestConnection={async (connectionId) => {
                return apiClient.testConnection(connectionId);
              }}
              onComplete={handleActivationComplete}
              onCancel={handleActivationCancel}
            />
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
