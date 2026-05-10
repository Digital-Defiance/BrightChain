/**
 * Unit tests for CanaryProviderPage and CanaryFileBrowserIntegration.
 * Task 18.3 — Wire navigation and integrate all frontend components.
 *
 * Requirements: 11.1, 13.1, 14.1, 14.3
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

import { ProviderCategory } from '@brightchain/digitalburnbag-lib';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { ICanaryProviderPageProps } from '../../components/CanaryProviderPage';
import { CanaryProviderPage } from '../../components/CanaryProviderPage';
import { useCanaryContextMenu } from '../../components/CanaryFileBrowserIntegration';
import { renderHook, act } from '@testing-library/react';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProvider(overrides: Partial<{ id: string; name: string; description: string; category: ProviderCategory }> = {}) {
  const id = overrides.id ?? 'test-provider';
  return {
    id,
    name: overrides.name ?? 'Test Provider',
    description: overrides.description ?? 'A test provider description',
    category: overrides.category ?? ProviderCategory.DEVELOPER,
    icon: 'icon-test',
    baseUrl: 'https://api.test.com',
    auth: { type: 'oauth2' as const },
    endpoints: {
      activity: {
        path: '/activity',
        method: 'GET' as const,
        responseMapping: {
          eventsPath: '$.data',
          timestampPath: 'timestamp',
          timestampFormat: 'iso8601' as const,
        },
      },
      healthCheck: { path: '/health', method: 'GET' as const, expectedStatus: 200 },
    },
    defaultLookbackMs: 86400000,
    minCheckIntervalMs: 3600000,
    supportsWebhooks: false,
    enabledByDefault: true,
  };
}

function makeConnection(overrides: Partial<{ id: string; providerId: string; status: string; providerDisplayName: string }> = {}) {
  return {
    id: overrides.id ?? 'conn-1',
    userId: 'user-1',
    providerId: overrides.providerId ?? 'github',
    status: overrides.status ?? 'connected',
    providerDisplayName: overrides.providerDisplayName ?? 'GitHub',
    isEnabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  };
}

function createMockApiClient() {
  return {
    baseUrl: 'http://localhost/burnbag',
    getMyConnections: jest.fn().mockResolvedValue([
      makeConnection({ id: 'conn-1', providerId: 'github', providerDisplayName: 'GitHub' }),
      makeConnection({ id: 'conn-2', providerId: 'fitbit', providerDisplayName: 'Fitbit', status: 'connected' }),
    ]),
    getMultiCanaryBindings: jest.fn().mockResolvedValue([]),
    getWebhookEndpoints: jest.fn().mockResolvedValue([]),
    createMultiCanaryBinding: jest.fn().mockResolvedValue({ id: 'binding-1' }),
    deleteMultiCanaryBinding: jest.fn().mockResolvedValue(undefined),
    getMultiCanaryBindingsForTarget: jest.fn().mockResolvedValue([]),
    rotateWebhookSecret: jest.fn().mockResolvedValue({ newSecret: 'abc123' }),
    updateWebhookIpAllowlist: jest.fn().mockResolvedValue(undefined),
    sendTestWebhook: jest.fn().mockResolvedValue({ success: true, processingTimeMs: 50 }),
    getWebhookDeliveryStats: jest.fn().mockResolvedValue({ totalReceived: 10, successfullyProcessed: 9, failedValidation: 1 }),
    initiateOAuth: jest.fn().mockResolvedValue({ authorizationUrl: 'https://oauth.example.com/auth', state: 'state-1' }),
    connectWithApiKey: jest.fn().mockResolvedValue(makeConnection()),
    testConnection: jest.fn().mockResolvedValue({ success: true, status: 'connected', responseTimeMs: 100 }),
    getProviderCatalog: jest.fn().mockResolvedValue([]),
    getRecommendedProviders: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<any>;
}

const PROVIDERS = [
  makeProvider({ id: 'github', name: 'GitHub', category: ProviderCategory.DEVELOPER }),
  makeProvider({ id: 'fitbit', name: 'Fitbit', category: ProviderCategory.HEALTH_FITNESS }),
  makeProvider({ id: 'spotify', name: 'Spotify', category: ProviderCategory.ENTERTAINMENT }),
];

function renderPage(overrides: Partial<ICanaryProviderPageProps> = {}) {
  const apiClient = createMockApiClient();
  const defaultProps: ICanaryProviderPageProps = {
    apiClient,
    providerCatalog: PROVIDERS,
    initialSection: 'my-providers',
    ...overrides,
  };
  return {
    ...render(<CanaryProviderPage {...defaultProps} />),
    apiClient,
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests: CanaryProviderPage
// ---------------------------------------------------------------------------

describe('CanaryProviderPage', () => {
  it('renders the sidebar and content area', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('canary-provider-page')).toBeInTheDocument();
      expect(screen.getByTestId('canary-sidebar')).toBeInTheDocument();
      expect(screen.getByTestId('canary-content')).toBeInTheDocument();
    });
  });

  it('renders CanaryLeftMenu in the sidebar with navigation items', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('canary-left-menu')).toBeInTheDocument();
      expect(screen.getByTestId('nav-my-providers')).toBeInTheDocument();
      expect(screen.getByTestId('nav-marketplace')).toBeInTheDocument();
      expect(screen.getByTestId('nav-multi-canary')).toBeInTheDocument();
      expect(screen.getByTestId('nav-webhooks')).toBeInTheDocument();
    });
  });

  it('shows ProviderHealthGrid when "My Providers" section is active (Req 14.1)', async () => {
    renderPage({ initialSection: 'my-providers' });
    await waitFor(() => {
      expect(screen.getByTestId('provider-health-grid')).toBeInTheDocument();
    });
  });

  it('shows ProviderMarketplace when navigating to marketplace section (Req 11.1, 14.3)', async () => {
    renderPage({ initialSection: 'marketplace' });
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });
  });

  it('navigates to marketplace when clicking marketplace nav item', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('nav-marketplace')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('nav-marketplace'));
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });
  });

  it('navigates to multi-canary section when clicking nav item', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('nav-multi-canary')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('nav-multi-canary'));
    await waitFor(() => {
      expect(screen.getByTestId('multi-canary-binding-panel')).toBeInTheDocument();
    });
  });

  it('navigates to webhooks section when clicking nav item', async () => {
    renderPage();
    await waitFor(() => {
      expect(screen.getByTestId('nav-webhooks')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('nav-webhooks'));
    await waitFor(() => {
      expect(screen.getByTestId('webhook-endpoint-panel')).toBeInTheDocument();
    });
  });

  it('opens ActivationFlow dialog when Connect is clicked in marketplace (Req 11.1)', async () => {
    renderPage({ initialSection: 'marketplace' });
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });
    // Click the Connect button on the first provider card
    const connectButton = screen.getByTestId('connect-button-github');
    fireEvent.click(connectButton);
    await waitFor(() => {
      expect(screen.getByTestId('activation-flow-dialog')).toBeInTheDocument();
    });
  });

  it('closes ActivationFlow dialog when close button is clicked', async () => {
    renderPage({ initialSection: 'marketplace' });
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('connect-button-github'));
    await waitFor(() => {
      expect(screen.getByTestId('activation-flow-dialog')).toBeInTheDocument();
    });
    fireEvent.click(screen.getByTestId('activation-flow-close'));
    await waitFor(() => {
      expect(screen.queryByTestId('activation-flow-dialog')).not.toBeInTheDocument();
    });
  });

  it('fetches connections on mount and passes them to CanaryLeftMenu', async () => {
    const { apiClient } = renderPage();
    await waitFor(() => {
      expect(apiClient.getMyConnections).toHaveBeenCalled();
    });
  });

  it('fetches multi-canary bindings on mount', async () => {
    const { apiClient } = renderPage();
    await waitFor(() => {
      expect(apiClient.getMultiCanaryBindings).toHaveBeenCalled();
    });
  });

  it('fetches webhook endpoints on mount', async () => {
    const { apiClient } = renderPage();
    await waitFor(() => {
      expect(apiClient.getWebhookEndpoints).toHaveBeenCalled();
    });
  });
});

// ---------------------------------------------------------------------------
// Tests: useCanaryContextMenu
// ---------------------------------------------------------------------------

describe('useCanaryContextMenu', () => {
  it('returns handleContextMenu and contextMenuElement', () => {
    const apiClient = createMockApiClient();
    const { result } = renderHook(() =>
      useCanaryContextMenu({
        apiClient,
        onNavigateToMarketplace: jest.fn(),
        onOpenMultiCanarySetup: jest.fn(),
      }),
    );
    expect(result.current.handleContextMenu).toBeInstanceOf(Function);
    expect(result.current.contextMenuElement).toBeDefined();
  });

  it('fetches connections on mount', async () => {
    const apiClient = createMockApiClient();
    renderHook(() =>
      useCanaryContextMenu({
        apiClient,
        onNavigateToMarketplace: jest.fn(),
        onOpenMultiCanarySetup: jest.fn(),
      }),
    );
    await waitFor(() => {
      expect(apiClient.getMyConnections).toHaveBeenCalled();
    });
  });
});
