import { Avatar, AvatarGroup, Tooltip, Typography } from '@mui/material';

export interface IPresenceUser {
  userId: string;
  username: string;
  avatarUrl?: string;
}

export interface IPresenceIndicatorProps {
  viewers: IPresenceUser[];
}

/**
 * Displays avatars of users currently viewing the same file.
 */
export function PresenceIndicator({ viewers }: IPresenceIndicatorProps) {
  if (viewers.length === 0) return null;

  return (
    <Tooltip
      title={
        <>
          <Typography variant="caption">Currently viewing:</Typography>
          {viewers.map((v) => (
            <Typography key={v.userId} variant="caption" display="block">
              {v.username}
            </Typography>
          ))}
        </>
      }
    >
      <AvatarGroup max={5} sx={{ cursor: 'default' }}>
        {viewers.map((v) => (
          <Avatar
            key={v.userId}
            alt={v.username}
            src={v.avatarUrl}
            sx={{ width: 28, height: 28, fontSize: '0.75rem' }}
          >
            {v.username.charAt(0).toUpperCase()}
          </Avatar>
        ))}
      </AvatarGroup>
    </Tooltip>
  );
}
