import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import {
  Alert,
  Autocomplete,
  Box,
  Button,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Link,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { IApiProviderConnectionDTO } from '../services/burnbag-api-client';
import { canCreateBinding } from '../utils/provider-utils';

export interface IBindingTarget {
  id: string;
  name: string;
  type: 'vault' | 'file' | 'folder';
}

export interface IBindingAssistantProps {
  connections: IApiProviderConnectionDTO[];
  availableTargets: IBindingTarget[];
  onCreateBinding: (binding: {
    providerId: string;
    condition: string;
    action: string;
    targetIds: string[];
  }) => Promise<void>;
  onNavigateToSettings: (connectionId: string) => void;
  /** For drag-and-drop: pre-selected target */
  preSelectedTarget?: IBindingTarget;
  /** For context menu: pre-selected target from right-click */
  contextMenuTarget?: IBindingTarget;
}

/**
 * UI component for creating provider-to-vault/file bindings.
 * Supports context menu integration and drag-and-drop.
 */
export function BindingAssistant({
  connections,
  availableTargets,
  onCreateBinding,
  onNavigateToSettings,
  preSelectedTarget,
  contextMenuTarget,
}: IBindingAssistantProps) {
  const { tBranded: t } = useI18n();
  const [selectedProviderId, setSelectedProviderId] = useState('');
  const [condition, setCondition] = useState('ABSENCE');
  const [action, setAction] = useState('notify');
  const [selectedTargets, setSelectedTargets] = useState<IBindingTarget[]>(
    preSelectedTarget
      ? [preSelectedTarget]
      : contextMenuTarget
        ? [contextMenuTarget]
        : [],
  );
  const [isCreating, setIsCreating] = useState(false);

  const selectedConnection = connections.find(
    (c) => c.id === selectedProviderId,
  );
  const isConnected = selectedConnection
    ? canCreateBinding(selectedConnection.status)
    : false;
  const showWarning =
    selectedConnection &&
    (selectedConnection.status === 'error' ||
      selectedConnection.status === 'expired');

  const handleCreate = async () => {
    if (!selectedProviderId || selectedTargets.length === 0) return;
    setIsCreating(true);
    try {
      await onCreateBinding({
        providerId: selectedProviderId,
        condition,
        action,
        targetIds: selectedTargets.map((t) => t.id),
      });
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Box data-testid="binding-assistant">
      <Typography variant="h6" gutterBottom>
        {t(DigitalBurnbagStrings.Binding_BindToProvider)}
      </Typography>

      <Card variant="outlined">
        <CardContent>
          {/* Provider Selection */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {t(DigitalBurnbagStrings.Binding_SelectProvider)}
            </InputLabel>
            <Select
              value={selectedProviderId}
              label={t(DigitalBurnbagStrings.Binding_SelectProvider)}
              onChange={(e) => setSelectedProviderId(e.target.value)}
              data-testid="provider-select"
            >
              {connections.map((conn) => (
                <MenuItem key={conn.id} value={conn.id}>
                  {conn.providerDisplayName ||
                    conn.providerUsername ||
                    conn.providerId}{' '}
                  ({conn.status})
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          {/* Warning for non-connected providers */}
          {showWarning && (
            <Alert
              severity="warning"
              sx={{ mb: 2 }}
              data-testid="connection-warning"
            >
              {t(DigitalBurnbagStrings.Binding_ProviderNotConnected)}
              <Link
                component="button"
                onClick={() => onNavigateToSettings(selectedConnection!.id)}
                sx={{ ml: 1 }}
              >
                {t(DigitalBurnbagStrings.Binding_FixConnection)}
              </Link>
            </Alert>
          )}

          {/* Condition */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>
              {t(DigitalBurnbagStrings.Binding_Condition)}
            </InputLabel>
            <Select
              value={condition}
              label={t(DigitalBurnbagStrings.Binding_Condition)}
              onChange={(e) => setCondition(e.target.value)}
              data-testid="condition-select"
            >
              <MenuItem value="PRESENCE">Presence</MenuItem>
              <MenuItem value="ABSENCE">Absence</MenuItem>
              <MenuItem value="DURESS">Duress</MenuItem>
            </Select>
          </FormControl>

          {/* Action */}
          <FormControl fullWidth sx={{ mb: 2 }}>
            <InputLabel>{t(DigitalBurnbagStrings.Binding_Action)}</InputLabel>
            <Select
              value={action}
              label={t(DigitalBurnbagStrings.Binding_Action)}
              onChange={(e) => setAction(e.target.value)}
              data-testid="action-select"
            >
              <MenuItem value="notify">Notify</MenuItem>
              <MenuItem value="destroy">Destroy</MenuItem>
              <MenuItem value="release">Release</MenuItem>
              <MenuItem value="lock">Lock</MenuItem>
            </Select>
          </FormControl>

          {/* Target Selection - searchable multi-select showing names */}
          <Autocomplete
            multiple
            options={availableTargets}
            getOptionLabel={(option) => option.name}
            value={selectedTargets}
            onChange={(_, newValue) => setSelectedTargets(newValue)}
            renderInput={(params) => {
              const { InputLabelProps, InputProps, ...rest } = params;
              return (
                <TextField
                  {...rest}
                  label={t(DigitalBurnbagStrings.Binding_Targets)}
                  placeholder="Search targets..."
                  slotProps={{
                    inputLabel: InputLabelProps,
                    input: {
                      ...InputProps,
                    } as Record<string, unknown>,
                  }}
                />
              );
            }}
            sx={{ mb: 2 }}
            data-testid="target-select"
          />

          {/* Create Button */}
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={
              !isConnected ||
              selectedTargets.length === 0 ||
              !selectedProviderId ||
              isCreating
            }
            data-testid="create-binding-button"
          >
            {t(DigitalBurnbagStrings.Binding_Create)}
          </Button>
        </CardContent>
      </Card>
    </Box>
  );
}
