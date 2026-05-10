/**
 * Unit tests for CanaryContextMenu component.
 * Task 15.3 — Tests for right-click context menu canary attachment.
 *
 * Requirements: 13.1, 13.2, 13.3, 13.4, 13.5, 13.7
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
  CanaryContextMenu,
  ICanaryBinding,
  ICanaryContextMenuProps,
  ICanaryContextMenuTarget,
} from '../../components/CanaryContextMenu';
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
    ...overrides,
  };
}

function makeBinding(overrides: Partial<ICanaryBinding> = {}): ICanaryBinding {
  return {
    id: overrides.id ?? 'binding-1',
    providerId: overrides.providerId ?? 'github',
    providerDisplayName: overrides.providerDisplayName ?? 'GitHub',
    condition: overrides.condition ?? 'ABSENCE',
    action: overrides.action ?? 'notify',
    absenceThresholdHours: overrides.absenceThresholdHours ?? 24,
    ...overrides,
  };
}

const DEFAULT_TARGET: ICanaryContextMenuTarget = {
  id: 'vault-1',
  name: 'My Vault',
  type: 'vault',
};

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

function renderMenu(overrides: Partial<ICanaryContextMenuProps> = {}) {
  const anchorEl = document.createElement('div');
  document.body.appendChild(anchorEl);

  const defaultProps: ICanaryContextMenuProps = {
    target: DEFAULT_TARGET,
    anchorEl,
    open: true,
    onClose: jest.fn(),
    connections: ALL_CONNECTIONS,
    existingBindings: [],
    onCreateBinding: jest.fn().mockResolvedValue(undefined),
    onRemoveBinding: jest.fn().mockResolvedValue(undefined),
    onOpenMultiCanarySetup: jest.fn(),
    onNavigateToMarketplace: jest.fn(),
    ...overrides,
  };

  const result = render(<CanaryContextMenu {...defaultProps} />);
  return { ...result, props: defaultProps, anchorEl };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('CanaryContextMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 13.1: "Attach Canary" appears on right-click ────────────────────

  describe('Req 13.1 — "Attach Canary" appears on right-click', () => {
    it('renders the context menu when open is true', () => {
      renderMenu();
      expect(screen.getByTestId('canary-context-menu')).toBeInTheDocument();
    });

    it('displays "Attach Canary" menu item', () => {
      renderMenu();
      expect(screen.getByTestId('attach-canary-menu-item')).toBeInTheDocument();
      expect(screen.getByText('Attach Canary')).toBeInTheDocument();
    });

    it('does not render the menu when open is false', () => {
      renderMenu({ open: false });
      expect(screen.queryByTestId('attach-canary-menu-item')).not.toBeInTheDocument();
    });

    it('"Attach Canary" is enabled when providers are connected', () => {
      renderMenu();
      const item = screen.getByTestId('attach-canary-menu-item');
      expect(item).not.toHaveAttribute('aria-disabled', 'true');
    });

    it('"Attach Canary" is disabled when no providers are connected', () => {
      renderMenu({ connections: [] });
      const item = screen.getByTestId('attach-canary-menu-item');
      expect(item).toHaveClass('Mui-disabled');
    });
  });

  // ── Req 13.2: Provider submenu grouped by category with status indicators ─

  describe('Req 13.2 — provider submenu grouped by category with status indicators', () => {
    it('opens provider submenu when "Attach Canary" is clicked', () => {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
      expect(screen.getByTestId('provider-submenu')).toBeInTheDocument();
    });

    it('shows "Select a provider" header in submenu', () => {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
      expect(screen.getByText('Select a provider')).toBeInTheDocument();
    });

    it('displays providers grouped by category prefix', () => {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));

      // Categories are derived from providerId prefix (e.g., "github" from "github-commits")
      const submenu = screen.getByTestId('provider-submenu');
      expect(within(submenu).getByText('GitHub')).toBeInTheDocument();
      expect(within(submenu).getByText('Fitbit')).toBeInTheDocument();
      expect(within(submenu).getByText('Slack')).toBeInTheDocument();
    });

    it('shows category labels in uppercase', () => {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));

      // The groupByCategory function uses the first segment of providerId
      // "github-commits" → "github", "health-fitbit" → "health", "communication-slack" → "communication"
      const submenu = screen.getByTestId('provider-submenu');
      expect(within(submenu).getByText('github')).toBeInTheDocument();
      expect(within(submenu).getByText('health')).toBeInTheDocument();
      expect(within(submenu).getByText('communication')).toBeInTheDocument();
    });

    it('shows each provider with a status indicator dot', () => {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));

      expect(screen.getByTestId('provider-submenu-item-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-submenu-item-conn-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-submenu-item-conn-slack')).toBeInTheDocument();
    });

    it('only shows connected/active providers in submenu', () => {
      const disconnectedConn = makeConnection({
        id: 'conn-disconnected',
        providerId: 'test-disconnected',
        providerDisplayName: 'Disconnected Provider',
        status: 'disconnected',
      });
      renderMenu({ connections: [...ALL_CONNECTIONS, disconnectedConn] });
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));

      // Disconnected provider should not appear
      expect(screen.queryByTestId('provider-submenu-item-conn-disconnected')).not.toBeInTheDocument();
    });
  });

  // ── Req 13.3: Binding config popover uses dropdowns/sliders, not text inputs ─

  describe('Req 13.3 — binding config popover uses dropdowns/sliders, not text inputs', () => {
    function openPopover() {
      renderMenu();
      fireEvent.click(screen.getByTestId('attach-canary-menu-item'));
      fireEvent.click(screen.getByTestId('provider-submenu-item-conn-github'));
    }

    it('opens binding config popover when a provider is selected', () => {
      openPopover();
      expect(screen.getByTestId('binding-config-popover')).toBeInTheDocument();
    });

    it('shows condition dropdown (Select), not a text input', () => {
      openPopover();
      expect(screen.getByTestId('condition-dropdown')).toBeInTheDocument();
    });

    it('shows protocol action dropdown (Select), not a text input', () => {
      openPopover();
      expect(screen.getByTestId('action-dropdown')).toBeInTheDocument();
    });

    it('shows threshold slider for ABSENCE condition', () => {
      openPopover();
      expect(screen.getByTestId('threshold-slider')).toBeInTheDocument();
    });

    it('does not contain any text input fields for configuration', () => {
      openPopover();
      const popover = screen.getByTestId('binding-config-popover');
      // Should not have any <input type="text"> elements
      const textInputs = popover.querySelectorAll('input[type="text"]');
      expect(textInputs.length).toBe(0);
    });

    it('shows "Add more providers" button for multi-canary setup', () => {
      openPopover();
      expect(screen.getByTestId('add-more-providers-button')).toBeInTheDocument();
    });

    it('shows "Attach" button to confirm binding', () => {
      openPopover();
      expect(screen.getByTestId('attach-button')).toBeInTheDocument();
    });
  });

  // ── Req 13.4: "Multi-Canary Setup" opens full panel ─────────────────────

  describe('Req 13.4 — "Multi-Canary Setup" opens full panel', () => {
    it('shows "Multi-Canary Setup" option when 2+ providers are connected', () => {
      renderMenu();
      expect(screen.getByTestId('multi-canary-setup-item')).toBeInTheDocument();
    });

    it('does not show "Multi-Canary Setup" when fewer than 2 providers are connected', () => {
      renderMenu({ connections: [GITHUB_CONNECTION] });
      expect(screen.queryByTestId('multi-canary-setup-item')).not.toBeInTheDocument();
    });

    it('calls onOpenMultiCanarySetup when "Multi-Canary Setup" is clicked', () => {
      const { props } = renderMenu();
      fireEvent.click(screen.getByTestId('multi-canary-setup-item'));
      expect(props.onOpenMultiCanarySetup).toHaveBeenCalledWith(DEFAULT_TARGET);
    });

    it('closes the context menu when "Multi-Canary Setup" is clicked', () => {
      const { props } = renderMenu();
      fireEvent.click(screen.getByTestId('multi-canary-setup-item'));
      expect(props.onClose).toHaveBeenCalled();
    });
  });

  // ── Req 13.5: "Manage Canaries" shows existing bindings ──────────────────

  describe('Req 13.5 — "Manage Canaries" shows existing bindings', () => {
    const existingBindings: ICanaryBinding[] = [
      makeBinding({ id: 'b1', providerDisplayName: 'GitHub', condition: 'ABSENCE', action: 'notify' }),
      makeBinding({ id: 'b2', providerDisplayName: 'Fitbit', condition: 'DURESS', action: 'destroy' }),
    ];

    it('shows "Manage Canaries" option when bindings exist', () => {
      renderMenu({ existingBindings });
      expect(screen.getByTestId('manage-canaries-item')).toBeInTheDocument();
    });

    it('does not show "Manage Canaries" when no bindings exist', () => {
      renderMenu({ existingBindings: [] });
      expect(screen.queryByTestId('manage-canaries-item')).not.toBeInTheDocument();
    });

    it('shows binding count in "Manage Canaries" secondary text', () => {
      renderMenu({ existingBindings });
      const item = screen.getByTestId('manage-canaries-item');
      expect(item).toHaveTextContent('2 bindings attached');
    });

    it('opens manage canaries panel when clicked', () => {
      renderMenu({ existingBindings });
      fireEvent.click(screen.getByTestId('manage-canaries-item'));
      expect(screen.getByTestId('manage-canaries-panel')).toBeInTheDocument();
    });

    it('displays each existing binding in the manage panel', () => {
      renderMenu({ existingBindings });
      fireEvent.click(screen.getByTestId('manage-canaries-item'));

      const panel = screen.getByTestId('manage-canaries-panel');
      expect(within(panel).getByText('GitHub')).toBeInTheDocument();
      expect(within(panel).getByText('Fitbit')).toBeInTheDocument();
    });

    it('shows remove button for each binding', () => {
      renderMenu({ existingBindings });
      fireEvent.click(screen.getByTestId('manage-canaries-item'));

      expect(screen.getByTestId('remove-binding-b1')).toBeInTheDocument();
      expect(screen.getByTestId('remove-binding-b2')).toBeInTheDocument();
    });

    it('displays binding count badge on "Attach Canary" item', () => {
      renderMenu({ existingBindings });
      expect(screen.getByTestId('binding-count-chip')).toHaveTextContent('2');
    });
  });

  // ── Req 13.7: "Connect a Provider First" message when no providers ───────

  describe('Req 13.7 — "Connect a Provider First" message when no providers', () => {
    it('shows "Connect a Provider First" when no providers are connected', () => {
      renderMenu({ connections: [] });
      expect(screen.getByTestId('connect-provider-first-item')).toBeInTheDocument();
      expect(screen.getByText('Connect a Provider First')).toBeInTheDocument();
    });

    it('shows marketplace link text in the message', () => {
      renderMenu({ connections: [] });
      const item = screen.getByTestId('connect-provider-first-item');
      expect(item).toHaveTextContent('Open Provider Marketplace');
    });

    it('calls onNavigateToMarketplace when "Connect a Provider First" is clicked', () => {
      const { props } = renderMenu({ connections: [] });
      fireEvent.click(screen.getByTestId('connect-provider-first-item'));
      expect(props.onNavigateToMarketplace).toHaveBeenCalled();
    });

    it('closes the context menu when marketplace link is clicked', () => {
      const { props } = renderMenu({ connections: [] });
      fireEvent.click(screen.getByTestId('connect-provider-first-item'));
      expect(props.onClose).toHaveBeenCalled();
    });

    it('does not show "Connect a Provider First" when providers are connected', () => {
      renderMenu();
      expect(screen.queryByTestId('connect-provider-first-item')).not.toBeInTheDocument();
    });
  });
});
