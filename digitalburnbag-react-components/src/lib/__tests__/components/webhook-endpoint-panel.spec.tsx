/**
 * Unit tests for WebhookEndpointPanel component.
 * Task 16.7 — Tests for webhook endpoint management UI.
 *
 * Requirements: 10.1, 10.6, 14.5, 17.7
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

// Mock navigator.clipboard
Object.assign(navigator, {
  clipboard: {
    writeText: jest.fn().mockResolvedValue(undefined),
  },
});

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import React from 'react';
import {
  IWebhookEndpointDisplay,
  IWebhookEndpointPanelProps,
  WebhookEndpointPanel,
} from '../../components/WebhookEndpointPanel';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeEndpoint(
  overrides: Partial<IWebhookEndpointDisplay> = {},
): IWebhookEndpointDisplay {
  return {
    id: overrides.id ?? 'ep-1',
    connectionId: 'conn-1',
    providerId: 'github',
    providerName: overrides.providerName ?? 'GitHub Webhooks',
    webhookUrl: overrides.webhookUrl ?? 'https://example.com/api/webhooks/canary/conn-1/abc123',
    secret: overrides.secret ?? 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
    isActive: overrides.isActive ?? true,
    isDisabledByFailures: overrides.isDisabledByFailures ?? false,
    ipAllowlist: overrides.ipAllowlist ?? [],
    rateLimitPerMinute: overrides.rateLimitPerMinute ?? 100,
    stats: overrides.stats ?? {
      totalReceived: 150,
      successfullyProcessed: 147,
      failedValidation: 3,
      lastReceivedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    },
    lastReceivedAt: overrides.lastReceivedAt ?? new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

const ENDPOINT_GITHUB = makeEndpoint({
  id: 'ep-github',
  providerName: 'GitHub Webhooks',
  webhookUrl: 'https://example.com/api/webhooks/canary/conn-github/secret1',
  secret: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
  stats: {
    totalReceived: 200,
    successfullyProcessed: 196,
    failedValidation: 4,
    lastReceivedAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
  },
});

const ENDPOINT_STRIPE = makeEndpoint({
  id: 'ep-stripe',
  providerName: 'Stripe Events',
  webhookUrl: 'https://example.com/api/webhooks/canary/conn-stripe/secret2',
  secret: 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2',
  stats: {
    totalReceived: 50,
    successfullyProcessed: 50,
    failedValidation: 0,
    lastReceivedAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
  },
});

const ALL_ENDPOINTS = [ENDPOINT_GITHUB, ENDPOINT_STRIPE];

function renderPanel(overrides: Partial<IWebhookEndpointPanelProps> = {}) {
  const defaultProps: IWebhookEndpointPanelProps = {
    endpoints: ALL_ENDPOINTS,
    onRotateSecret: jest.fn().mockResolvedValue({ newSecret: 'new-secret-hex-value-32-bytes-long-hex-encoded-string-64-chars' }),
    onUpdateIpAllowlist: jest.fn().mockResolvedValue(undefined),
    onSendTestWebhook: jest.fn().mockResolvedValue({ success: true, processingTimeMs: 42 }),
    onRefreshStats: jest.fn().mockResolvedValue({
      totalReceived: 201,
      successfullyProcessed: 197,
      failedValidation: 4,
      lastReceivedAt: new Date().toISOString(),
      lastSuccessAt: new Date().toISOString(),
    }),
    ...overrides,
  };

  const result = render(<WebhookEndpointPanel {...defaultProps} />);
  return { ...result, props: defaultProps };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('WebhookEndpointPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 14.5: Webhook endpoints list shows provider name and success rate ─

  describe('Req 14.5 — webhook endpoints list shows provider name and success rate', () => {
    it('renders the webhook endpoint panel', () => {
      renderPanel();
      expect(screen.getByTestId('webhook-endpoint-panel')).toBeInTheDocument();
    });

    it('displays endpoint cards for each endpoint', () => {
      renderPanel();
      expect(screen.getByTestId('endpoint-card-ep-github')).toBeInTheDocument();
      expect(screen.getByTestId('endpoint-card-ep-stripe')).toBeInTheDocument();
    });

    it('shows provider name for each endpoint', () => {
      renderPanel();
      expect(screen.getByText('GitHub Webhooks')).toBeInTheDocument();
      expect(screen.getByText('Stripe Events')).toBeInTheDocument();
    });

    it('shows delivery stats including success rate', () => {
      renderPanel();
      const githubCard = screen.getByTestId('endpoint-card-ep-github');
      const statsSection = within(githubCard).getByTestId('delivery-stats-ep-github');
      // Success rate = 196/200 = 98%
      expect(within(statsSection).getByText('98%')).toBeInTheDocument();
    });

    it('shows total received count', () => {
      renderPanel();
      const githubCard = screen.getByTestId('endpoint-card-ep-github');
      const statsSection = within(githubCard).getByTestId('delivery-stats-ep-github');
      expect(within(statsSection).getByText('200')).toBeInTheDocument();
    });

    it('shows empty state when no endpoints exist', () => {
      renderPanel({ endpoints: [] });
      expect(screen.getByTestId('no-endpoints-state')).toBeInTheDocument();
      expect(screen.getByText('No webhook endpoints configured.')).toBeInTheDocument();
    });

    it('shows webhook URL for each endpoint', () => {
      renderPanel();
      expect(screen.getByTestId('webhook-url-ep-github')).toBeInTheDocument();
    });
  });

  // ── Req 10.1: Secret show/hide toggle and copy button ─────────────────────

  describe('Req 10.1 — secret show/hide toggle and copy button', () => {
    it('renders secret display section', () => {
      renderPanel();
      expect(screen.getAllByTestId('secret-display').length).toBeGreaterThan(0);
    });

    it('hides secret by default (shows dots)', () => {
      renderPanel();
      const secretDisplays = screen.getAllByTestId('secret-display');
      // Should show dots, not the actual secret
      expect(secretDisplays[0].textContent).toMatch(/^•+$/);
    });

    it('shows visibility toggle button', () => {
      renderPanel();
      const toggleButtons = screen.getAllByTestId('secret-visibility-toggle');
      expect(toggleButtons.length).toBeGreaterThan(0);
    });

    it('reveals secret when visibility toggle is clicked', () => {
      renderPanel();
      const toggleButton = screen.getAllByTestId('secret-visibility-toggle')[0];
      fireEvent.click(toggleButton);

      const secretDisplays = screen.getAllByTestId('secret-display');
      // After clicking, should show the actual secret (not dots)
      expect(secretDisplays[0].textContent).not.toMatch(/^•+$/);
      expect(secretDisplays[0].textContent).toContain('a1b2c3d4');
    });

    it('hides secret again when toggle is clicked twice', () => {
      renderPanel();
      const toggleButton = screen.getAllByTestId('secret-visibility-toggle')[0];
      fireEvent.click(toggleButton); // show
      fireEvent.click(toggleButton); // hide

      const secretDisplays = screen.getAllByTestId('secret-display');
      expect(secretDisplays[0].textContent).toMatch(/^•+$/);
    });

    it('shows copy button for secret', () => {
      renderPanel();
      const copyButtons = screen.getAllByTestId('copy-secret-button');
      expect(copyButtons.length).toBeGreaterThan(0);
    });

    it('copies secret to clipboard when copy button is clicked', () => {
      renderPanel();
      const copyButton = screen.getAllByTestId('copy-secret-button')[0];
      fireEvent.click(copyButton);

      expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
        ENDPOINT_GITHUB.secret,
      );
    });
  });

  // ── Req 10.6: "Rotate Secret" button ──────────────────────────────────────

  describe('Req 10.6 — "Rotate Secret" button', () => {
    it('shows "Rotate Secret" button for each endpoint', () => {
      renderPanel();
      expect(screen.getByTestId('rotate-secret-ep-github')).toBeInTheDocument();
      expect(screen.getByTestId('rotate-secret-ep-stripe')).toBeInTheDocument();
    });

    it('"Rotate Secret" button text is correct', () => {
      renderPanel();
      const rotateBtn = screen.getByTestId('rotate-secret-ep-github');
      expect(rotateBtn).toHaveTextContent('Rotate Secret');
    });

    it('shows grace period configuration when "Rotate Secret" is clicked', () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('rotate-secret-ep-github'));
      expect(screen.getByTestId('grace-period-config-ep-github')).toBeInTheDocument();
    });

    it('shows grace period selector with options', () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('rotate-secret-ep-github'));
      expect(screen.getByTestId('grace-period-select-ep-github')).toBeInTheDocument();
    });

    it('shows "Confirm Rotation" button after clicking "Rotate Secret"', () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('rotate-secret-ep-github'));
      expect(screen.getByTestId('confirm-rotate-ep-github')).toBeInTheDocument();
    });

    it('calls onRotateSecret when rotation is confirmed', async () => {
      const { props } = renderPanel();
      fireEvent.click(screen.getByTestId('rotate-secret-ep-github'));
      fireEvent.click(screen.getByTestId('confirm-rotate-ep-github'));

      await waitFor(() => {
        expect(props.onRotateSecret).toHaveBeenCalledWith('ep-github', expect.any(Number));
      });
    });

    it('shows success result after rotation completes', async () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('rotate-secret-ep-github'));
      fireEvent.click(screen.getByTestId('confirm-rotate-ep-github'));

      await waitFor(() => {
        expect(screen.getByTestId('rotate-result-ep-github')).toBeInTheDocument();
      });
    });
  });

  // ── Req 17.7: "Test Webhook" button ───────────────────────────────────────

  describe('Req 17.7 — "Test Webhook" button', () => {
    it('shows "Test Webhook" button for each endpoint', () => {
      renderPanel();
      expect(screen.getByTestId('test-webhook-ep-github')).toBeInTheDocument();
      expect(screen.getByTestId('test-webhook-ep-stripe')).toBeInTheDocument();
    });

    it('"Test Webhook" button text is correct', () => {
      renderPanel();
      const testBtn = screen.getByTestId('test-webhook-ep-github');
      expect(testBtn).toHaveTextContent('Test Webhook');
    });

    it('calls onSendTestWebhook when "Test Webhook" is clicked', async () => {
      const { props } = renderPanel();
      fireEvent.click(screen.getByTestId('test-webhook-ep-github'));

      await waitFor(() => {
        expect(props.onSendTestWebhook).toHaveBeenCalledWith('ep-github');
      });
    });

    it('shows success result after test webhook completes', async () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('test-webhook-ep-github'));

      await waitFor(() => {
        const result = screen.getByTestId('test-result-ep-github');
        expect(result).toBeInTheDocument();
        expect(result).toHaveTextContent('successfully');
      });
    });

    it('shows processing time in success result', async () => {
      renderPanel();
      fireEvent.click(screen.getByTestId('test-webhook-ep-github'));

      await waitFor(() => {
        const result = screen.getByTestId('test-result-ep-github');
        expect(result).toHaveTextContent('42ms');
      });
    });

    it('shows error result when test webhook fails', async () => {
      const { props } = renderPanel({
        onSendTestWebhook: jest.fn().mockResolvedValue({
          success: false,
          error: 'Connection refused',
          processingTimeMs: 0,
        }),
      });

      fireEvent.click(screen.getByTestId('test-webhook-ep-github'));

      await waitFor(() => {
        const result = screen.getByTestId('test-result-ep-github');
        expect(result).toBeInTheDocument();
        expect(result).toHaveTextContent('Connection refused');
      });
    });
  });
});
