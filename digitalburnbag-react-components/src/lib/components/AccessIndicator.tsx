/**
 * AccessIndicator — Shows who has access to a file or folder.
 *
 * Displays a compact visual summary:
 * - "Only you" when no one else has access
 * - Avatar initials + count when shared with others
 * Clicking opens the full permissions view.
 */
import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import LockPersonIcon from '@mui/icons-material/LockPerson';
import PeopleIcon from '@mui/icons-material/People';
import {
  Avatar,
  AvatarGroup,
  Box,
  Chip,
  Tooltip,
  Typography,
} from '@mui/material';

export interface IAccessPrincipal {
  id: string;
  name: string;
  /** Single letter or two-letter initials */
  initials?: string;
  avatarUrl?: string;
}

export interface IAccessIndicatorProps {
  /** List of users/groups who have access (excluding the owner) */
  sharedWith: IAccessPrincipal[];
  /** When true, the item is only accessible by the owner */
  isPrivate: boolean;
  /** Called when the user clicks to view full access details */
  onViewAccess?: () => void;
  /** Max avatars to show before "+N" overflow */
  maxAvatars?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase();
}

export function AccessIndicator({
  sharedWith,
  isPrivate,
  onViewAccess,
  maxAvatars = 3,
}: IAccessIndicatorProps) {
  const { tBranded: t } = useI18n();

  if (isPrivate || sharedWith.length === 0) {
    return (
      <Tooltip title={t(DigitalBurnbagStrings.Access_OnlyYou)}>
        <Chip
          icon={<LockPersonIcon fontSize="small" />}
          label={t(DigitalBurnbagStrings.Access_OnlyYou)}
          size="small"
          variant="outlined"
          color="default"
          onClick={onViewAccess}
          sx={{ cursor: onViewAccess ? 'pointer' : 'default' }}
        />
      </Tooltip>
    );
  }

  const names = sharedWith.map((p) => p.name).join(', ');
  const tooltipText = `${t(DigitalBurnbagStrings.Access_SharedWith)}: ${names}`;

  return (
    <Tooltip title={tooltipText}>
      <Box
        sx={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 0.5,
          cursor: onViewAccess ? 'pointer' : 'default',
        }}
        onClick={onViewAccess}
        role={onViewAccess ? 'button' : undefined}
        tabIndex={onViewAccess ? 0 : undefined}
        aria-label={tooltipText}
      >
        <PeopleIcon fontSize="small" color="action" />
        <AvatarGroup
          max={maxAvatars}
          sx={{
            '& .MuiAvatar-root': {
              width: 22,
              height: 22,
              fontSize: '0.7rem',
              border: '1px solid',
              borderColor: 'background.paper',
            },
          }}
        >
          {sharedWith.map((p) => (
            <Avatar key={p.id} src={p.avatarUrl} alt={p.name}>
              {p.initials ?? getInitials(p.name)}
            </Avatar>
          ))}
        </AvatarGroup>
        {sharedWith.length > maxAvatars && (
          <Typography variant="caption" color="text.secondary">
            +{sharedWith.length - maxAvatars}
          </Typography>
        )}
      </Box>
    </Tooltip>
  );
}

export default AccessIndicator;
