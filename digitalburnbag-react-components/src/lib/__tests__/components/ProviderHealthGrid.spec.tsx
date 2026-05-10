/**
 * Unit tests for ProviderHealthGrid component.
 * Task 14.4 — Tests for provider health grid UI.
 *
 * Requirements: 12.1, 12.2, 12.3, 12.5, 12.6
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

import { HeartbeatSignalType, ProviderCategory } from '@brightchain/digitalburnbag-lib';
import { act, fireEvent, render, screen, within } from '@testing-library/react';
import React from 'react';
import {
  IProviderConnectionExtendedForGrid,
  IProviderHealthGridProps,
  ProviderHealthGrid,
} from '../../components/ProviderHealthGrid';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeConnection(
  overrides: Partial<IProviderConnectionExtendedForGrid> = {},
): IProviderConnectionExtendedForGrid {
  const id = overrides.id ?? 'conn-1';
  return {
    id,
    providerId: overrides.providerId ?? 'github',
    providerDisplayName: overrides.providerDisplayName ?? 'GitHub',
    status: overrides.status ?? 'connected',
    lastCheckSignalType: overrides.lastCheckSignalType ?? HeartbeatSignalType.PRESENCE,
    lastCheckedAt: overrides.lastCheckedAt ?? new Date(Date.now() - 60000).toISOString(),
    lastActivityAt: overrides.lastActivityAt,
    isPaused: overrides.isPaused ?? false,
    providerConfig: overrides.providerConfig ?? {
      id: 'github',
      name: 'GitHub',
      description: 'Monitor commits and pull requests',
      category: ProviderCategory.DEVELOPER,
      icon: 'icon-github',
      baseUrl: 'https://api.github.com',
      auth: { type: 'oauth2' },
      endpoints: {
        activity: {
          path: '/events',
          method: 'GET',
          responseMapping: {
            eventsPath: '$.events',
            timestampPath: 'created_at',
            timestampFormat: 'iso8601',
          },
        },
      },
      defaultLookbackMs: 86400000,
      minCheckIntervalMs: 3600000,
      supportsWebhooks: false,
      enabledByDefault: true,
    },
    signalHistory: overrides.signalHistory ?? [HeartbeatSignalType.PRESENCE],
    ...overrides,
  };
}

const GITHUB_CONNECTION = makeConnection({
  id: 'conn-github',
  providerId: 'github',
  providerDisplayName: 'GitHub',
  lastCheckSignalType: HeartbeatSignalType.PRESENCE,
});

const FITBIT_CONNECTION = makeConnection({
  id: 'conn-fitbit',
  providerId: 'fitbit',
  providerDisplayName: 'Fitbit',
  lastCheckSignalType: HeartbeatSignalType.PRESENCE,
  providerConfig: {
    id: 'fitbit',
    name: 'Fitbit',
    description: 'Monitor steps and heart rate',
    category: ProviderCategory.HEALTH_FITNESS,
    icon: 'icon-fitbit',
    baseUrl: 'https://api.fitbit.com',
    auth: { type: 'oauth2' },
    endpoints: {
      activity: {
        path: '/activities',
        method: 'GET',
        responseMapping: {
          eventsPath: '$.activities',
          timestampPath: 'startTime',
          timestampFormat: 'iso8601',
        },
      },
    },
    defaultLookbackMs: 86400000,
    minCheckIntervalMs: 3600000,
    supportsWebhooks: false,
    enabledByDefault: true,
  },
});

const SLACK_CONNECTION = makeConnection({
  id: 'conn-slack',
  providerId: 'slack',
  providerDisplayName: 'Slack',
  lastCheckSignalType: HeartbeatSignalType.ABSENCE,
  providerConfig: {
    id: 'slack',
    name: 'Slack',
    description: 'Monitor message activity',
    category: ProviderCategory.COMMUNICATION,
    icon: 'icon-slack',
    baseUrl: 'https://slack.com/api',
    auth: { type: 'oauth2' },
    endpoints: {
      activity: {
        path: '/conversations.history',
        method: 'GET',
        responseMapping: {
          eventsPath: '$.messages',
          timestampPath: 'ts',
          timestampFormat: 'unix',
        },
      },
    },
    defaultLookbackMs: 86400000,
    minCheckIntervalMs: 3600000,
    supportsWebhooks: true,
    enabledByDefault: true,
  },
});

const ALL_CONNECTIONS = [GITHUB_CONNECTION, FITBIT_CONNECTION, SLACK_CONNECTION];

function renderGrid(overrides: Partial<IProviderHealthGridProps> = {}) {
  const defaultProps: IProviderHealthGridProps = {
    connections: ALL_CONNECTIONS,
    initialView: 'expanded',
    ...overrides,
  };
  return {
    ...render(<ProviderHealthGrid {...defaultProps} />),
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ProviderHealthGrid', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 12.1: Responsive grid renders all connected providers ────────────

  describe('Req 12.1 — responsive grid renders all connected providers', () => {
    it('renders the health grid container', () => {
      renderGrid();
      expect(screen.getByTestId('provider-health-grid')).toBeInTheDocument();
    });

    it('renders a card for each connected provider', () => {
      renderGrid();
      expect(screen.getByTestId('provider-card-expanded-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-expanded-conn-fitbit')).toBeInTheDocument();
      expect(screen.getByTestId('provider-card-expanded-conn-slack')).toBeInTheDocument();
    });

    it('renders all providers when multiple connections are provided', () => {
      const connections = Array.from({ length: 10 }, (_, i) =>
        makeConnection({ id: `conn-${i}`, providerDisplayName: `Provider ${i}` }),
      );
      renderGrid({ connections });
      for (let i = 0; i < 10; i++) {
        expect(screen.getByTestId(`provider-card-expanded-conn-${i}`)).toBeInTheDocument();
      }
    });

    it('renders empty state when no connections are provided', () => {
      renderGrid({ connections: [] });
      expect(screen.getByTestId('health-grid-empty')).toBeInTheDocument();
    });

    it('renders the provider grid container', () => {
      renderGrid();
      expect(screen.getByTestId('provider-grid')).toBeInTheDocument();
    });
  });

  // ── Req 12.2: Card displays all required fields with correct status colors ─

  describe('Req 12.2 — card displays all required fields with correct status colors', () => {
    it('displays provider name on each card', () => {
      renderGrid();
      expect(screen.getByTestId('provider-name-conn-github')).toHaveTextContent('GitHub');
      expect(screen.getByTestId('provider-name-conn-fitbit')).toHaveTextContent('Fitbit');
    });

    it('displays provider icon on each card', () => {
      renderGrid();
      expect(screen.getByTestId('provider-icon-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('provider-icon-conn-fitbit')).toBeInTheDocument();
    });

    it('displays status chip with correct label for PRESENCE', () => {
      renderGrid({ connections: [GITHUB_CONNECTION] });
      const chip = screen.getByTestId('status-chip-conn-github');
      expect(chip).toHaveTextContent('Presence');
    });

    it('displays status chip with correct label for ABSENCE', () => {
      renderGrid({ connections: [SLACK_CONNECTION] });
      const chip = screen.getByTestId('status-chip-conn-slack');
      expect(chip).toHaveTextContent('Absence');
    });

    it('displays status chip with correct label for CHECK_FAILED', () => {
      const conn = makeConnection({
        id: 'conn-failed',
        lastCheckSignalType: HeartbeatSignalType.CHECK_FAILED,
      });
      renderGrid({ connections: [conn] });
      const chip = screen.getByTestId('status-chip-conn-failed');
      expect(chip).toHaveTextContent('Check Failed');
    });

    it('displays status chip with correct label for DURESS', () => {
      const conn = makeConnection({
        id: 'conn-duress',
        lastCheckSignalType: HeartbeatSignalType.DURESS,
      });
      renderGrid({ connections: [conn] });
      const chip = screen.getByTestId('status-chip-conn-duress');
      expect(chip).toHaveTextContent('Duress');
    });

    it('displays time since last heartbeat on each card', () => {
      renderGrid();
      expect(screen.getByTestId('last-heartbeat-conn-github')).toBeInTheDocument();
      expect(screen.getByTestId('last-heartbeat-conn-github')).toHaveTextContent('Last heartbeat:');
    });

    it('displays sparkline for each card', () => {
      renderGrid();
      expect(screen.getByTestId('sparkline-container-conn-github')).toBeInTheDocument();
    });
  });

  // ── Req 12.3: WebSocket updates without page refresh ─────────────────────

  describe('Req 12.3 — WebSocket updates without page refresh', () => {
    it('registers a WebSocket handler via onStatusUpdate prop', () => {
      const onStatusUpdate = jest.fn().mockReturnValue(() => undefined);
      renderGrid({ onStatusUpdate });
      expect(onStatusUpdate).toHaveBeenCalledTimes(1);
      expect(typeof onStatusUpdate.mock.calls[0][0]).toBe('function');
    });

    it('updates provider status when WebSocket message arrives', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION],
        onStatusUpdate,
      });

      // Initially PRESENCE
      expect(screen.getByTestId('status-chip-conn-github')).toHaveTextContent('Presence');

      // Simulate WebSocket message with ABSENCE signal
      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-github',
              signal: HeartbeatSignalType.ABSENCE,
              lastCheckedAt: new Date().toISOString(),
            }),
          }),
        );
      });

      // Status should update without page refresh
      expect(screen.getByTestId('status-chip-conn-github')).toHaveTextContent('Absence');
    });

    it('ignores WebSocket messages for unknown connection IDs', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION],
        onStatusUpdate,
      });

      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-unknown',
              signal: HeartbeatSignalType.ABSENCE,
            }),
          }),
        );
      });

      // GitHub should remain PRESENCE
      expect(screen.getByTestId('status-chip-conn-github')).toHaveTextContent('Presence');
    });

    it('ignores malformed WebSocket messages', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION],
        onStatusUpdate,
      });

      // Should not throw
      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', { data: 'not-valid-json' }),
        );
      });

      expect(screen.getByTestId('status-chip-conn-github')).toHaveTextContent('Presence');
    });

    it('calls the unsubscribe function returned by onStatusUpdate on unmount', () => {
      const unsubscribe = jest.fn();
      const onStatusUpdate = jest.fn().mockReturnValue(unsubscribe);
      const { unmount } = renderGrid({ onStatusUpdate });
      unmount();
      expect(unsubscribe).toHaveBeenCalledTimes(1);
    });
  });

  // ── Req 12.4: Sort controls ───────────────────────────────────────────────

  describe('Req 12.4 — sort controls', () => {
    it('renders the sort control', () => {
      renderGrid();
      expect(screen.getByTestId('grid-controls')).toBeInTheDocument();
      expect(screen.getByTestId('sort-select')).toBeInTheDocument();
    });

    it('renders sort select with default value of statusSeverity', () => {
      renderGrid();
      // The select input has the current value
      const sortInput = screen.getByTestId('sort-select') as HTMLInputElement;
      expect(sortInput.value).toBe('statusSeverity');
    });
  });

  // ── Req 12.5: Compact/expanded view toggle ───────────────────────────────

  describe('Req 12.5 — compact/expanded view toggle', () => {
    it('renders view toggle buttons', () => {
      renderGrid();
      expect(screen.getByTestId('view-toggle-compact')).toBeInTheDocument();
      expect(screen.getByTestId('view-toggle-expanded')).toBeInTheDocument();
    });

    it('starts in expanded view by default', () => {
      renderGrid();
      expect(screen.getByTestId('provider-card-expanded-conn-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-compact-conn-github')).not.toBeInTheDocument();
    });

    it('starts in compact view when initialView is compact', () => {
      renderGrid({ initialView: 'compact' });
      expect(screen.getByTestId('provider-card-compact-conn-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-expanded-conn-github')).not.toBeInTheDocument();
    });

    it('switches to compact view when compact toggle is clicked', () => {
      renderGrid();
      // Initially expanded
      expect(screen.getByTestId('provider-card-expanded-conn-github')).toBeInTheDocument();

      // Click compact toggle
      fireEvent.click(screen.getByTestId('view-toggle-compact'));

      // Should now show compact cards
      expect(screen.getByTestId('provider-card-compact-conn-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-expanded-conn-github')).not.toBeInTheDocument();
    });

    it('switches back to expanded view when expanded toggle is clicked', () => {
      renderGrid({ initialView: 'compact' });
      // Initially compact
      expect(screen.getByTestId('provider-card-compact-conn-github')).toBeInTheDocument();

      // Click expanded toggle
      fireEvent.click(screen.getByTestId('view-toggle-expanded'));

      // Should now show expanded cards
      expect(screen.getByTestId('provider-card-expanded-conn-github')).toBeInTheDocument();
      expect(screen.queryByTestId('provider-card-compact-conn-github')).not.toBeInTheDocument();
    });

    it('compact view shows status dot instead of full card', () => {
      renderGrid({ initialView: 'compact' });
      expect(screen.getByTestId('status-dot-conn-github')).toBeInTheDocument();
    });

    it('compact toggle button has aria-pressed=true when in compact mode', () => {
      renderGrid({ initialView: 'compact' });
      expect(screen.getByTestId('view-toggle-compact')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('view-toggle-expanded')).toHaveAttribute('aria-pressed', 'false');
    });

    it('expanded toggle button has aria-pressed=true when in expanded mode', () => {
      renderGrid({ initialView: 'expanded' });
      expect(screen.getByTestId('view-toggle-expanded')).toHaveAttribute('aria-pressed', 'true');
      expect(screen.getByTestId('view-toggle-compact')).toHaveAttribute('aria-pressed', 'false');
    });
  });

  // ── Req 12.6: Status transition pulse animation class ────────────────────

  describe('Req 12.6 — status transition pulse animation class', () => {
    it('applies pulse class when WebSocket delivers CHECK_FAILED signal', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION], // starts as PRESENCE
        onStatusUpdate,
      });

      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-github',
              signal: HeartbeatSignalType.CHECK_FAILED,
              lastCheckedAt: new Date().toISOString(),
            }),
          }),
        );
      });

      // The card should have the pulse class applied
      const card = screen.getByTestId('provider-card-expanded-conn-github');
      expect(card).toHaveClass('provider-status-pulse');
    });

    it('applies pulse class when WebSocket delivers ABSENCE signal', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION], // starts as PRESENCE
        onStatusUpdate,
      });

      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-github',
              signal: HeartbeatSignalType.ABSENCE,
              lastCheckedAt: new Date().toISOString(),
            }),
          }),
        );
      });

      const card = screen.getByTestId('provider-card-expanded-conn-github');
      expect(card).toHaveClass('provider-status-pulse');
    });

    it('does not apply pulse class when signal stays PRESENCE', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [GITHUB_CONNECTION], // starts as PRESENCE
        onStatusUpdate,
      });

      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-github',
              signal: HeartbeatSignalType.PRESENCE,
              lastCheckedAt: new Date().toISOString(),
            }),
          }),
        );
      });

      const card = screen.getByTestId('provider-card-expanded-conn-github');
      expect(card).not.toHaveClass('provider-status-pulse');
    });
  });

  // ── Req 12.7: Aggregate health bar ───────────────────────────────────────

  describe('Req 12.7 — aggregate health bar', () => {
    it('renders the aggregate health bar', () => {
      renderGrid();
      expect(screen.getByTestId('aggregate-health-bar')).toBeInTheDocument();
    });

    it('shows presence percentage when providers have PRESENCE signal', () => {
      renderGrid({
        connections: [
          makeConnection({ id: 'c1', lastCheckSignalType: HeartbeatSignalType.PRESENCE }),
          makeConnection({ id: 'c2', lastCheckSignalType: HeartbeatSignalType.PRESENCE }),
        ],
      });
      expect(screen.getByTestId('health-pct-presence')).toHaveTextContent('100%');
    });

    it('shows absence percentage when providers have ABSENCE signal', () => {
      renderGrid({
        connections: [
          makeConnection({ id: 'c1', lastCheckSignalType: HeartbeatSignalType.ABSENCE }),
        ],
      });
      expect(screen.getByTestId('health-pct-absence')).toHaveTextContent('100%');
    });

    it('shows check-failed percentage when providers have CHECK_FAILED signal', () => {
      renderGrid({
        connections: [
          makeConnection({ id: 'c1', lastCheckSignalType: HeartbeatSignalType.CHECK_FAILED }),
        ],
      });
      expect(screen.getByTestId('health-pct-check-failed')).toHaveTextContent('100%');
    });

    it('shows "No providers connected" when connections list is empty', () => {
      renderGrid({ connections: [] });
      expect(screen.getByTestId('aggregate-health-bar')).toHaveTextContent('No providers connected');
    });

    it('shows mixed percentages for mixed signals', () => {
      renderGrid({
        connections: [
          makeConnection({ id: 'c1', lastCheckSignalType: HeartbeatSignalType.PRESENCE }),
          makeConnection({ id: 'c2', lastCheckSignalType: HeartbeatSignalType.ABSENCE }),
        ],
      });
      expect(screen.getByTestId('health-pct-presence')).toHaveTextContent('50%');
      expect(screen.getByTestId('health-pct-absence')).toHaveTextContent('50%');
    });
  });

  // ── Req 16.3: Paused providers display grayed out with pause icon ────────

  describe('Req 16.3 — paused provider visual state', () => {
    it('shows paused chip instead of status chip for paused providers in expanded view', () => {
      renderGrid({
        connections: [makeConnection({ id: 'conn-paused', isPaused: true, status: 'paused' })],
      });
      expect(screen.getByTestId('paused-chip-conn-paused')).toBeInTheDocument();
      expect(screen.getByTestId('paused-chip-conn-paused')).toHaveTextContent('Paused');
      expect(screen.queryByTestId('status-chip-conn-paused')).not.toBeInTheDocument();
    });

    it('shows pause icon on paused provider card in expanded view', () => {
      renderGrid({
        connections: [makeConnection({ id: 'conn-paused', isPaused: true, status: 'paused' })],
      });
      expect(screen.getByTestId('pause-icon-conn-paused')).toBeInTheDocument();
    });

    it('shows pause icon on paused provider card in compact view', () => {
      renderGrid({
        connections: [makeConnection({ id: 'conn-paused', isPaused: true, status: 'paused' })],
        initialView: 'compact',
      });
      expect(screen.getByTestId('pause-icon-conn-paused')).toBeInTheDocument();
    });

    it('shows "Paused — heartbeat checks stopped" text for paused providers', () => {
      renderGrid({
        connections: [makeConnection({ id: 'conn-paused', isPaused: true, status: 'paused' })],
      });
      expect(screen.getByTestId('last-heartbeat-conn-paused')).toHaveTextContent('Paused — heartbeat checks stopped');
    });

    it('does not apply pulse animation to paused providers', async () => {
      let capturedHandler: ((event: MessageEvent) => void) | null = null;
      const onStatusUpdate = jest.fn((handler: (event: MessageEvent) => void) => {
        capturedHandler = handler;
        return () => undefined;
      });

      renderGrid({
        connections: [makeConnection({ id: 'conn-paused', isPaused: true, status: 'paused' })],
        onStatusUpdate,
      });

      await act(async () => {
        capturedHandler!(
          new MessageEvent('message', {
            data: JSON.stringify({
              connectionId: 'conn-paused',
              signal: HeartbeatSignalType.ABSENCE,
              lastCheckedAt: new Date().toISOString(),
            }),
          }),
        );
      });

      const card = screen.getByTestId('provider-card-expanded-conn-paused');
      expect(card).not.toHaveClass('provider-status-pulse');
    });
  });
});
