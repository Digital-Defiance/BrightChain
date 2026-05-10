/**
 * EncryptionSelector — Allows the sender to choose an encryption scheme
 * (None, ECIES, S/MIME, GPG) before sending an email.
 *
 * Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.7, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7
 */

import { MessageEncryptionScheme } from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { SelectChangeEvent } from '@mui/material/Select';
import { FC, memo, useCallback, useMemo } from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface EncryptionSelectorProps {
  value: MessageEncryptionScheme;
  onChange: (scheme: MessageEncryptionScheme) => void;
  recipientWarnings?: string[];
  senderCertMissing?: boolean;
  /** Warning message shown when external (non-local) recipients are present and ECIES is selected. */
  externalRecipientWarning?: string;
  /** Whether the user has a GPG keypair configured. */
  hasGpgKey: boolean;
  /** Whether the user has an S/MIME certificate with private key configured. */
  hasSmimeCert: boolean;
  /** Whether the message has external (non-BrightChain) recipients. */
  hasExternalRecipients?: boolean;
  /** Whether the sender is missing a GPG private key for signing. */
  senderGpgKeyMissing?: boolean;
  /** Callback to open GPG setup wizard when GPG is selected but no key exists. */
  onSetupGpg?: () => void;
}

// ─── Option type ────────────────────────────────────────────────────────────

export interface EncryptionOption {
  value: MessageEncryptionScheme;
  label: string;
}

// ─── Pure utility: dynamic option filtering (exported for testing) ──────────

/**
 * Returns the available encryption options based on the user's configured
 * keys/certificates and whether external recipients are present.
 *
 * - NONE is always included
 * - GPG is always included (shows setup prompt if no key configured)
 * - S/MIME is included only when hasSmimeCert is true
 * - ECIES (RECIPIENT_KEYS) is included only when hasExternalRecipients is false
 *
 * @see Requirements 11.1–11.6
 */
export function getAvailableEncryptionOptions(
  hasGpgKey: boolean,
  hasSmimeCert: boolean,
  hasExternalRecipients?: boolean,
): EncryptionOption[] {
  const options: EncryptionOption[] = [
    { value: MessageEncryptionScheme.NONE, label: 'No Encryption' },
  ];

  if (!hasExternalRecipients) {
    options.push({
      value: MessageEncryptionScheme.RECIPIENT_KEYS,
      label: 'ECIES',
    });
  }

  // Always show GPG — wizard prompt appears if no key configured
  options.push({ value: MessageEncryptionScheme.GPG, label: 'GPG' });

  if (hasSmimeCert) {
    options.push({ value: MessageEncryptionScheme.S_MIME, label: 'S/MIME' });
  }

  return options;
}

// ─── Pure utility (exported for property testing — Property 9) ──────────────

/**
 * Returns the recipients whose addresses are NOT present in the knownKeys map.
 *
 * @param recipients - Array of recipient email addresses.
 * @param knownKeys  - Map of email address → public key string.
 * @returns Array of recipient addresses missing from knownKeys.
 */
export function findMissingRecipientKeys(
  recipients: string[],
  knownKeys: Record<string, string>,
): string[] {
  return recipients.filter(
    (addr) => !Object.prototype.hasOwnProperty.call(knownKeys, addr),
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

const EncryptionSelector: FC<EncryptionSelectorProps> = ({
  value,
  onChange,
  recipientWarnings,
  senderCertMissing,
  externalRecipientWarning,
  hasGpgKey,
  hasSmimeCert,
  hasExternalRecipients,
  senderGpgKeyMissing,
  onSetupGpg,
}) => {
  const handleChange = useCallback(
    (e: SelectChangeEvent<string>) => {
      onChange(e.target.value as MessageEncryptionScheme);
    },
    [onChange],
  );

  const { t } = useBrightMailTranslation();

  // Map encryption scheme values to translated labels
  const encryptionLabelMap = useMemo<Record<string, string>>(
    () => ({
      [MessageEncryptionScheme.NONE]: t(BrightMailStrings.Encryption_None),
      [MessageEncryptionScheme.RECIPIENT_KEYS]: t(
        BrightMailStrings.Encryption_ECIES,
      ),
      [MessageEncryptionScheme.GPG]: t(BrightMailStrings.Encryption_GPG),
      [MessageEncryptionScheme.S_MIME]: t(BrightMailStrings.Encryption_SMIME),
    }),
    [t],
  );

  const availableOptions = useMemo(
    () =>
      getAvailableEncryptionOptions(
        hasGpgKey,
        hasSmimeCert,
        hasExternalRecipients,
      ).map((opt) => ({
        ...opt,
        label: encryptionLabelMap[opt.value] ?? opt.label,
      })),
    [hasGpgKey, hasSmimeCert, hasExternalRecipients, encryptionLabelMap],
  );

  const requiresKeys =
    value === MessageEncryptionScheme.RECIPIENT_KEYS ||
    value === MessageEncryptionScheme.S_MIME ||
    value === MessageEncryptionScheme.GPG;

  const showRecipientWarning =
    requiresKeys && recipientWarnings && recipientWarnings.length > 0;

  const showSenderCertWarning =
    value === MessageEncryptionScheme.S_MIME && senderCertMissing === true;

  const showSenderGpgKeyWarning =
    value === MessageEncryptionScheme.GPG && senderGpgKeyMissing === true;

  return (
    <Box data-testid="encryption-selector">
      <FormControl size="small" sx={{ minWidth: 180 }}>
        <InputLabel id="encryption-selector-label">
          {t(BrightMailStrings.Encryption_Label)}
        </InputLabel>
        <Select
          labelId="encryption-selector-label"
          id="encryption-selector-select"
          value={value}
          label={t(BrightMailStrings.Encryption_Label)}
          onChange={handleChange}
          data-testid="encryption-select"
        >
          {availableOptions.map((opt) => (
            <MenuItem key={opt.value} value={opt.value}>
              {opt.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      {showRecipientWarning && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          data-testid="recipient-key-warning"
        >
          {t(BrightMailStrings.Encryption_MissingKeysTemplate).replace(
            '{RECIPIENTS}',
            recipientWarnings.join(', '),
          )}
        </Alert>
      )}

      {showSenderCertWarning && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          data-testid="sender-cert-warning"
        >
          {t(BrightMailStrings.Encryption_SmimeCertRequired)}
        </Alert>
      )}

      {showSenderGpgKeyWarning && (
        <Alert
          severity="warning"
          sx={{ mt: 1 }}
          data-testid="sender-gpg-key-warning"
        >
          {t(BrightMailStrings.Encryption_GpgKeyRequired)}
        </Alert>
      )}

      {value === MessageEncryptionScheme.GPG && !hasGpgKey && (
        <Alert
          severity="info"
          sx={{ mt: 1 }}
          data-testid="gpg-setup-prompt"
          action={
            onSetupGpg ? (
              <Button
                color="inherit"
                size="small"
                onClick={onSetupGpg}
                data-testid="gpg-setup-prompt-btn"
              >
                {t(BrightMailStrings.GpgWizard_Title)}
              </Button>
            ) : undefined
          }
        >
          {t(BrightMailStrings.Encryption_GpgKeyRequired)}
        </Alert>
      )}

      {externalRecipientWarning && (
        <Alert
          severity="error"
          sx={{ mt: 1 }}
          data-testid="external-recipient-encryption-warning"
          role="alert"
        >
          {externalRecipientWarning}
        </Alert>
      )}
    </Box>
  );
};

export default memo(EncryptionSelector);
