import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import ErrorIcon from '@mui/icons-material/Error';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  IconButton,
  InputAdornment,
  LinearProgress,
  Step,
  StepLabel,
  Stepper,
  Switch,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useEffect, useState } from 'react';
import {
  BurnbagApiClient,
  IApiProviderConnectionDTO,
  IApiProviderDisplayInfoDTO,
  IApiProvidersByCategoryDTO,
  IApiSetupWebhookResponseDTO,
  IApiTestConnectionResponseDTO,
} from '../services/burnbag-api-client';
import { ProviderList } from './ProviderList';

type WizardStep =
  | 'select_provider'
  | 'review_permissions'
  | 'configure_absence'
  | 'configure_duress'
  | 'authorize'
  | 'enter_api_key'
  | 'configure_webhook'
  | 'test_connection'
  | 'complete';

interface IAbsenceConfig {
  thresholdDays: number;
  gracePeriodHours: number;
  sendWarnings: boolean;
  warningDays: number[];
}

interface IDuressConfig {
  enabled: boolean;
  keywords: string[];
  patterns: string[];
}

export interface IProviderRegistrationWizardProps {
  open: boolean;
  onClose: () => void;
  onComplete: (connection: IApiProviderConnectionDTO) => void;
  apiClient: BurnbagApiClient;
  providersByCategory: IApiProvidersByCategoryDTO[];
  isLoadingProviders: boolean;
}

const _STEP_ORDER: WizardStep[] = [
  'select_provider',
  'review_permissions',
  'configure_absence',
  'configure_duress',
  'authorize', // or enter_api_key or configure_webhook
  'test_connection',
  'complete',
];

function getStepLabel(step: WizardStep, t: (key: string) => string): string {
  const labels: Record<WizardStep, string> = {
    select_provider: t(DigitalBurnbagStrings.Wizard_SelectProvider),
    review_permissions: t(DigitalBurnbagStrings.Wizard_ReviewPermissions),
    configure_absence: t(DigitalBurnbagStrings.Wizard_ConfigureAbsence),
    configure_duress: t(DigitalBurnbagStrings.Wizard_ConfigureDuress),
    authorize: t(DigitalBurnbagStrings.Wizard_Authorize),
    enter_api_key: t(DigitalBurnbagStrings.Wizard_EnterApiKey),
    configure_webhook: t(DigitalBurnbagStrings.Wizard_ConfigureWebhook),
    test_connection: t(DigitalBurnbagStrings.Wizard_TestConnection),
    complete: t(DigitalBurnbagStrings.Wizard_Complete),
  };
  return labels[step];
}

/**
 * Multi-step wizard for connecting a new provider.
 */
