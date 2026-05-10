import {
  DigitalBurnbagStrings,
  ProviderCategory,
} from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';

export interface ICustomProviderFormData {
  id: string;
  name: string;
  description: string;
  category: ProviderCategory;
  baseUrl: string;
  authType: 'oauth2' | 'api_key' | 'webhook';
  activityEndpointPath: string;
  activityEndpointMethod: 'GET' | 'POST';
  responseMappingEventsPath: string;
  responseMappingTimestampPath: string;
  responseMappingTimestampFormat: string;
}

export interface ICustomProviderFormProps {
  initialData?: Partial<ICustomProviderFormData>;
  onSave: (data: ICustomProviderFormData) => Promise<void>;
  onImportJson: (json: string) => void;
  onExportJson: () => string;
}

const DEFAULT_FORM_DATA: ICustomProviderFormData = {
  id: '',
  name: '',
  description: '',
  category: ProviderCategory.OTHER,
  baseUrl: '',
  authType: 'api_key',
  activityEndpointPath: '/api/activity',
  activityEndpointMethod: 'GET',
  responseMappingEventsPath: 'data.events',
  responseMappingTimestampPath: 'timestamp',
  responseMappingTimestampFormat: 'iso8601',
};

/**
 * Form for creating/editing custom ICanaryProviderConfig JSON configurations.
 */
export function CustomProviderForm({
  initialData,
  onSave,
  onImportJson,
  onExportJson,
}: ICustomProviderFormProps) {
  const { tBranded: t } = useI18n();
  const [formData, setFormData] = useState<ICustomProviderFormData>({
    ...DEFAULT_FORM_DATA,
    ...initialData,
  });
  const [isSaving, setIsSaving] = useState(false);

  const updateField = <K extends keyof ICustomProviderFormData>(
    field: K,
    value: ICustomProviderFormData[K],
  ) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      await onSave(formData);
    } finally {
      setIsSaving(false);
    }
  };

  const handleImport = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = () => onImportJson(reader.result as string);
        reader.readAsText(file);
      }
    };
    input.click();
  };

  const handleExport = () => {
    const json = onExportJson();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${formData.id || 'custom-provider'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const categoryOptions = Object.values(ProviderCategory);

  return (
    <Box data-testid="custom-provider-form">
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t(DigitalBurnbagStrings.CustomProvider_Title)}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            onClick={handleImport}
            data-testid="import-json-button"
          >
            {t(DigitalBurnbagStrings.CustomProvider_ImportJson)}
          </Button>
          <Button
            variant="outlined"
            size="small"
            onClick={handleExport}
            data-testid="export-json-button"
          >
            {t(DigitalBurnbagStrings.CustomProvider_ExportJson)}
          </Button>
        </Box>
      </Box>

      <Card variant="outlined">
        <CardContent>
          {/* Basic Info */}
          <TextField
            fullWidth
            label="Provider ID"
            value={formData.id}
            onChange={(e) => updateField('id', e.target.value)}
            sx={{ mb: 2 }}
            data-testid="field-id"
          />
          <TextField
            fullWidth
            label={t(DigitalBurnbagStrings.CustomProvider_Name)}
            value={formData.name}
            onChange={(e) => updateField('name', e.target.value)}
            sx={{ mb: 2 }}
            data-testid="field-name"
          />
          <TextField
            fullWidth
            label={t(DigitalBurnbagStrings.CustomProvider_Description)}
            value={formData.description}
            onChange={(e) => updateField('description', e.target.value)}
            multiline
            rows={2}
            sx={{ mb: 2 }}
            data-testid="field-description"
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {t(DigitalBurnbagStrings.CustomProvider_Category)}
            </InputLabel>
            <Select
              value={formData.category}
              label={t(DigitalBurnbagStrings.CustomProvider_Category)}
              onChange={(e) =>
                updateField('category', e.target.value as ProviderCategory)
              }
              data-testid="field-category"
            >
              {categoryOptions.map((cat) => (
                <MenuItem key={cat} value={cat}>
                  {cat}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            label={t(DigitalBurnbagStrings.CustomProvider_BaseUrl)}
            value={formData.baseUrl}
            onChange={(e) => updateField('baseUrl', e.target.value)}
            placeholder="https://api.example.com"
            sx={{ mb: 2 }}
            data-testid="field-baseUrl"
          />

          {/* Auth Type */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {t(DigitalBurnbagStrings.CustomProvider_AuthType)}
            </InputLabel>
            <Select
              value={formData.authType}
              label={t(DigitalBurnbagStrings.CustomProvider_AuthType)}
              onChange={(e) =>
                updateField(
                  'authType',
                  e.target.value as 'oauth2' | 'api_key' | 'webhook',
                )
              }
              data-testid="field-authType"
            >
              <MenuItem value="oauth2">OAuth2</MenuItem>
              <MenuItem value="api_key">API Key</MenuItem>
              <MenuItem value="webhook">Webhook</MenuItem>
            </Select>
          </FormControl>

          {/* Endpoint Configuration */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t(DigitalBurnbagStrings.CustomProvider_Endpoints)}
          </Typography>
          <TextField
            fullWidth
            label="Activity Endpoint Path"
            value={formData.activityEndpointPath}
            onChange={(e) =>
              updateField('activityEndpointPath', e.target.value)
            }
            helperText="Supports placeholders: {userId}, {since}, {until}"
            sx={{ mb: 2 }}
            data-testid="field-activityPath"
          />
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>HTTP Method</InputLabel>
            <Select
              value={formData.activityEndpointMethod}
              label="HTTP Method"
              onChange={(e) =>
                updateField(
                  'activityEndpointMethod',
                  e.target.value as 'GET' | 'POST',
                )
              }
              data-testid="field-activityMethod"
            >
              <MenuItem value="GET">GET</MenuItem>
              <MenuItem value="POST">POST</MenuItem>
            </Select>
          </FormControl>

          {/* Response Mapping */}
          <Typography variant="subtitle2" sx={{ mb: 1 }}>
            {t(DigitalBurnbagStrings.CustomProvider_ResponseMapping)}
          </Typography>
          <TextField
            fullWidth
            label="Events Path (JSONPath)"
            value={formData.responseMappingEventsPath}
            onChange={(e) =>
              updateField('responseMappingEventsPath', e.target.value)
            }
            sx={{ mb: 2 }}
            data-testid="field-eventsPath"
          />
          <TextField
            fullWidth
            label="Timestamp Path"
            value={formData.responseMappingTimestampPath}
            onChange={(e) =>
              updateField('responseMappingTimestampPath', e.target.value)
            }
            sx={{ mb: 2 }}
            data-testid="field-timestampPath"
          />
          <TextField
            fullWidth
            label="Timestamp Format"
            value={formData.responseMappingTimestampFormat}
            onChange={(e) =>
              updateField('responseMappingTimestampFormat', e.target.value)
            }
            helperText="iso8601, unix, unix_ms, or custom format"
            sx={{ mb: 2 }}
            data-testid="field-timestampFormat"
          />

          {/* Save */}
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={
              isSaving || !formData.id || !formData.name || !formData.baseUrl
            }
            data-testid="save-button"
          >
            {t(DigitalBurnbagStrings.CustomProvider_Save)}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
