/**
 * Unit tests for ActivationFlow component.
 * Task 18.4 — Tests for activation flow steps and provider lifecycle.
 *
 * Requirements: 16.1, 16.3, 16.5, 16.6
 */

// ---------------------------------------------------------------------------
// Imports
// ---------------------------------------------------------------------------

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import React from 'react';
import type { IActivationFlowProps, IActivationFlowProvider } from '../../components/ActivationFlow';
import { ActivationFlow } from '../../components/ActivationFlow';
import type { IApiProviderConnectionDTO, IApiTestConnectionResponseDTO } from '../../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Test fixtures
// ---------------------------------------------------------------------------

function makeProvider(overrides: Partial<IActivationFlowProvider> = {}): IActivationFlowProvider {
  return {
    id: 'github',
    name: 'GitHub',
    description: 'Monitor commits, pull requests, and issues',
    authType: 'api_key',
    apiKeyLabel: 'Personal Access Token',
    apiKeyHelperText: 'Generate a token at github.com/settings/tokens',
    ...overrides,
  };
}

function makeConnection(overrides: Partial<IApiProviderConnectionDTO> = {}): IApiProviderConnectionDTO {
  return {
    id: 'conn-1',
    userId: 'user-1',
    providerId: 'github',
    status: 'connected',
    isEnabled: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

function makeTestResult(overrides: Partial<IApiTestConnectionResponseDTO> = {}): IApiTestConnectionResponseDTO {
  return {
    success: true,
    status: 'connected',
    providerUserInfo: {
      userId: 'gh-user-1',
      username: 'testuser',
      displayName: 'Test User',
    },
    responseTimeMs: 150,
    ...overrides,
  };
}

function renderActivationFlow(overrides: Partial<IActivationFlowProps> = {}) {
  const defaultProps: IActivationFlowProps = {
    provider: makeProvider(),
    onConnectWithApiKey: jest.fn().mockResolvedValue(makeConnection()),
    onTestConnection: jest.fn().mockResolvedValue(makeTestResult()),
    onComplete: jest.fn(),
    onCancel: jest.fn(),
    ...overrides,
  };
  return {
    ...render(<ActivationFlow {...defaultProps} />),
    props: defaultProps,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ActivationFlow', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Req 16.1: Activation flow steps render in correct order ──────────────

  describe('Req 16.1 — activation flow steps render in correct order', () => {
    it('renders the activation flow container', () => {
      renderActivationFlow();
      expect(screen.getByTestId('activation-flow')).toBeInTheDocument();
    });

    it('renders the stepper with all 4 steps', () => {
      renderActivationFlow();
      expect(screen.getByTestId('activation-stepper')).toBeInTheDocument();
      expect(screen.getByText('Authentication')).toBeInTheDocument();
      expect(screen.getByText('Test Connection')).toBeInTheDocument();
      expect(screen.getByText('Configure')).toBeInTheDocument();
      expect(screen.getByText('Done')).toBeInTheDocument();
    });

    it('renders steps in the correct order: Authentication → Test Connection → Configure → Done', () => {
      renderActivationFlow();
      const stepper = screen.getByTestId('activation-stepper');
      const steps = stepper.querySelectorAll('.MuiStepLabel-label');
      expect(steps).toHaveLength(4);
      expect(steps[0]).toHaveTextContent('Authentication');
      expect(steps[1]).toHaveTextContent('Test Connection');
      expect(steps[2]).toHaveTextContent('Configure');
      expect(steps[3]).toHaveTextContent('Done');
    });

    it('starts on the Authentication step (step 0)', () => {
      renderActivationFlow();
      expect(screen.getByTestId('auth-step')).toBeInTheDocument();
      expect(screen.queryByTestId('test-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('configure-step')).not.toBeInTheDocument();
      expect(screen.queryByTestId('done-step')).not.toBeInTheDocument();
    });

    it('advances to Test Connection step after successful authentication', async () => {
      renderActivationFlow();
      // Fill in API key and submit
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('auth-step')).not.toBeInTheDocument();
    });

    it('advances to Configure step after successful test connection', async () => {
      renderActivationFlow();
      // Step 1: Authenticate
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });

      // Step 2: Test connection
      fireEvent.click(screen.getByTestId('test-connection-button'));
      await waitFor(() => {
        expect(screen.getByTestId('test-result')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('continue-after-test-button'));

      await waitFor(() => {
        expect(screen.getByTestId('configure-step')).toBeInTheDocument();
      });
      expect(screen.queryByTestId('test-step')).not.toBeInTheDocument();
    });

    it('advances to Done step after configuration is complete', async () => {
      const onComplete = jest.fn();
      renderActivationFlow({ onComplete });

      // Step 1: Authenticate
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });

      // Step 2: Test connection
      fireEvent.click(screen.getByTestId('test-connection-button'));
      await waitFor(() => {
        expect(screen.getByTestId('test-result')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('continue-after-test-button'));

      await waitFor(() => {
        expect(screen.getByTestId('configure-step')).toBeInTheDocument();
      });

      // Step 3: Configure and finish
      fireEvent.click(screen.getByTestId('finish-button'));

      await waitFor(() => {
        expect(screen.getByTestId('done-step')).toBeInTheDocument();
      });
      expect(onComplete).toHaveBeenCalledTimes(1);
    });

    it('shows provider name and description in the flow header', () => {
      renderActivationFlow({ provider: makeProvider({ name: 'Fitbit', description: 'Track your fitness' }) });
      expect(screen.getByText('Connect Fitbit')).toBeInTheDocument();
      expect(screen.getByText('Track your fitness')).toBeInTheDocument();
    });

    it('shows OAuth connect button for OAuth2 providers', () => {
      renderActivationFlow({
        provider: makeProvider({ authType: 'oauth2', name: 'Spotify' }),
        onInitiateOAuth: jest.fn().mockResolvedValue({ authorizationUrl: 'https://accounts.spotify.com/authorize' }),
      });
      expect(screen.getByTestId('oauth-connect-button')).toBeInTheDocument();
      expect(screen.getByText('Connect with Spotify')).toBeInTheDocument();
    });

    it('shows API key input for api_key providers', () => {
      renderActivationFlow({ provider: makeProvider({ authType: 'api_key' }) });
      expect(screen.getByTestId('api-key-input')).toBeInTheDocument();
      expect(screen.getByTestId('api-key-connect-button')).toBeInTheDocument();
    });

    it('shows cancel button during the flow', () => {
      renderActivationFlow();
      expect(screen.getByTestId('cancel-activation-button')).toBeInTheDocument();
    });

    it('calls onCancel when cancel button is clicked', () => {
      const onCancel = jest.fn();
      renderActivationFlow({ onCancel });
      fireEvent.click(screen.getByTestId('cancel-activation-button'));
      expect(onCancel).toHaveBeenCalledTimes(1);
    });

    it('shows absence threshold slider in Configure step', async () => {
      renderActivationFlow();
      // Navigate to Configure step
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('test-connection-button'));
      await waitFor(() => {
        expect(screen.getByTestId('test-result')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('continue-after-test-button'));

      await waitFor(() => {
        expect(screen.getByTestId('configure-step')).toBeInTheDocument();
      });
      expect(screen.getByTestId('absence-threshold-slider')).toBeInTheDocument();
    });

    it('shows multi-canary option in Configure step', async () => {
      renderActivationFlow();
      // Navigate to Configure step
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('test-connection-button'));
      await waitFor(() => {
        expect(screen.getByTestId('test-result')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('continue-after-test-button'));

      await waitFor(() => {
        expect(screen.getByTestId('configure-step')).toBeInTheDocument();
      });
      expect(screen.getByTestId('multi-canary-option')).toBeInTheDocument();
    });

    it('shows success message with provider name in Done step', async () => {
      renderActivationFlow({ provider: makeProvider({ name: 'GitHub' }) });

      // Navigate through all steps
      const apiKeyInput = screen.getByTestId('api-key-input');
      fireEvent.change(apiKeyInput, { target: { value: 'ghp_test123' } });
      fireEvent.click(screen.getByTestId('api-key-connect-button'));

      await waitFor(() => {
        expect(screen.getByTestId('test-step')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('test-connection-button'));
      await waitFor(() => {
        expect(screen.getByTestId('test-result')).toBeInTheDocument();
      });
      fireEvent.click(screen.getByTestId('continue-after-test-button'));

      await waitFor(() => {
        expect(screen.getByTestId('configure-step')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByTestId('finish-button'));

      await waitFor(() => {
        expect(screen.getByTestId('done-step')).toBeInTheDocument();
      });
      expect(screen.getByText('GitHub connected!')).toBeInTheDocument();
    });
  });
});
