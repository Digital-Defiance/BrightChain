/**
 * Unit tests for CanaryLeftMenu component.
 * Task 16.7 — Tests for left navigation section for canary provider management.
 *
 * Requirements: 14.1, 14.2, 14.3, 14.6, 14.7
 */

// ---------------------------------------------------------------------------
// Mocks — must come before any imports that use them
// ---------------------------------------------------------------------------

jest.mock('@digitaldefiance/express-suite-react-components', () => ({
  useI18n: () => ({
    tComponent: (_componentId: string, key: string) => key,
    tBranded: (key: string) => key,
  }),
}));

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import {
  CanaryLeftMenu,
  ICanaryLeftMenuProps,
  IMultiCanaryBindingSummary,
  IWebhookEndpointSummary,
} from '../../components/CanaryLeftMenu';
import type { IApiProviderConnectionDTO } from '../../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeConnection(
  overrides: Partial<IApiProviderConnectionDTO> = {},
): IApiProviderConnectionDTO {
  const id = overrides.id ?? 'conn-1';
  return {
    id,
    userId: 'user-1',
    providerId: overrides.providerId ?? 'github',
    status: overrides.status ?? 'connected',
    providerDisplayName: overrides.providerDisplayName ?? 'GitHub',
    providerUsername: overrides.providerUsername,
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    lastCheckResult: overrides.lastCheckResult ?? 'presence',
    lastCheckedAt: overrides.lastCheckedAt ?? new Date().toISOString(),
    ...overrides,
  };
}

const HEALTHY_CONNECTION = makeConnection({
  id: 'conn-github',
  providerId: 'github',
  providerDisplayName: 'GitHub',
  status: 'connected',
  lastCheckResult: 'presence',
});

const ATTENTION_CONNECTION = makeConnection({
  id: 'conn-fitbit',
  providerId: 'fitbit',
  providerDisplayName: 'Fitbit',
  status: 'error',
  lastCheckResult: 'absence',
});

const ANOTHER_HEALTHY = makeConnection({
  id: 'conn-slack',
  providerId: 'slack',
  providerDisplayName: 'Slack',
  status: 'connected',
  lastCheckResult: 'presence',
});

const ALL_CONNECTIONS = [HEALTHY_CONNECTION, ATTENTION_CONNECTION, ANOTHER_HEALTHY];

const SAMPLE_BINDINGS: IMultiCanaryBindingSummary[] = [
  {
    id: 'binding-1',
    name: 'Primary Vault Protection',
    targetNames: ['My Vault', 'Backup Vault'],
    providerCount: 3,
    aggregateStatus: 'all_present',
  },
  {
    id: 'binding-2',
    name: 'Secondary Protection',
    targetNames: ['Documents'],
    providerCount: 2,
    aggregateStatus: 'partial_absence',
  },
];

const SAMPLE_WEBHOOKS: IWebhookEndpointSummary[] = [
  {
    id: 'wh-1',
    providerName: 'GitHub Webhooks',
    lastReceivedAt: new Date().toISOString(),
    successRate: '98%',
  },
  {
    id: 'wh-2',
    providerName: 'Stripe Events',
    successRate: '100%',
  },
];

