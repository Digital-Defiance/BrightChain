/**
 * ActivationFlow — streamlined wizard for enabling a provider from the catalog,
 * authenticating, and connecting it to the user's account.
 *
 * Steps: authentication → test connection → absence threshold configuration
 *        → optional multi-canary binding setup
 *
 * Requirements: 16.1
 */
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Slider,
  Step,
  StepLabel,
  Stepper,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import type { IApiProviderConnectionDTO, IApiTestConnectionResponseDTO } from '../services/burnbag-api-client';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface IActivationFlowProvider {
  id: string;
  name: string;
  description: string;
  icon?: string;
  authType: 'oauth2' | 'api_key' | 'webhook' | 'session';
  oauthAuthorizationUrl?: string;
  requiresApiKey?: boolean;
  apiKeyLabel?: string;
  apiKeyHelperText?: string;
}

export interface IActivationFlowProps {
  provider: IActivationFlowProvider;
  /** Called to initiate OAuth flow — returns the authorization URL */
  onInitiateOAuth?: (providerId: string) => Promise<{ authorizationUrl: string }>;
  /** Called to connect with an API key */
  onConnectWithApiKey?: (providerId: string, apiKey: string) => Promise<IApiProviderConnectionDTO>;
  /** Called to test the connection after auth */
  onTestConnection: (connectionId: string) => Promise<IApiTestConnectionResponseDTO>;
  /** Called when the full activation is complete */
  onComplete: (connection: IApiProviderConnectionDTO, config: { absenceThresholdHours: number; setupMultiCanary: boolean }) => void;
  /** Called when the user cancels */
  onCancel: () => void;
}

// ---------------------------------------------------------------------------
// Step components
// ---------------------------------------------------------------------------

const STEPS = ['Authentication', 'Test Connection', 'Configure', 'Done'];

// Step 1: Authentication
interface IAuthStepProps {
  provider: IActivationFlowProvider;
  onInitiateOAuth?: (providerId: string) => Promise<{ authorizationUrl: string }>;
  onConnectWithApiKey?: (providerId: string, apiKey: string) => Promise<IApiProviderConnectionDTO>;
  onSuccess: (connection: IApiProviderConnectionDTO) => void;
}

function AuthStep({ provider, onInitiateOAuth, onConnectWithApiKey, onSuccess }: IAuthStepProps) {
  const [apiKey, setApiKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleOAuth = async () => {
    if (!onInitiateOAuth) return;
    setLoading(true);
    setError('');
    try {
      const { authorizationUrl } = await onInitiateOAuth(provider.id);
      window.location.href = authorizationUrl;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to initiate OAuth');
      setLoading(false);
    }
  };

  const handleApiKey = async () => {
    if (!onConnectWithApiKey || !apiKey.trim()) return;
    setLoading(true);
    setError('');
    try {
      const connection = await onConnectWithApiKey(provider.id, apiKey.trim());
      onSuccess(connection);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to connect with API key');
      setLoading(false);
    }
  };

  return (
    <Box data-testid="auth-step">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Connect your {provider.name} account to use it as a canary provider.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {provider.authType === 'oauth2' && (
        <Button
          variant="contained"
          onClick={handleOAuth}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={16} /> : undefined}
          data-testid="oauth-connect-button"
          fullWidth
        >
          {loading ? 'Redirecting…' : `Connect with ${provider.name}`}
        </Button>
      )}

      {(provider.authType === 'api_key' || provider.requiresApiKey) && (
        <Box>
          <TextField
            fullWidth
            size="small"
            label={provider.apiKeyLabel ?? 'API Key'}
            helperText={provider.apiKeyHelperText}
            value={apiKey}
            onChange={e => setApiKey(e.target.value)}
            type="password"
            sx={{ mb: 2 }}
            inputProps={{ 'data-testid': 'api-key-input' }}
          />
          <Button
            variant="contained"
            onClick={handleApiKey}
            disabled={loading || !apiKey.trim()}
            startIcon={loading ? <CircularProgress size={16} /> : undefined}
            data-testid="api-key-connect-button"
            fullWidth
          >
            {loading ? 'Connecting…' : 'Connect'}
          </Button>
        </Box>
      )}
    </Box>
  );
}

// Step 2: Test Connection
interface ITestStepProps {
  connection: IApiProviderConnectionDTO;
  onTestConnection: (connectionId: string) => Promise<IApiTestConnectionResponseDTO>;
  onSuccess: () => void;
  onBack: () => void;
}

function TestStep({ connection, onTestConnection, onSuccess, onBack }: ITestStepProps) {
  const [testing, setTesting] = useState(false);
  const [result, setResult] = useState<IApiTestConnectionResponseDTO | null>(null);
  const [error, setError] = useState('');

  const handleTest = async () => {
    setTesting(true);
    setError('');
    try {
      const r = await onTestConnection(connection.id);
      setResult(r);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Test failed');
    } finally {
      setTesting(false);
    }
  };

  return (
    <Box data-testid="test-step">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Verify that the connection is working correctly.
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {result && (
        <Alert severity={result.success ? 'success' : 'error'} sx={{ mb: 2 }} data-testid="test-result">
          {result.success
            ? `Connected as ${result.providerUserInfo?.displayName ?? result.providerUserInfo?.username ?? 'unknown'} (${result.responseTimeMs}ms)`
            : `Connection failed: ${result.error}`}
        </Alert>
      )}

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="outlined" onClick={handleTest} disabled={testing} startIcon={testing ? <CircularProgress size={16} /> : undefined} data-testid="test-connection-button">
          {testing ? 'Testing…' : 'Test Connection'}
        </Button>
        {result?.success && (
          <Button variant="contained" onClick={onSuccess} data-testid="continue-after-test-button">
            Continue
          </Button>
        )}
        <Button onClick={onBack}>Back</Button>
      </Box>
    </Box>
  );
}

