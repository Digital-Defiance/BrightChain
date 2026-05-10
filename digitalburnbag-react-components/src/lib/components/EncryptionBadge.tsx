/**
 * EncryptionBadge — Visual indicator for file/vault encryption status.
 *
 * Shows a small colored chip with a lock icon to reassure users that their
 * data is encrypted. Supports three states:
 * - encrypted: AES-256-GCM encrypted (green lock)
 * - key_wrapped: Symmetric key wrapped for the user via ECIES (blue shield)
 * - quorum: Requires quorum approval for sensitive operations (orange group lock)
 */
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import EnhancedEncryptionIcon from '@mui/icons-material/EnhancedEncryption';
import LockIcon from '@mui/icons-material/Lock';
import SecurityIcon from '@mui/icons-material/Security';
import { Chip, type ChipProps, Tooltip } from '@mui/material';

export type EncryptionStatus = 'encrypted' | 'key_wrapped' | 'quorum';

export interface IEncryptionBadgeProps {
  status: EncryptionStatus;
  size?: ChipProps['size'];
  /** When true, shows the full label. When false, shows icon only. */
  compact?: boolean;
}

const STATUS_CONFIG: Record<
  EncryptionStatus,
  {
    color: ChipProps['color'];
    icon: React.ReactElement;
    labelKey: string;
    tooltipKey: string;
  }
> = {
  encrypted: {
    color: 'success',
    icon: <LockIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.Encryption_Encrypted,
    tooltipKey: DigitalBurnbagStrings.Encryption_EncryptedTooltip,
  },
  key_wrapped: {
    color: 'info',
    icon: <EnhancedEncryptionIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.Encryption_KeyWrapped,
    tooltipKey: DigitalBurnbagStrings.Encryption_KeyWrappedTooltip,
  },
  quorum: {
    color: 'warning',
    icon: <SecurityIcon fontSize="small" />,
    labelKey: DigitalBurnbagStrings.Encryption_ApprovalProtected,
    tooltipKey: DigitalBurnbagStrings.Encryption_ApprovalTooltip,
  },
};

export function EncryptionBadge({
  status,
  size = 'small',
  compact = false,
}: IEncryptionBadgeProps) {
  const { tBranded: t } = useI18n();
  const config = STATUS_CONFIG[status];

  const chip = compact ? (
    <Chip
      icon={config.icon}
      size={size}
      color={config.color}
      variant="outlined"
      sx={{ '& .MuiChip-label': { display: 'none' }, px: 0, minWidth: 28 }}
      aria-label={t(config.labelKey)}
    />
  ) : (
    <Chip
      icon={config.icon}
      label={t(config.labelKey)}
      size={size}
      color={config.color}
      variant="outlined"
    />
  );

  return <Tooltip title={t(config.tooltipKey)}>{chip}</Tooltip>;
}

export default EncryptionBadge;