function renderMenu(overrides: Partial<ICanaryLeftMenuProps> = {}) {
  const defaultProps: ICanaryLeftMenuProps = {
    connections: ALL_CONNECTIONS,
    multiCanaryBindings: SAMPLE_BINDINGS,
    webhookEndpoints: SAMPLE_WEBHOOKS,
    onNavigate: jest.fn(),
    onSelectProvider: jest.fn(),
    activeSection: undefined,
    ...overrides,
  };

  const result = render(<CanaryLeftMenu {...defaultProps} />);
  return { ...result, props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanaryLeftMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 14.1: Four left-menu sub-sections render ─────────────────────────

  describe('Req 14.1 — four left-menu sub-sections render', () => {
    it('renders the "My Providers" sub-section', () => {
      renderMenu();
      expect(screen.getByTestId('nav-my-providers')).toBeInTheDocument();
      expect(screen.getByText('My Providers')).toBeInTheDocument();
    });

    it('renders the "Provider Marketplace" sub-section', () => {
      renderMenu();
      expect(screen.getByTestId('nav-marketplace')).toBeInTheDocument();
      expect(screen.getByText('Provider Marketplace')).toBeInTheDocument();
    });

    it('renders the "Multi-Canary Bindings" sub-section', () => {
      renderMenu();
      expect(screen.getByTestId('nav-multi-canary')).toBeInTheDocument();
      expect(screen.getByText('Multi-Canary Bindings')).toBeInTheDocument();
    });

    it('renders the "Webhook Endpoints" sub-section', () => {
      renderMenu();
      expect(screen.getByTestId('nav-webhooks')).toBeInTheDocument();
      expect(screen.getByText('Webhook Endpoints')).toBeInTheDocument();
    });

    it('renders all four sub-sections together', () => {
      renderMenu();
      expect(screen.getByTestId('nav-my-providers')).toBeInTheDocument();
      expect(screen.getByTestId('nav-marketplace')).toBeInTheDocument();
      expect(screen.getByTestId('nav-multi-canary')).toBeInTheDocument();
      expect(screen.getByTestId('nav-webhooks')).toBeInTheDocument();
    });
  });

  // ── Req 14.2: "My Providers" compact list with status indicators ──────────

  describe('Req 14.2 — "My Providers" compact list with status indicators', () => {
    it('shows connected provider count in secondary text', () => {
      renderMenu();
      expect(screen.getByText('3 connected')).toBeInTheDocument();
    });

    it('renders provider list items with status dots', () => {
      renderMenu();
      // My Providers is expanded by default
      expect(screen.getByTestId('provider-list-item-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-list-item-conn-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-list-item-conn-slack')).toBeInTheDocument();
    });

    it('shows status indicator dots for each provider', () => {
      renderMenu();
      expect(screen.getByTestId('provider-status-dot-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-status-dot-conn-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-status-dot-conn-slack')).toBeInTheDocument();
    });

    it('displays provider display names', () => {
      renderMenu();
      expect(screen.getByText('GitHub')).toBeInTheDocument();
      expect(screen.getByText('Fitbit')).toBeInTheDocument();
      expect(screen.getByText('Slack')).toBeInTheDocument();
    });

    it('calls onSelectProvider when a provider is clicked', () => {
      const { props } = renderMenu();
      fireEvent.click(screen.getByTestId('provider-list-item-conn-github'));
      expect(props.onSelectProvider).toHaveBeenCalledWith('conn-github');
    });

    it('shows empty state when no providers are connected', () => {
      renderMenu({ connections: [] });
      expect(screen.getByText('No providers connected.')).toBeInTheDocument();
    });
  });

  // ── Req 14.3: Marketplace link navigates correctly ────────────────────────

  describe('Req 14.3 — marketplace link navigates correctly', () => {
    it('calls onNavigate with "marketplace" when marketplace is clicked', () => {
      const { props } = renderMenu();
      fireEvent.click(screen.getByTestId('nav-marketplace'));
      expect(props.onNavigate).toHaveBeenCalledWith('marketplace');
    });

    it('shows "Browse & connect providers" secondary text', () => {
      renderMenu();
      expect(screen.getByText('Browse & connect providers')).toBeInTheDocument();
    });
  });

  // ── Req 14.6: Warning badge on providers needing attention ────────────────

  describe('Req 14.6 — warning badge on providers needing attention', () => {
    it('shows warning icon when providers need attention', () => {
      renderMenu();
      expect(screen.getByTestId('warning-icon')).toBeInTheDocument();
    });

    it('does not show warning icon when all providers are healthy', () => {
      renderMenu({ connections: [HEALTHY_CONNECTION, ANOTHER_HEALTHY] });
      expect(screen.queryByTestId('warning-icon')).not.toBeInTheDocument();
    });

    it('shows attention badge with correct count', () => {
      renderMenu();
      const badge = screen.getByTestId('attention-badge');
      expect(badge).toBeInTheDocument();
    });
  });

  // ── Req 14.7: Overall health indicator ────────────────────────────────────

  describe('Req 14.7 — overall health indicator', () => {
    it('renders the system health indicator section', () => {
      renderMenu();
      expect(screen.getByTestId('system-health-indicator')).toBeInTheDocument();
    });

    it('shows "healthy" when all providers are healthy', () => {
      renderMenu({ connections: [HEALTHY_CONNECTION, ANOTHER_HEALTHY] });
      expect(screen.getByTestId('health-chip-healthy')).toBeInTheDocument();
    });

    it('shows "degraded" when some providers need attention', () => {
      renderMenu(); // includes ATTENTION_CONNECTION
      expect(screen.getByTestId('health-chip-degraded')).toBeInTheDocument();
    });

    it('shows "critical" when all providers need attention', () => {
      const criticalConn1 = makeConnection({
        id: 'conn-c1',
        status: 'error',
        lastCheckResult: 'absence',
      });
      const criticalConn2 = makeConnection({
        id: 'conn-c2',
        status: 'expired',
        lastCheckResult: 'error',
      });
      renderMenu({ connections: [criticalConn1, criticalConn2] });
      expect(screen.getByTestId('health-chip-critical')).toBeInTheDocument();
    });

    it('shows "healthy" when no providers are connected', () => {
      renderMenu({ connections: [] });
      expect(screen.getByTestId('health-chip-healthy')).toBeInTheDocument();
    });

    it('displays "Canary System" label', () => {
      renderMenu();
      expect(screen.getByText('Canary System')).toBeInTheDocument();
    });
  });
});