export function ProviderRegistrationWizard({
  open,
  onClose,
  onComplete,
  apiClient,
  providersByCategory,
  isLoadingProviders,
}: IProviderRegistrationWizardProps) {
  const { tBranded: t } = useI18n();

  // Wizard state
  const [currentStep, setCurrentStep] = useState<WizardStep>('select_provider');
  const [selectedProvider, setSelectedProvider] =
    useState<IApiProviderDisplayInfoDTO | null>(null);
  const [authMethod, setAuthMethod] = useState<
    'oauth' | 'api_key' | 'webhook' | null
  >(null);
  const [absenceConfig, setAbsenceConfig] = useState<IAbsenceConfig>({
    thresholdDays: 7,
    gracePeriodHours: 24,
    sendWarnings: true,
    warningDays: [3, 1],
  });
  const [duressConfig, setDuressConfig] = useState<IDuressConfig>({
    enabled: false,
    keywords: ['help', 'duress', 'sos'],
    patterns: [],
  });
  const [apiKey, setApiKey] = useState('');
  const [webhookConfig, setWebhookConfig] =
    useState<IApiSetupWebhookResponseDTO | null>(null);
  const [testResult, setTestResult] =
    useState<IApiTestConnectionResponseDTO | null>(null);
  const [connection, setConnection] =
    useState<IApiProviderConnectionDTO | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setCurrentStep('select_provider');
      setSelectedProvider(null);
      setAuthMethod(null);
      setApiKey('');
      setWebhookConfig(null);
      setTestResult(null);
      setConnection(null);
      setError(null);
    }
  }, [open]);

  // Determine which steps to show based on selected provider
  const getVisibleSteps = useCallback((): WizardStep[] => {
    if (!selectedProvider) return ['select_provider'];

    const steps: WizardStep[] = [
      'select_provider',
      'review_permissions',
      'configure_absence',
    ];

    // Add duress step only if provider might support it
    if (selectedProvider.requiresOAuth || selectedProvider.supportsApiKey) {
      steps.push('configure_duress');
    }

    // Add auth step based on method
    if (authMethod === 'oauth') {
      steps.push('authorize');
    } else if (authMethod === 'api_key') {
      steps.push('enter_api_key');
    } else if (authMethod === 'webhook') {
      steps.push('configure_webhook');
    } else if (selectedProvider.requiresOAuth) {
      steps.push('authorize');
    } else if (selectedProvider.supportsApiKey) {
      steps.push('enter_api_key');
    } else if (selectedProvider.supportsWebhook) {
      steps.push('configure_webhook');
    }

    steps.push('test_connection', 'complete');
    return steps;
  }, [selectedProvider, authMethod]);

  const visibleSteps = getVisibleSteps();
  const currentStepIndex = visibleSteps.indexOf(currentStep);

  const handleSelectProvider = (provider: IApiProviderDisplayInfoDTO) => {
    setSelectedProvider(provider);
    // Auto-select auth method
    if (provider.requiresOAuth) {
      setAuthMethod('oauth');
    } else if (provider.supportsApiKey) {
      setAuthMethod('api_key');
    } else if (provider.supportsWebhook) {
      setAuthMethod('webhook');
    }
  };

  const handleNext = async () => {
    setError(null);
    const nextIndex = currentStepIndex + 1;
    if (nextIndex >= visibleSteps.length) return;

    const nextStep = visibleSteps[nextIndex];

    // Handle special transitions
    if (nextStep === 'authorize' && authMethod === 'oauth') {
      await handleOAuthFlow();
      return;
    }

    if (nextStep === 'configure_webhook' && authMethod === 'webhook') {
      await handleSetupWebhook();
    }

    if (currentStep === 'enter_api_key' && authMethod === 'api_key') {
      await handleApiKeyConnect();
      return;
    }

    setCurrentStep(nextStep);
  };

  const handleBack = () => {
    const prevIndex = currentStepIndex - 1;
    if (prevIndex >= 0) {
      setCurrentStep(visibleSteps[prevIndex]);
    }
  };

  const handleOAuthFlow = async () => {
    if (!selectedProvider) return;
    setIsLoading(true);
    try {
      const response = await apiClient.initiateOAuth(
        selectedProvider.id,
        window.location.href,
      );
      // Redirect to OAuth provider
      window.location.href = response.authorizationUrl;
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(DigitalBurnbagStrings.OAuth_Failed),
      );
      setIsLoading(false);
    }
  };

  const handleApiKeyConnect = async () => {
    if (!selectedProvider || !apiKey) return;
    setIsLoading(true);
    try {
      const conn = await apiClient.connectWithApiKey(
        selectedProvider.id,
        apiKey,
      );
      setConnection(conn);
      setCurrentStep('test_connection');
      await handleTestConnection(conn.id);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to connect');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSetupWebhook = async () => {
    if (!selectedProvider) return;
    setIsLoading(true);
    try {
      const config = await apiClient.setupWebhook(selectedProvider.id);
      setWebhookConfig(config);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to setup webhook');
    } finally {
      setIsLoading(false);
    }
  };

  const handleTestConnection = async (connectionId?: string) => {
    const connId = connectionId || connection?.id;
    if (!connId) return;
    setIsLoading(true);
    try {
      const result = await apiClient.testConnection(connId);
      setTestResult(result);
      if (result.success) {
        setCurrentStep('complete');
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : t(DigitalBurnbagStrings.Test_Failed),
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleComplete = () => {
    if (connection) {
      onComplete(connection);
    }
    onClose();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  // Render step content
  const renderStepContent = () => {
    switch (currentStep) {
      case 'select_provider':
        return (
          <ProviderList
            providersByCategory={providersByCategory}
            isLoading={isLoadingProviders}
            selectedProviderId={selectedProvider?.id}
            onSelectProvider={handleSelectProvider}
          />
        );

      case 'review_permissions':
        return selectedProvider ? (
          <Box>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
              <Box
                sx={{
                  width: 56,
                  height: 56,
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: selectedProvider.brandColor
                    ? `${selectedProvider.brandColor}15`
                    : 'action.hover',
                  color: selectedProvider.brandColor || 'text.primary',
                  fontSize: '1.5rem',
                }}
              >
                <i className={selectedProvider.icon} />
              </Box>
              <Box>
                <Typography variant="h6">{selectedProvider.name}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {selectedProvider.description}
                </Typography>
              </Box>
            </Box>

            <Typography variant="subtitle2" gutterBottom>
              {t(DigitalBurnbagStrings.Wizard_ReviewPermissionsDesc)}
            </Typography>
            <Typography variant="body2" sx={{ mb: 2 }}>
              {selectedProvider.dataAccessDescription}
            </Typography>

            {selectedProvider.requestedScopes.length > 0 && (
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Requested permissions:
                </Typography>
                <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
                  {selectedProvider.requestedScopes.map((scope) => (
                    <Chip
                      key={scope}
                      label={scope}
                      size="small"
                      variant="outlined"
                    />
                  ))}
                </Box>
              </Box>
            )}

            {selectedProvider.privacyPolicyUrl && (
              <Typography variant="body2">
                <a
                  href={selectedProvider.privacyPolicyUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  View privacy policy
                </a>
              </Typography>
            )}

            {/* Auth method selection if multiple options */}
            {(selectedProvider.requiresOAuth &&
              selectedProvider.supportsApiKey) ||
            (selectedProvider.supportsApiKey &&
              selectedProvider.supportsWebhook) ? (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>
                  Connection method:
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  {selectedProvider.requiresOAuth && (
                    <Chip
                      label="OAuth"
                      onClick={() => setAuthMethod('oauth')}
                      color={authMethod === 'oauth' ? 'primary' : 'default'}
                      variant={authMethod === 'oauth' ? 'filled' : 'outlined'}
                    />
                  )}
                  {selectedProvider.supportsApiKey && (
                    <Chip
                      label="API Key"
                      onClick={() => setAuthMethod('api_key')}
                      color={authMethod === 'api_key' ? 'primary' : 'default'}
                      variant={authMethod === 'api_key' ? 'filled' : 'outlined'}
                    />
                  )}
                  {selectedProvider.supportsWebhook && (
                    <Chip
                      label="Webhook"
                      onClick={() => setAuthMethod('webhook')}
                      color={authMethod === 'webhook' ? 'primary' : 'default'}
                      variant={authMethod === 'webhook' ? 'filled' : 'outlined'}
                    />
                  )}
                </Box>
              </Box>
            ) : null}
          </Box>
        ) : null;

      case 'configure_absence':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t(DigitalBurnbagStrings.Wizard_ConfigureAbsenceDesc)}
            </Typography>

            <TextField
              label={t(DigitalBurnbagStrings.Absence_ThresholdLabel)}
              type="number"
              value={absenceConfig.thresholdDays}
              onChange={(e) =>
                setAbsenceConfig((c) => ({
                  ...c,
                  thresholdDays: parseInt(e.target.value) || 7,
                }))
              }
              helperText={t(DigitalBurnbagStrings.Absence_ThresholdHelp)}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {t(DigitalBurnbagStrings.Absence_Days)}
                  </InputAdornment>
                ),
              }}
            />

            <TextField
              label={t(DigitalBurnbagStrings.Absence_GracePeriodLabel)}
              type="number"
              value={absenceConfig.gracePeriodHours}
              onChange={(e) =>
                setAbsenceConfig((c) => ({
                  ...c,
                  gracePeriodHours: parseInt(e.target.value) || 24,
                }))
              }
              helperText={t(DigitalBurnbagStrings.Absence_GracePeriodHelp)}
              fullWidth
              margin="normal"
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    {t(DigitalBurnbagStrings.Absence_Hours)}
                  </InputAdornment>
                ),
              }}
            />

            <FormControlLabel
              control={
                <Switch
                  checked={absenceConfig.sendWarnings}
                  onChange={(e) =>
                    setAbsenceConfig((c) => ({
                      ...c,
                      sendWarnings: e.target.checked,
                    }))
                  }
                />
              }
              label={t(DigitalBurnbagStrings.Absence_SendWarnings)}
              sx={{ mt: 2 }}
            />

            {absenceConfig.sendWarnings && (
              <TextField
                label={t(DigitalBurnbagStrings.Absence_WarningDaysLabel)}
                value={absenceConfig.warningDays.join(', ')}
                onChange={(e) =>
                  setAbsenceConfig((c) => ({
                    ...c,
                    warningDays: e.target.value
                      .split(',')
                      .map((s) => parseInt(s.trim()))
                      .filter((n) => !isNaN(n)),
                  }))
                }
                helperText={t(DigitalBurnbagStrings.Absence_WarningDaysHelp)}
                fullWidth
                margin="normal"
              />
            )}
          </Box>
        );

      case 'configure_duress':
        return (
          <Box>
            <FormControlLabel
              control={
                <Switch
                  checked={duressConfig.enabled}
                  onChange={(e) =>
                    setDuressConfig((c) => ({
                      ...c,
                      enabled: e.target.checked,
                    }))
                  }
                />
              }
              label={t(DigitalBurnbagStrings.Duress_EnableLabel)}
            />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              {t(DigitalBurnbagStrings.Duress_EnableHelp)}
            </Typography>

            {duressConfig.enabled && (
              <>
                <TextField
                  label={t(DigitalBurnbagStrings.Duress_KeywordsLabel)}
                  value={duressConfig.keywords.join(', ')}
                  onChange={(e) =>
                    setDuressConfig((c) => ({
                      ...c,
                      keywords: e.target.value
                        .split(',')
                        .map((s) => s.trim())
                        .filter(Boolean),
                    }))
                  }
                  helperText={t(DigitalBurnbagStrings.Duress_KeywordsHelp)}
                  fullWidth
                  margin="normal"
                />

                <TextField
                  label={t(DigitalBurnbagStrings.Duress_PatternsLabel)}
                  value={duressConfig.patterns.join('\n')}
                  onChange={(e) =>
                    setDuressConfig((c) => ({
                      ...c,
                      patterns: e.target.value.split('\n').filter(Boolean),
                    }))
                  }
                  helperText={t(DigitalBurnbagStrings.Duress_PatternsHelp)}
                  fullWidth
                  margin="normal"
                  multiline
                  rows={3}
                />
              </>
            )}
          </Box>
        );

      case 'enter_api_key':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t(DigitalBurnbagStrings.Wizard_EnterApiKeyDesc)}
            </Typography>

            <TextField
              label={t(DigitalBurnbagStrings.ApiKey_Label)}
              placeholder={t(DigitalBurnbagStrings.ApiKey_Placeholder)}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              helperText={t(DigitalBurnbagStrings.ApiKey_Help)}
              fullWidth
              margin="normal"
              type="password"
            />

            {selectedProvider?.appSettingsUrl && (
              <Typography variant="body2" sx={{ mt: 2 }}>
                <a
                  href={selectedProvider.appSettingsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {t(DigitalBurnbagStrings.ApiKey_WhereToFind)} →
                </a>
              </Typography>
            )}
          </Box>
        );

      case 'configure_webhook':
        return (
          <Box>
            <Typography variant="subtitle1" gutterBottom>
              {t(DigitalBurnbagStrings.Wizard_ConfigureWebhookDesc)}
            </Typography>

            {webhookConfig ? (
              <>
                <TextField
                  label={t(DigitalBurnbagStrings.Webhook_UrlLabel)}
                  value={webhookConfig.webhookUrl}
                  fullWidth
                  margin="normal"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip
                          title={t(DigitalBurnbagStrings.Webhook_CopyUrl)}
                        >
                          <IconButton
                            onClick={() =>
                              copyToClipboard(webhookConfig.webhookUrl)
                            }
                            size="small"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  helperText={t(DigitalBurnbagStrings.Webhook_UrlHelp)}
                />

                <TextField
                  label={t(DigitalBurnbagStrings.Webhook_SecretLabel)}
                  value={webhookConfig.webhookSecret}
                  fullWidth
                  margin="normal"
                  type="password"
                  InputProps={{
                    readOnly: true,
                    endAdornment: (
                      <InputAdornment position="end">
                        <Tooltip
                          title={t(DigitalBurnbagStrings.Webhook_CopySecret)}
                        >
                          <IconButton
                            onClick={() =>
                              copyToClipboard(webhookConfig.webhookSecret)
                            }
                            size="small"
                          >
                            <ContentCopyIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                      </InputAdornment>
                    ),
                  }}
                  helperText={t(DigitalBurnbagStrings.Webhook_SecretHelp)}
                />

                <Alert severity="info" sx={{ mt: 2 }}>
                  {webhookConfig.instructions}
                </Alert>
              </>
            ) : (
              <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                <CircularProgress />
              </Box>
            )}
          </Box>
        );

      case 'test_connection':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            {isLoading ? (
              <>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography>{t(DigitalBurnbagStrings.Test_Running)}</Typography>
              </>
            ) : testResult ? (
              <>
                {testResult.success ? (
                  <CheckCircleIcon
                    color="success"
                    sx={{ fontSize: 64, mb: 2 }}
                  />
                ) : (
                  <ErrorIcon color="error" sx={{ fontSize: 64, mb: 2 }} />
                )}
                <Typography variant="h6" gutterBottom>
                  {testResult.success
                    ? t(DigitalBurnbagStrings.Test_Success)
                    : t(DigitalBurnbagStrings.Test_Failed)}
                </Typography>
                {testResult.providerUserInfo && (
                  <Typography color="text.secondary">
                    {t(DigitalBurnbagStrings.Test_UserInfo).replace(
                      '{username}',
                      testResult.providerUserInfo.displayName ||
                        testResult.providerUserInfo.username ||
                        testResult.providerUserInfo.userId,
                    )}
                  </Typography>
                )}
                <Typography variant="caption" color="text.secondary">
                  {t(DigitalBurnbagStrings.Test_ResponseTime).replace(
                    '{ms}',
                    String(testResult.responseTimeMs),
                  )}
                </Typography>
                {testResult.error && (
                  <Alert severity="error" sx={{ mt: 2 }}>
                    {testResult.error}
                  </Alert>
                )}
                {!testResult.success && (
                  <Button
                    variant="outlined"
                    onClick={() => handleTestConnection()}
                    sx={{ mt: 2 }}
                  >
                    {t(DigitalBurnbagStrings.Common_Retry)}
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="contained"
                onClick={() => handleTestConnection()}
              >
                {t(DigitalBurnbagStrings.Common_Test)}
              </Button>
            )}
          </Box>
        );

      case 'complete':
        return (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <CheckCircleIcon color="success" sx={{ fontSize: 64, mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              {t(DigitalBurnbagStrings.Wizard_CompleteDesc)}
            </Typography>
            {selectedProvider && (
              <Typography color="text.secondary">
                {selectedProvider.name} is now connected and monitoring your
                activity.
              </Typography>
            )}
          </Box>
        );

      default:
        return null;
    }
  };

  const canProceed = () => {
    switch (currentStep) {
      case 'select_provider':
        return selectedProvider !== null;
      case 'review_permissions':
        return authMethod !== null;
      case 'enter_api_key':
        return apiKey.length > 0;
      case 'configure_webhook':
        return webhookConfig !== null;
      case 'test_connection':
        return testResult?.success === true;
      default:
        return true;
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      PaperProps={{ sx: { minHeight: '70vh' } }}
    >
      <DialogTitle>{t(DigitalBurnbagStrings.Provider_AddProvider)}</DialogTitle>

      {isLoading && <LinearProgress />}

      <DialogContent dividers>
        {/* Stepper */}
        <Stepper activeStep={currentStepIndex} sx={{ mb: 3 }}>
          {visibleSteps.map((step) => (
            <Step key={step}>
              <StepLabel>{getStepLabel(step, t)}</StepLabel>
            </Step>
          ))}
        </Stepper>

        {/* Error alert */}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }} onClose={() => setError(null)}>
            {error}
          </Alert>
        )}

        {/* Step content */}
        {renderStepContent()}
      </DialogContent>

      <DialogActions>
        <Button onClick={onClose}>
          {t(DigitalBurnbagStrings.Canary_Cancel)}
        </Button>
        <Box sx={{ flex: 1 }} />
        {currentStepIndex > 0 && currentStep !== 'complete' && (
          <Button onClick={handleBack} disabled={isLoading}>
            {t(DigitalBurnbagStrings.Common_Back)}
          </Button>
        )}
        {currentStep === 'complete' ? (
          <Button variant="contained" onClick={handleComplete}>
            {t(DigitalBurnbagStrings.Common_Finish)}
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleNext}
            disabled={!canProceed() || isLoading}
          >
            {currentStep === 'authorize'
              ? t(DigitalBurnbagStrings.Common_Connect)
              : t(DigitalBurnbagStrings.Common_Next)}
          </Button>
        )}
      </DialogActions>
    </Dialog>
  );
}
