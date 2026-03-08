/**
 * ReadingPane — Optional right-side panel for wide viewports (≥1280px).
 *
 * Displays ThreadView inline for the selected email, or a placeholder
 * when no email is selected. The parent BrightMailLayout handles
 * conditional rendering based on viewport width and provides ~40% width.
 *
 * ThreadView relies on `useParams` for the messageId, so we wrap it in
 * a MemoryRouter with the correct route to reuse all existing thread logic.
 *
 * Requirements: 1.6
 */
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { FC, memo, useMemo } from 'react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import ThreadView from './ThreadView';

export interface ReadingPaneProps {
  emailId: string | null;
}

const ReadingPane: FC<ReadingPaneProps> = ({ emailId }) => {
  // Build the initial route entry for the MemoryRouter.
  // We key the MemoryRouter on emailId so it remounts when the selection changes,
  // giving ThreadView a fresh useParams value and triggering a new fetch.
  const initialEntries = useMemo(
    () => (emailId ? [`/brightmail/thread/${emailId}`] : ['/']),
    [emailId],
  );

  if (!emailId) {
    return (
      <Box
        data-testid="reading-pane-placeholder"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Typography color="text.secondary">
          Select an email to read
        </Typography>
      </Box>
    );
  }

  return (
    <Box data-testid="reading-pane-thread" sx={{ height: '100%', overflow: 'auto', p: 2 }}>
      <MemoryRouter key={emailId} initialEntries={initialEntries}>
        <Routes>
          <Route
            path="/brightmail/thread/:messageId"
            element={<ThreadView />}
          />
        </Routes>
      </MemoryRouter>
    </Box>
  );
};

export default memo(ReadingPane);