// Step 3: Configure
interface IConfigureStepProps {
  onComplete: (config: { absenceThresholdHours: number; setupMultiCanary: boolean }) => void;
  onBack: () => void;
}

function ConfigureStep({ onComplete, onBack }: IConfigureStepProps) {
  const [absenceThresholdHours, setAbsenceThresholdHours] = useState(24);
  const [setupMultiCanary, setSetupMultiCanary] = useState(false);

  return (
    <Box data-testid="configure-step">
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Configure how this provider monitors your activity.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <Typography variant="body2" gutterBottom>Absence threshold: {absenceThresholdHours}h</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
          Trigger protocol if no activity detected for this duration.
        </Typography>
        <Slider
          value={absenceThresholdHours}
          onChange={(_, v) => setAbsenceThresholdHours(v as number)}
          min={1}
          max={168}
          step={1}
          marks={[{ value: 24, label: '24h' }, { value: 72, label: '72h' }, { value: 168, label: '7d' }]}
          data-testid="absence-threshold-slider"
        />
      </Box>

      <Box sx={{ mb: 3 }}>
        <FormControl fullWidth size="small">
          <InputLabel>Multi-Canary Setup</InputLabel>
          <Select
            value={setupMultiCanary ? 'yes' : 'no'}
            label="Multi-Canary Setup"
            onChange={e => setSetupMultiCanary(e.target.value === 'yes')}
            data-testid="multi-canary-option"
          >
            <MenuItem value="no">Skip — use this provider alone</MenuItem>
            <MenuItem value="yes">Set up multi-canary redundancy after connecting</MenuItem>
          </Select>
        </FormControl>
      </Box>

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button variant="contained" onClick={() => onComplete({ absenceThresholdHours, setupMultiCanary })} data-testid="finish-button">
          Finish
        </Button>
        <Button onClick={onBack}>Back</Button>
      </Box>
    </Box>
  );
}

// Step 4: Done
function DoneStep({ providerName, onClose }: { providerName: string; onClose: () => void }) {
  return (
    <Box sx={{ textAlign: 'center', py: 2 }} data-testid="done-step">
      <CheckCircleIcon color="success" sx={{ fontSize: 48, mb: 1 }} />
      <Typography variant="h6" gutterBottom>{providerName} connected!</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Your provider is now active and monitoring your activity.
      </Typography>
      <Button variant="contained" onClick={onClose} data-testid="close-activation-button">
        Done
      </Button>
    </Box>
  );
}

// ---------------------------------------------------------------------------
// ActivationFlow
// ---------------------------------------------------------------------------

/**
 * Streamlined wizard for activating a canary provider.
 * Steps: authentication → test connection → configure → done
 * Requirements: 16.1
 */
export function ActivationFlow({ provider, onInitiateOAuth, onConnectWithApiKey, onTestConnection, onComplete, onCancel }: IActivationFlowProps) {
  const [activeStep, setActiveStep] = useState(0);
  const [connection, setConnection] = useState<IApiProviderConnectionDTO | null>(null);

  const handleAuthSuccess = useCallback((conn: IApiProviderConnectionDTO) => {
    setConnection(conn);
    setActiveStep(1);
  }, []);

  const handleTestSuccess = useCallback(() => {
    setActiveStep(2);
  }, []);

  const handleConfigureComplete = useCallback((config: { absenceThresholdHours: number; setupMultiCanary: boolean }) => {
    if (connection) {
      onComplete(connection, config);
      setActiveStep(3);
    }
  }, [connection, onComplete]);

  return (
    <Box data-testid="activation-flow" sx={{ maxWidth: 480, mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        Connect {provider.name}
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        {provider.description}
      </Typography>

      <Stepper activeStep={activeStep} sx={{ mb: 3 }} data-testid="activation-stepper">
        {STEPS.map(label => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <Divider sx={{ mb: 2 }} />

      {activeStep === 0 && (
        <AuthStep
          provider={provider}
          onInitiateOAuth={onInitiateOAuth}
          onConnectWithApiKey={onConnectWithApiKey}
          onSuccess={handleAuthSuccess}
        />
      )}

      {activeStep === 1 && connection && (
        <TestStep
          connection={connection}
          onTestConnection={onTestConnection}
          onSuccess={handleTestSuccess}
          onBack={() => setActiveStep(0)}
        />
      )}

      {activeStep === 2 && (
        <ConfigureStep
          onComplete={handleConfigureComplete}
          onBack={() => setActiveStep(1)}
        />
      )}

      {activeStep === 3 && (
        <DoneStep providerName={provider.name} onClose={onCancel} />
      )}

      {activeStep < 3 && (
        <Box sx={{ mt: 2 }}>
          <Button size="small" color="inherit" onClick={onCancel} data-testid="cancel-activation-button">
            Cancel
          </Button>
        </Box>
      )}
    </Box>
  );
}
