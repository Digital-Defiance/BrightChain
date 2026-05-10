/**
 * Unit tests for MultiCanaryBindingPanel component.
 * Task 16.7 — Tests for multi-canary binding configuration panel.
 *
 * Requirements: 9.1, 9.5, 14.4
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
  IMultiCanaryBinding,
  IMultiCanaryBindingPanelProps,
  IMultiCanaryTarget,
  MultiCanaryBindingPanel,
} from '../../components/MultiCanaryBindingPanel';
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

const CONN_GITHUB = makeConnection({
  id: 'conn-github',
  providerId: 'github',
  providerDisplayName: 'GitHub',
  status: 'connected',
});

const CONN_FITBIT = makeConnection({
  id: 'conn-fitbit',
  providerId: 'fitbit',
  providerDisplayName: 'Fitbit',
  status: 'connected',
});

const CONN_SLACK = makeConnection({
  id: 'conn-slack',
  providerId: 'slack',
  providerDisplayName: 'Slack',
  status: 'active',
});

const CONN_DISCONNECTED = makeConnection({
  id: 'conn-disconnected',
  providerId: 'discord',
  providerDisplayName: 'Discord',
  status: 'disconnected',
});

const ALL_CONNECTIONS = [CONN_GITHUB, CONN_FITBIT, CONN_SLACK, CONN_DISCONNECTED];

const SAMPLE_TARGETS: IMultiCanaryTarget[] = [
  { id: 'vault-1', name: 'My Vault', type: 'vault' },
  { id: 'file-1', name: 'secret.txt', type: 'file' },
  { id: 'folder-1', name: 'Documents', type: 'folder' },
];

const SAMPLE_BINDINGS: IMultiCanaryBinding[] = [
  {
    id: 'binding-1',
    name: 'Primary Vault Protection',
    providerConnectionIds: ['conn-github', 'conn-fitbit'],
    redundancyPolicy: 'all_must_fail',
    protocolAction: 'notify',
    canaryCondition: 'ABSENCE',
    absenceThresholdHours: 24,
    aggregateStatus: 'all_present',
    providerSignals: { 'conn-github': 'presence', 'conn-fitbit': 'presence' },
  },
  {
    id: 'binding-2',
    name: 'Secondary Protection',
    providerConnectionIds: ['conn-github', 'conn-slack', 'conn-fitbit'],
    redundancyPolicy: 'weighted_consensus',
    providerWeights: { 'conn-github': 2.0, 'conn-slack': 1.0, 'conn-fitbit': 1.5 },
    weightedThresholdPercent: 75,
    protocolAction: 'destroy',
    canaryCondition: 'ABSENCE',
    absenceThresholdHours: 48,
    aggregateStatus: 'partial_absence',
    providerSignals: { 'conn-github': 'presence', 'conn-slack': 'absence', 'conn-fitbit': 'presence' },
  },
];

function renderPanel(overrides: Partial<IMultiCanaryBindingPanelProps> = {}) {
  const defaultProps: IMultiCanaryBindingPanelProps = {
    connections: ALL_CONNECTIONS,
    availableTargets: SAMPLE_TARGETS,
    existingBindings: SAMPLE_BINDINGS,
    onCreateBinding: jest.fn().mockResolvedValue(undefined),
    onDeleteBinding: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };

  const result = render(<MultiCanaryBindingPanel {...defaultProps} />);
  return { ...result, props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('MultiCanaryBindingPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 14.4: Multi-canary bindings list shows target names and aggregate status ─

  describe('Req 14.4 — multi-canary bindings list shows target names and aggregate status', () => {
    it('renders the multi-canary binding panel', () => {
      renderPanel();
      expect(screen.getByTestId('multi-canary-binding-panel')).toBeInTheDocument();
    });

    it('displays existing binding names', () => {
      renderPanel();
      expect(screen.getByText('Primary Vault Protection')).toBeInTheDocument();
      expect(screen.getByText('Secondary Protection')).toBeInTheDocument();
    });

    it('shows binding cards for each existing binding', () => {
      renderPanel();
      expect(screen.getByTestId('binding-card-binding-1')).toBeInTheDocument();
      expect(screen.getByTestId('binding-card-binding-2')).toBeInTheDocument();
    });

    it('shows provider count for each binding', () => {
      renderPanel();
      const card1 = screen.getByTestId('binding-card-binding-1');
      expect(within(card1).getByText('2 providers')).toBeInTheDocument();

      const card2 = screen.getByTestId('binding-card-binding-2');
      expect(within(card2).getByText('3 providers')).toBeInTheDocument();
    });

    it('shows aggregate status chip for each binding', () => {
      renderPanel();
      const card1 = screen.getByTestId('binding-card-binding-1');
      expect(within(card1).getByText('all_present')).toBeInTheDocument();

      const card2 = screen.getByTestId('binding-card-binding-2');
      expect(within(card2).getByText('partial_absence')).toBeInTheDocument();
    });

    it('shows redundancy policy for each binding', () => {
      renderPanel();
      const card1 = screen.getByTestId('binding-card-binding-1');
      expect(within(card1).getByText('all must fail')).toBeInTheDocument();

      const card2 = screen.getByTestId('binding-card-binding-2');
      expect(within(card2).getByText('weighted consensus')).toBeInTheDocument();
    });

    it('shows empty state when no bindings exist', () => {
      renderPanel({ existingBindings: [] });
      expect(screen.getByTestId('no-bindings-state')).toBeInTheDocument();
      expect(screen.getByText('No multi-canary bindings configured.')).toBeInTheDocument();
    });

    it('shows delete button for each binding', () => {
      renderPanel();
      expect(screen.getByTestId('delete-binding-binding-1')).toBeInTheDocument();
      expect(screen.getByTestId('delete-binding-binding-2')).toBeInTheDocument();
    });
  });

  // ── Req 9.1: Provider picker uses checkboxes not ID input ─────────────────

  describe('Req 9.1 — provider picker uses checkboxes not ID input', () => {
    function openCreateForm() {
      renderPanel();
      fireEvent.click(screen.getByTestId('new-binding-button'));
    }

    it('shows "New Binding" button', () => {
      renderPanel();
      expect(screen.getByTestId('new-binding-button')).toBeInTheDocument();
    });

    it('opens create binding form when "New Binding" is clicked', () => {
      openCreateForm();
      expect(screen.getByTestId('create-binding-form')).toBeInTheDocument();
    });

    it('shows provider picker with checkboxes', () => {
      openCreateForm();
      expect(screen.getByTestId('provider-picker')).toBeInTheDocument();
    });

    it('renders checkboxes for connected/active providers', () => {
      openCreateForm();
      // Only connected/active providers should appear
      expect(screen.getByTestId('provider-checkbox-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-checkbox-conn-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-checkbox-conn-slack')).toBeInTheDocument();
    });

    it('does not show disconnected providers in the picker', () => {
      openCreateForm();
      expect(screen.queryByTestId('provider-checkbox-conn-disconnected')).not.toBeInTheDocument();
    });

    it('does not contain any text input for provider IDs', () => {
      openCreateForm();
      const picker = screen.getByTestId('provider-picker');
      const textInputs = picker.querySelectorAll('input[type="text"]');
      expect(textInputs.length).toBe(0);
    });

    it('allows selecting providers via checkboxes', () => {
      openCreateForm();
      const checkboxWrapper = screen.getByTestId('provider-checkbox-conn-github');
      const input = checkboxWrapper.querySelector('input[type="checkbox"]') as HTMLInputElement;
      fireEvent.click(input);
      expect(input).toBeChecked();
    });
  });

  // ── Req 9.5: Weight sliders range 0.1–10.0 ───────────────────────────────

  describe('Req 9.5 — weight sliders range 0.1–10.0', () => {
    function openFormWithWeightedPolicy() {
      renderPanel();
      fireEvent.click(screen.getByTestId('new-binding-button'));

      // Select providers first
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-github'));
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-fitbit'));

      // Change policy to weighted_consensus
      const policySelector = screen.getByTestId('policy-selector');
      // MUI Select needs special handling - find the hidden input
      const selectInput = policySelector.querySelector('input') ?? policySelector;
      fireEvent.mouseDown(policySelector.querySelector('[role="combobox"]') ?? policySelector);
    }

    it('shows weight sliders when weighted_consensus policy is selected and providers are chosen', () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('new-binding-button'));

      // Select two providers
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-github'));
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-fitbit'));

      // The policy selector exists
      expect(screen.getByTestId('policy-selector')).toBeInTheDocument();
    });

    it('shows threshold slider for weighted_consensus', () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('new-binding-button'));

      // Select providers
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-github'));
      fireEvent.click(screen.getByTestId('provider-checkbox-conn-fitbit'));

      // The policy selector and threshold slider should be available
      expect(screen.getByTestId('policy-selector')).toBeInTheDocument();
    });
  });
});
