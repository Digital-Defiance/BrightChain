/**
 * Integration tests for visual UX flows — end-to-end user journeys across
 * multiple components.
 *
 * Task 19.4 — Tests the full user flow for:
 * 1. Context menu → select provider → configure → create binding
 * 2. Marketplace → connect → configure → attach to vault
 *
 * Critical UX constraint verified: NO manual ID entry anywhere — all selection
 * via dropdowns, checkboxes, visual pickers.
 *
 * Requirements: 13.1, 13.3, 11.5, 16.1
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
import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import { CanaryContextMenu } from '../../components/CanaryContextMenu';
import type { ICanaryBinding, ICanaryContextMenuProps, ICanaryContextMenuTarget } from '../../components/CanaryContextMenu';
import { CanaryProviderPage } from '../../components/CanaryProviderPage';
import type { ICanaryProviderPageProps } from '../../components/CanaryProviderPage';
import type { IApiProviderConnectionDTO, IApiTestConnectionResponseDTO } from '../../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProvider(overrides: Partial<{
  id: string;
  name: string;
  description: string;
  category: ProviderCategory;
  authType: string;
}> = {}) {
  const id = overrides.id ?? 'test-provider';
  return {
    id,
    name: overrides.name ?? 'Test Provider',
    description: overrides.description ?? 'A test provider description',
    category: overrides.category ?? ProviderCategory.DEVELOPER,
    icon: 'icon-test',
    baseUrl: 'https://api.test.com',
    auth: { type: (overrides.authType ?? 'api_key') as 'oauth2' | 'api_key' },
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

function makeConnection(overrides: Partial<IApiProviderConnectionDTO> = {}): IApiProviderConnectionDTO {
  return {
    id: overrides.id ?? 'conn-1',
    userId: 'user-1',
    providerId: overrides.providerId ?? 'github',
    status: overrides.status ?? 'connected',
    providerDisplayName: overrides.providerDisplayName ?? 'GitHub',
    providerUsername: overrides.providerUsername,
    isEnabled: true,
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
    lastCheckResult: (overrides.lastCheckResult as any) ?? 'presence',
    ...overrides,
  };
}

function createMockApiClient() {
  return {
    baseUrl: 'http://localhost/burnbag',
    getMyConnections: jest.fn().mockResolvedValue([
      makeConnection({ id: 'conn-github', providerId: 'github', providerDisplayName: 'GitHub' }),
      makeConnection({ id: 'conn-fitbit', providerId: 'fitbit', providerDisplayName: 'Fitbit' }),
    ]),
    getMultiCanaryBindings: jest.fn().mockResolvedValue([]),
    getWebhookEndpoints: jest.fn().mockResolvedValue([]),
    createMultiCanaryBinding: jest.fn().mockResolvedValue({ id: 'binding-new' }),
    deleteMultiCanaryBinding: jest.fn().mockResolvedValue(undefined),
    getMultiCanaryBindingsForTarget: jest.fn().mockResolvedValue([]),
    rotateWebhookSecret: jest.fn().mockResolvedValue({ newSecret: 'abc123' }),
    updateWebhookIpAllowlist: jest.fn().mockResolvedValue(undefined),
    sendTestWebhook: jest.fn().mockResolvedValue({ success: true, processingTimeMs: 50 }),
    getWebhookDeliveryStats: jest.fn().mockResolvedValue({
      totalReceived: 10,
      successfullyProcessed: 9,
      failedValidation: 1,
    }),
    initiateOAuth: jest.fn().mockResolvedValue({
      authorizationUrl: 'https://oauth.example.com/auth',
      state: 'state-1',
    }),
    connectWithApiKey: jest.fn().mockResolvedValue(
      makeConnection({ id: 'conn-new', providerId: 'github', providerDisplayName: 'GitHub' }),
    ),
    testConnection: jest.fn().mockResolvedValue({
      success: true,
      status: 'connected',
      responseTimeMs: 120,
      providerUserInfo: {
        userId: 'user-ext-1',
        username: 'testuser',
        displayName: 'Test User',
      },
    } as IApiTestConnectionResponseDTO),
    getProviderCatalog: jest.fn().mockResolvedValue([]),
    getRecommendedProviders: jest.fn().mockResolvedValue([]),
  } as unknown as jest.Mocked<any>;
}

const GITHUB_CONNECTION = makeConnection({
  id: 'conn-github',
  providerId: 'github-commits',
  providerDisplayName: 'GitHub',
  status: 'connected',
  lastCheckResult: 'presence',
});

const FITBIT_CONNECTION = makeConnection({
  id: 'conn-fitbit',
  providerId: 'health-fitbit',
  providerDisplayName: 'Fitbit',
  status: 'connected',
  lastCheckResult: 'presence',
});

const SLACK_CONNECTION = makeConnection({
  id: 'conn-slack',
  providerId: 'communication-slack',
  providerDisplayName: 'Slack',
  status: 'active',
  lastCheckResult: 'absence',
});

const ALL_CONNECTIONS = [GITHUB_CONNECTION, FITBIT_CONNECTION, SLACK_CONNECTION];

const DEFAULT_TARGET: ICanaryContextMenuTarget = {
  id: 'vault-1',
  name: 'My Vault',
  type: 'vault',
};

const PROVIDERS = [
  makeProvider({ id: 'github', name: 'GitHub', category: ProviderCategory.DEVELOPER, authType: 'api_key' }),
  makeProvider({ id: 'fitbit', name: 'Fitbit', category: ProviderCategory.HEALTH_FITNESS, authType: 'api_key' }),
  makeProvider({ id: 'spotify', name: 'Spotify', category: ProviderCategory.ENTERTAINMENT, authType: 'api_key' }),
];

// ---------------------------------------------------------------------------
// Flow 1: Context Menu → Select Provider → Configure → Create Binding
// ---------------------------------------------------------------------------

describe('Integration: Context Menu → Select Provider → Configure → Create Binding', () => {
  function renderContextMenu(overrides: Partial<ICanaryContextMenuProps> = {}) {
    const anchorEl = document.createElement('div');
    document.body.appendChild(anchorEl);

    const onCreateBinding = jest.fn().mockResolvedValue(undefined);
    const onClose = jest.fn();

    const defaultProps: ICanaryContextMenuProps = {
      target: DEFAULT_TARGET,
      anchorEl,
      open: true,
      onClose,
      connections: ALL_CONNECTIONS,
      existingBindings: [],
      onCreateBinding,
      onRemoveBinding: jest.fn().mockResolvedValue(undefined),
      onOpenMultiCanarySetup: jest.fn(),
      onNavigateToMarketplace: jest.fn(),
      ...overrides,
    };

    const result = render(<CanaryContextMenu {...defaultProps} />);
    return { ...result, props: defaultProps, anchorEl, onCreateBinding, onClose };
  }

  it('completes the full flow: right-click → Attach Canary → select provider → configure → attach (Req 13.1, 13.3)', async () => {
    const { onCreateBinding, onClose } = renderContextMenu();

    // Step 1: Context menu is open with "Attach Canary" visible
    expect(screen.getByTestId('canary-context-menu')).toBeInTheDocument();
    expect(screen.getByTestId('attach-canary-menu-item')).toBeInTheDocument();

    // Step 2: Click "Attach Canary" to open provider submenu
    fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
    expect(screen.getByTestId('provider-submenu')).toBeInTheDocument();

    // Step 3: Select a provider from the visual list (no ID typing)
    fireEvent.click(screen.getByTestId('provider-submenu-item-conn-github'));

    // Step 4: Binding config popover opens with visual controls
    expect(screen.getByTestId('binding-config-popover')).toBeInTheDocument();
    expect(screen.getByTestId('condition-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('action-dropdown')).toBeInTheDocument();
    expect(screen.getByTestId('threshold-slider')).toBeInTheDocument();

    // Step 5: Click "Attach" to create the binding
    fireEvent.click(screen.getByTestId('attach-button'));

    // Step 6: Verify binding was created with correct parameters
    await waitFor(() => {
      expect(onCreateBinding).toHaveBeenCalledWith(
        expect.objectContaining({
          targetId: 'vault-1',
          targetType: 'vault',
          providerConnectionId: 'conn-github',
          condition: 'ABSENCE',
          action: 'notify',
          absenceThresholdHours: 24,
        }),
      );
    });

    // Step 7: Menu closes after successful attachment
    await waitFor(() => {
      expect(onClose).toHaveBeenCalled();
    });
  });

  it('allows configuring condition via dropdown before attaching (Req 13.3)', async () => {
    const { onCreateBinding } = renderContextMenu();

    // Navigate to popover
    fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
    fireEvent.click(screen.getByTestId('provider-submenu-item-conn-fitbit'));

    // Verify popover is open
    expect(screen.getByTestId('binding-config-popover')).toBeInTheDocument();

    // Change condition to DURESS via dropdown (visual selection, no typing)
    const conditionDropdown = screen.getByTestId('condition-dropdown');
    // MUI Select: click to open, then select option
    fireEvent.mouseDown(within(conditionDropdown).getByRole('combobox'));
    const duressOption = await screen.findByText(/Duress/);
    fireEvent.click(duressOption);

    // Click Attach
    fireEvent.click(screen.getByTestId('attach-button'));

    await waitFor(() => {
      expect(onCreateBinding).toHaveBeenCalledWith(
        expect.objectContaining({
          providerConnectionId: 'conn-fitbit',
          condition: 'DURESS',
        }),
      );
    });
  });

  it('allows configuring protocol action via dropdown before attaching (Req 13.3)', async () => {
    const { onCreateBinding } = renderContextMenu();

    // Navigate to popover
    fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
    fireEvent.click(screen.getByTestId('provider-submenu-item-conn-github'));

    // Change action to "destroy" via dropdown (visual selection, no typing)
    const actionDropdown = screen.getByTestId('action-dropdown');
    fireEvent.mouseDown(within(actionDropdown).getByRole('combobox'));
    const destroyOption = await screen.findByText(/Destroy vault contents/);
    fireEvent.click(destroyOption);

    // Click Attach
    fireEvent.click(screen.getByTestId('attach-button'));

    await waitFor(() => {
      expect(onCreateBinding).toHaveBeenCalledWith(
        expect.objectContaining({
          providerConnectionId: 'conn-github',
          action: 'destroy',
        }),
      );
    });
  });

  it('verifies NO text input fields exist in the binding configuration (Req 13.3)', () => {
    renderContextMenu();

    // Navigate to popover
    fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
    fireEvent.click(screen.getByTestId('provider-submenu-item-conn-github'));

    const popover = screen.getByTestId('binding-config-popover');
    // No text inputs — all configuration is via dropdowns and sliders
    const textInputs = popover.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBe(0);
  });

  it('shows providers grouped by category in the submenu (visual selection)', () => {
    renderContextMenu();

    fireEvent.click(screen.getByTestId('attach-canary-menu-item'));

    const submenu = screen.getByTestId('provider-submenu');
    // Providers are grouped by category prefix from providerId
    expect(within(submenu).getByText('GitHub')).toBeInTheDocument();
    expect(within(submenu).getByText('Fitbit')).toBeInTheDocument();
    expect(within(submenu).getByText('Slack')).toBeInTheDocument();
  });

  it('shows binding count badge after creating a binding', () => {
    const existingBindings: ICanaryBinding[] = [
      {
        id: 'b1',
        providerId: 'github',
        providerDisplayName: 'GitHub',
        condition: 'ABSENCE',
        action: 'notify',
        absenceThresholdHours: 24,
      },
    ];

    renderContextMenu({ existingBindings });

    // Badge shows count of existing bindings
    expect(screen.getByTestId('binding-count-chip')).toHaveTextContent('1');
  });

  it('navigates to Multi-Canary Setup from context menu for advanced configuration', () => {
    const { props } = renderContextMenu();

    fireEvent.click(screen.getByTestId('multi-canary-setup-item'));

    expect(props.onOpenMultiCanarySetup).toHaveBeenCalledWith(DEFAULT_TARGET);
    expect(props.onClose).toHaveBeenCalled();
  });
});

// ---------------------------------------------------------------------------
// Flow 2: Marketplace → Connect → Configure → Attach to Vault
// ---------------------------------------------------------------------------

describe('Integration: Marketplace → Connect → Configure → Attach to Vault', () => {
  function renderPage(overrides: Partial<ICanaryProviderPageProps> = {}) {
    const apiClient = createMockApiClient();
    const defaultProps: ICanaryProviderPageProps = {
      apiClient,
      providerCatalog: PROVIDERS,
      initialSection: 'marketplace',
      ...overrides,
    };
    return {
      ...render(<CanaryProviderPage {...defaultProps} />),
      apiClient,
      props: defaultProps,
    };
  }

  it('completes the full flow: browse marketplace → click Connect → auth → test → configure → done (Req 11.5, 16.1)', async () => {
    const { apiClient } = renderPage();

    // Step 1: Marketplace is displayed with provider cards
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    // Step 2: Provider cards are visible with Connect buttons
    expect(screen.getByTestId('provider-card-github')).toBeInTheDocument();
    expect(screen.getByTestId('connect-button-github')).toBeInTheDocument();

    // Step 3: Click "Connect" on GitHub provider card
    fireEvent.click(screen.getByTestId('connect-button-github'));

    // Step 4: ActivationFlow dialog opens
    await waitFor(() => {
      expect(screen.getByTestId('activation-flow-dialog')).toBeInTheDocument();
    });

    // Step 5: ActivationFlow shows auth step
    expect(screen.getByTestId('activation-flow')).toBeInTheDocument();
    expect(screen.getByTestId('auth-step')).toBeInTheDocument();

    // Step 6: Enter API key and connect (API key auth for this provider)
    const apiKeyInput = screen.getByTestId('api-key-input');
    fireEvent.change(apiKeyInput, { target: { value: 'test-api-key-12345' } });
    fireEvent.click(screen.getByTestId('api-key-connect-button'));

    // Step 7: After auth success, test step appears
    await waitFor(() => {
      expect(apiClient.connectWithApiKey).toHaveBeenCalledWith('github', 'test-api-key-12345');
      expect(screen.getByTestId('test-step')).toBeInTheDocument();
    });

    // Step 8: Click "Test Connection"
    fireEvent.click(screen.getByTestId('test-connection-button'));

    // Step 9: Test succeeds, continue button appears
    await waitFor(() => {
      expect(apiClient.testConnection).toHaveBeenCalled();
      expect(screen.getByTestId('test-result')).toBeInTheDocument();
      expect(screen.getByTestId('continue-after-test-button')).toBeInTheDocument();
    });

    // Step 10: Click continue to go to configure step
    fireEvent.click(screen.getByTestId('continue-after-test-button'));

    // Step 11: Configure step shows visual controls (slider, dropdown — no text input for IDs)
    await waitFor(() => {
      expect(screen.getByTestId('configure-step')).toBeInTheDocument();
    });
    expect(screen.getByTestId('absence-threshold-slider')).toBeInTheDocument();
    expect(screen.getByTestId('multi-canary-option')).toBeInTheDocument();

    // Step 12: Click "Finish" to complete activation
    fireEvent.click(screen.getByTestId('finish-button'));

    // Step 13: Activation completes — dialog closes and connections are refetched
    await waitFor(() => {
      expect(apiClient.getMyConnections).toHaveBeenCalledTimes(2);
    });
  });

  it('ActivationFlow wizard shows stepper with correct steps (Req 16.1)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('connect-button-github'));

    await waitFor(() => {
      expect(screen.getByTestId('activation-stepper')).toBeInTheDocument();
    });

    // Verify all 4 steps are shown in the stepper
    expect(screen.getByText('Authentication')).toBeInTheDocument();
    expect(screen.getByText('Test Connection')).toBeInTheDocument();
    expect(screen.getByText('Configure')).toBeInTheDocument();
    expect(screen.getByText('Done')).toBeInTheDocument();
  });

  it('configure step uses visual controls only — no manual ID entry (Req 13.3, 16.1)', async () => {
    const { apiClient } = renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    // Navigate through auth and test steps
    fireEvent.click(screen.getByTestId('connect-button-github'));
    await waitFor(() => {
      expect(screen.getByTestId('auth-step')).toBeInTheDocument();
    });

    fireEvent.change(screen.getByTestId('api-key-input'), { target: { value: 'key123' } });
    fireEvent.click(screen.getByTestId('api-key-connect-button'));

    await waitFor(() => {
      expect(screen.getByTestId('test-step')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('test-connection-button'));
    await waitFor(() => {
      expect(screen.getByTestId('continue-after-test-button')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('continue-after-test-button'));

    // Now on configure step
    await waitFor(() => {
      expect(screen.getByTestId('configure-step')).toBeInTheDocument();
    });

    // Verify visual controls: slider for threshold, dropdown for multi-canary
    expect(screen.getByTestId('absence-threshold-slider')).toBeInTheDocument();
    expect(screen.getByTestId('multi-canary-option')).toBeInTheDocument();

    // Verify no text inputs for IDs or manual configuration
    const configStep = screen.getByTestId('configure-step');
    const textInputs = configStep.querySelectorAll('input[type="text"]');
    expect(textInputs.length).toBe(0);
  });

  it('marketplace shows provider cards with visual information (Req 11.5)', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    // Each provider card shows name, description, category, and connect button
    const githubCard = screen.getByTestId('provider-card-github');
    expect(within(githubCard).getByTestId('provider-name-github')).toHaveTextContent('GitHub');
    expect(within(githubCard).getByTestId('provider-description-github')).toBeInTheDocument();
    expect(within(githubCard).getByTestId('category-badge-github')).toBeInTheDocument();
    expect(within(githubCard).getByTestId('connect-button-github')).toBeInTheDocument();
  });

  it('can cancel activation flow at any step', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByTestId('connect-button-github'));

    await waitFor(() => {
      expect(screen.getByTestId('activation-flow-dialog')).toBeInTheDocument();
    });

    // Cancel via the close button
    fireEvent.click(screen.getByTestId('activation-flow-close'));

    await waitFor(() => {
      expect(screen.queryByTestId('activation-flow-dialog')).not.toBeInTheDocument();
    });
  });

  it('marketplace search filters providers visually without manual ID entry', async () => {
    renderPage();

    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    // Search for "Fitbit" using the search input
    const searchInput = screen.getByTestId('marketplace-search-input');
    fireEvent.change(searchInput, { target: { value: 'Fitbit' } });

    // Only Fitbit should be visible
    await waitFor(() => {
      expect(screen.getByTestId('provider-card-fitbit')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-github')).not.toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-spotify')).not.toBeInTheDocument();
    });
  });

  it('shows connected badge on already-connected providers (Req 11.5)', async () => {
    renderPage();

    // Wait for connections to load and marketplace to render with connected state
    await waitFor(() => {
      expect(screen.getByTestId('provider-marketplace')).toBeInTheDocument();
    });

    // GitHub and Fitbit are in the connections mock, so they should show connected badge
    // Need to wait for async connections fetch to complete and re-render
    await waitFor(() => {
      expect(screen.getByTestId('connected-badge-github')).toBeInTheDocument();
    });
    expect(screen.getByTestId('connected-badge-fitbit')).toBeInTheDocument();
    // Spotify is not connected
    expect(screen.queryByTestId('connected-badge-spotify')).not.toBeInTheDocument();
  });
});
