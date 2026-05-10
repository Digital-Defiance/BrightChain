import { Box, Typography } from '@mui/material';
import { NotificationPanel } from '../../src/lib/components/NotificationPanel';
import { PresenceIndicator } from '../../src/lib/components/PresenceIndicator';

export function PresenceScene() {
  return (
    <Box>
      <Typography variant="h6" gutterBottom>
        Presence Indicators
      </Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 4 }}>
        <PresenceIndicator
          viewers={[
            { userId: 'u1', username: 'Alice', avatarUrl: undefined },
            { userId: 'u2', username: 'Bob', avatarUrl: undefined },
          ]}
        />
      </Box>
      <Typography variant="h6" gutterBottom>
        Notifications
      </Typography>
      <NotificationPanel
        notifications={[
          {
            id: 'n1',
            message: 'Bob shared "report.pdf" with you',
            timestamp: '2025-12-10T10:00:00Z',
            read: false,
          },
          {
            id: 'n2',
            message: 'Carol accessed "photo.jpg"',
            timestamp: '2025-12-10T09:30:00Z',
            read: false,
          },
          {
            id: 'n3',
            message: '"old-draft.txt" was destroyed',
            timestamp: '2025-12-09T15:00:00Z',
            read: true,
          },
        ]}
        onMarkRead={() => {}}
      />
    </Box>
  );
}
