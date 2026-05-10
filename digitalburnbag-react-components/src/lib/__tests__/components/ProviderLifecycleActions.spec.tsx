/**
 * Unit tests for ProviderLifecycleActions component.
 * Task 18.2 — Tests for provider pause/disconnect lifecycle.
 *
 * Requirements: 16.2, 16.3, 16.5, 16.6
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import {
  IDisconnectImpactReport,
  IProviderLifecycleActionsProps,
  IProviderLifecycleConnection,
  ProviderLifecycleActions,
  shouldShowBelowMinimumWarning,
  shouldShowDisconnectWarning,
} from '../../components/ProviderLifecycleActions';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeConnection(
  overrides: Partial<IProviderLifecycleConnection> = {},
): IProviderLifecycleConnection {
  return {
    id: 'conn-1',
    providerId: 'github',
    providerDisplayName: 'GitHub',
    isPaused: false,
    ...overrides,
  };
}

function makeImpactReport(
  overrides: Partial<IDisconnectImpactReport> = {},
): IDisconnectImpactReport {
  return {
    affectedBindings: [],
    bindingsReducedBelowMinimum: [],
    bindingsStillValid: [],
    ...overrides,
  };
}

function renderComponent(overrides: Partial<IProviderLifecycleActionsProps> = {}) {
  const defaultProps: IProviderLifecycleActionsProps = {
    connection: makeConnection(),
    onPause: jest.fn().mockResolvedValue(undefined),
    onResume: jest.fn().mockResolvedValue(undefined),
    onGetDisconnectImpact: jest.fn().mockResolvedValue(makeImpactReport()),
    onDisconnect: jest.fn().mockResolvedValue(undefined),
    ...overrides,
  };
  return {
    ...render(<ProviderLifecycleActions {...defaultProps} />),
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProviderLifecycleActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Pause / Resume (Req 16.2) ──────────────────────────────────────────

  describe('Pause/Resume', () => {
    it('shows Pause button when provider is active', () => {
      renderComponent();
      expect(screen.getByTestId('pause-button')).toBeInTheDocument();
      expect(screen.getByText('Pause')).toBeInTheDocument();
    });

    it('shows Resume button when provider is paused', () => {
      renderComponent({ connection: makeConnection({ isPaused: true }) });
      expect(screen.getByTestId('resume-button')).toBeInTheDocument();
      expect(screen.getByText('Resume')).toBeInTheDocument();
    });

    it('calls onPause when Pause button is clicked', async () => {
      const { props } = renderComponent();
      fireEvent.click(screen.getByTestId('pause-button'));
      await waitFor(() => {
        expect(props.onPause).toHaveBeenCalledWith('conn-1');
      });
    });

    it('calls onResume when Resume button is clicked', async () => {
      const { props } = renderComponent({
        connection: makeConnection({ isPaused: true }),
      });
      fireEvent.click(screen.getByTestId('resume-button'));
      await waitFor(() => {
        expect(props.onResume).toHaveBeenCalledWith('conn-1');
      });
    });

    it('shows error when pause fails', async () => {
      const onPause = jest.fn().mockRejectedValue(new Error('Network error'));
      renderComponent({ onPause });
      fireEvent.click(screen.getByTestId('pause-button'));
      await waitFor(() => {
        expect(screen.getByTestId('lifecycle-error')).toHaveTextContent('Network error');
      });
    });
  });

  // ── Disconnect (Req 16.4) ──────────────────────────────────────────────

  describe('Disconnect', () => {
    it('shows Disconnect button', () => {
      renderComponent();
      expect(screen.getByTestId('disconnect-button')).toBeInTheDocument();
    });

    it('opens disconnect dialog on click', async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-dialog')).toBeInTheDocument();
      });
    });

    it('calls onDisconnect when confirmed', async () => {
      const { props } = renderComponent();
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-confirm-button')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('disconnect-confirm-button'));
      await waitFor(() => {
        expect(props.onDisconnect).toHaveBeenCalledWith('conn-1');
      });
    });

    it('closes dialog on cancel', async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-dialog')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('disconnect-cancel-button'));
      await waitFor(() => {
        expect(screen.queryByTestId('disconnect-dialog')).not.toBeInTheDocument();
      });
    });
  });

  // ── Disconnect warning when provider in binding (Req 16.5) ─────────────

  describe('Disconnect warning when provider in binding', () => {
    it('shows binding warning when provider is part of multi-canary binding', async () => {
      const onGetDisconnectImpact = jest.fn().mockResolvedValue(
        makeImpactReport({
          affectedBindings: [
            { id: 'binding-1', name: 'My Vault Binding', providerCount: 3 },
          ],
          bindingsStillValid: [
            { id: 'binding-1', name: 'My Vault Binding', providerCount: 3 },
          ],
        }),
      );
      renderComponent({ onGetDisconnectImpact });
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-binding-warning')).toBeInTheDocument();
      });
      expect(screen.getByText(/This provider is part of 1 multi-canary binding/)).toBeInTheDocument();
      expect(screen.getByText('My Vault Binding')).toBeInTheDocument();
    });

    it('does not show binding warning when provider is not in any binding', async () => {
      renderComponent();
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-dialog')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('disconnect-binding-warning')).not.toBeInTheDocument();
    });
  });

  // ── Below-minimum warning (Req 16.6) ──────────────────────────────────

  describe('Below-minimum warning when binding would have <2 providers', () => {
    it('shows below-minimum warning when disconnect would reduce binding below 2', async () => {
      const onGetDisconnectImpact = jest.fn().mockResolvedValue(
        makeImpactReport({
          affectedBindings: [
            { id: 'binding-1', name: 'Critical Binding', providerCount: 2 },
          ],
          bindingsReducedBelowMinimum: [
            { id: 'binding-1', name: 'Critical Binding', providerCount: 2 },
          ],
        }),
      );
      renderComponent({ onGetDisconnectImpact });
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('below-minimum-warning')).toBeInTheDocument();
      });
      expect(screen.getByText(/Multi-canary redundancy will be lost/)).toBeInTheDocument();
      // "Critical Binding" appears in both warnings; verify it's in the below-minimum section
      const belowMinWarning = screen.getByTestId('below-minimum-warning');
      expect(belowMinWarning).toHaveTextContent('Critical Binding');
    });

    it('does not show below-minimum warning when bindings remain valid', async () => {
      const onGetDisconnectImpact = jest.fn().mockResolvedValue(
        makeImpactReport({
          affectedBindings: [
            { id: 'binding-1', name: 'Safe Binding', providerCount: 4 },
          ],
          bindingsStillValid: [
            { id: 'binding-1', name: 'Safe Binding', providerCount: 4 },
          ],
        }),
      );
      renderComponent({ onGetDisconnectImpact });
      fireEvent.click(screen.getByTestId('disconnect-button'));
      await waitFor(() => {
        expect(screen.getByTestId('disconnect-dialog')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('below-minimum-warning')).not.toBeInTheDocument();
    });
  });

  // ── Pure function tests ────────────────────────────────────────────────

  describe('shouldShowDisconnectWarning', () => {
    it('returns true when there are affected bindings', () => {
      expect(
        shouldShowDisconnectWarning(
          makeImpactReport({
            affectedBindings: [{ id: 'b1', name: 'Binding', providerCount: 3 }],
          }),
        ),
      ).toBe(true);
    });

    it('returns false when there are no affected bindings', () => {
      expect(shouldShowDisconnectWarning(makeImpactReport())).toBe(false);
    });
  });

  describe('shouldShowBelowMinimumWarning', () => {
    it('returns true when bindings would be reduced below minimum', () => {
      expect(
        shouldShowBelowMinimumWarning(
          makeImpactReport({
            bindingsReducedBelowMinimum: [{ id: 'b1', name: 'Binding', providerCount: 2 }],
          }),
        ),
      ).toBe(true);
    });

    it('returns false when no bindings would be reduced below minimum', () => {
      expect(shouldShowBelowMinimumWarning(makeImpactReport())).toBe(false);
    });
  });
});
