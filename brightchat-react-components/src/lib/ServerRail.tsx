/**
 * ServerRail — 72px vertical strip displaying server icons, Home button,
 * and Create Server button in a BrightChat-style layout.
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.7
 */
import type { IServer } from '@brightchain/brightchain-lib';
import { BrightChatStrings } from '@brightchain/brightchat-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import VerifiedUserIcon from '@mui/icons-material/VerifiedUser';
import Avatar from '@mui/material/Avatar';
import Box from '@mui/material/Box';
import Divider from '@mui/material/Divider';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import { FC, KeyboardEvent, memo, useCallback, useRef } from 'react';
import SafeFaIcon from './SafeFaIcon';

// ─── Keyboard navigation helper (exported for property-based testing) ───────

/**
 * Computes the next focused index when navigating a list with arrow keys.
 * Wraps around at both ends.
 *
 * @param currentIndex - Currently focused index
 * @param listLength - Total number of items (must be ≥ 1)
 * @param direction - 'up' or 'down'
 * @returns The new focused index
 */
export function computeNextIndex(
  currentIndex: number,
  listLength: number,
  direction: 'up' | 'down',
): number {
  if (listLength <= 0) return 0;
  if (direction === 'down') {
    return (currentIndex + 1) % listLength;
  }
  return (currentIndex - 1 + listLength) % listLength;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const SERVER_RAIL_WIDTH = 72;
const ICON_SIZE = 48;

// ─── Component ──────────────────────────────────────────────────────────────

export interface ServerRailProps {
  servers: IServer[];
  activeServerId: string | null;
  onServerSelect: (serverId: string) => void;
  onHomeClick: () => void;
  onCreateServer: () => void;
}

const ServerRail: FC<ServerRailProps> = ({
  servers,
  activeServerId,
  onServerSelect,
  onHomeClick,
  onCreateServer,
}) => {
  const { tBranded: t } = useI18n();
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);

  // Total navigable items: Home + servers + Create
  const totalItems = servers.length + 2; // Home(0), servers(1..N), Create(N+1)

  const focusItem = useCallback((index: number) => {
    const el = itemRefs.current[index];
    if (el) el.focus();
  }, []);

  const handleKeyDown = useCallback(
    (e: KeyboardEvent, currentIndex: number) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        focusItem(computeNextIndex(currentIndex, totalItems, 'down'));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        focusItem(computeNextIndex(currentIndex, totalItems, 'up'));
      }
    },
    [totalItems, focusItem],
  );

  const setRef = useCallback(
    (index: number) => (el: HTMLButtonElement | null) => {
      itemRefs.current[index] = el;
    },
    [],
  );

  return (
    <Box
      component="nav"
      aria-label={t(BrightChatStrings.Server_Rail)}
      data-testid="server-rail"
      sx={{
        width: SERVER_RAIL_WIDTH,
        minWidth: SERVER_RAIL_WIDTH,
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        py: 1,
        gap: 0.5,
        bgcolor: 'background.default',
        borderRight: 1,
        borderColor: 'divider',
        overflowY: 'auto',
        overflowX: 'hidden',
      }}
    >
      {/* Home button */}
      <Tooltip
        title={t(BrightChatStrings.Server_Rail_Home)}
        placement="right"
        arrow
      >
        <IconButton
          ref={setRef(0)}
          onClick={onHomeClick}
          onKeyDown={(e) => handleKeyDown(e, 0)}
          aria-label={t(BrightChatStrings.Server_Rail_Home)}
          sx={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: activeServerId === null ? '16px' : '50%',
            bgcolor: activeServerId === null ? 'primary.main' : 'action.hover',
            color:
              activeServerId === null ? 'primary.contrastText' : 'text.primary',
            transition: 'border-radius 0.2s',
            '&:hover': {
              borderRadius: '16px',
              bgcolor: 'primary.main',
              color: 'primary.contrastText',
            },
          }}
        >
          <HomeIcon />
        </IconButton>
      </Tooltip>

      <Divider flexItem sx={{ mx: 2, my: 0.5 }} />

      {/* Server icons */}
      {servers.map((server, idx) => {
        const isActive = server.id === activeServerId;
        const itemIndex = idx + 1;

        return (
          <Box key={server.id} sx={{ position: 'relative' }}>
            {/* Active pill indicator */}
            {isActive && (
              <Box
                sx={{
                  position: 'absolute',
                  left: 0,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  width: 4,
                  height: 40,
                  borderRadius: '0 4px 4px 0',
                  bgcolor: 'text.primary',
                }}
              />
            )}
            <Tooltip
              title={`${server.name} · ${t(BrightChatStrings.Encryption_ServerEncrypted)}`}
              placement="right"
              arrow
            >
              <IconButton
                ref={setRef(itemIndex)}
                onClick={() => onServerSelect(server.id)}
                onKeyDown={(e) => handleKeyDown(e, itemIndex)}
                aria-label={server.name}
                aria-current={isActive ? 'true' : undefined}
                sx={{
                  width: ICON_SIZE,
                  height: ICON_SIZE,
                  p: 0,
                  borderRadius: isActive ? '16px' : '50%',
                  overflow: 'hidden',
                  transition: 'border-radius 0.2s',
                  '&:hover': {
                    borderRadius: '16px',
                  },
                }}
              >
                {server.iconFaClass ? (
                  <Avatar
                    sx={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      bgcolor: isActive ? 'primary.main' : 'action.hover',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      fontSize: 18,
                    }}
                  >
                    <SafeFaIcon className={server.iconFaClass} />
                  </Avatar>
                ) : server.iconUrl ? (
                  <Avatar
                    src={server.iconUrl}
                    alt={server.name}
                    sx={{ width: ICON_SIZE, height: ICON_SIZE }}
                  />
                ) : (
                  <Avatar
                    sx={{
                      width: ICON_SIZE,
                      height: ICON_SIZE,
                      bgcolor: isActive ? 'primary.main' : 'action.hover',
                      color: isActive ? 'primary.contrastText' : 'text.primary',
                      fontSize: 16,
                      fontWeight: 600,
                    }}
                  >
                    {server.name.charAt(0).toUpperCase()}
                  </Avatar>
                )}
              </IconButton>
            </Tooltip>
            {/* Shield badge — encryption indicator */}
            <Box
              aria-label={t(BrightChatStrings.Encryption_EncryptedServer)}
              data-testid="encryption-badge-server"
              sx={{
                position: 'absolute',
                bottom: 0,
                right: 0,
                width: 16,
                height: 16,
                borderRadius: '50%',
                bgcolor: 'success.main',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
              }}
            >
              <VerifiedUserIcon sx={{ fontSize: 10, color: '#fff' }} />
            </Box>
          </Box>
        );
      })}

      <Divider flexItem sx={{ mx: 2, my: 0.5 }} />

      {/* Create Server button */}
      <Tooltip
        title={t(BrightChatStrings.Server_Rail_CreateServer)}
        placement="right"
        arrow
      >
        <IconButton
          ref={setRef(servers.length + 1)}
          onClick={onCreateServer}
          onKeyDown={(e) => handleKeyDown(e, servers.length + 1)}
          aria-label={t(BrightChatStrings.Server_Rail_CreateServer)}
          sx={{
            width: ICON_SIZE,
            height: ICON_SIZE,
            borderRadius: '50%',
            bgcolor: 'action.hover',
            color: 'success.main',
            transition: 'border-radius 0.2s',
            '&:hover': {
              borderRadius: '16px',
              bgcolor: 'success.main',
              color: 'success.contrastText',
            },
          }}
        >
          <AddIcon />
        </IconButton>
      </Tooltip>
    </Box>
  );
};

export default memo(ServerRail);
