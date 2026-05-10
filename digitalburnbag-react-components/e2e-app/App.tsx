import { Box, Tab, Tabs } from '@mui/material';
import { useState } from 'react';
import { CanaryScene } from './scenes/CanaryScene';
import { FileBrowserScene } from './scenes/FileBrowserScene';
import { PresenceScene } from './scenes/PresenceScene';
import { ShareScene } from './scenes/ShareScene';
import { TrashScene } from './scenes/TrashScene';
import { UploadScene } from './scenes/UploadScene';

const scenes = [
  { label: 'File Browser', component: FileBrowserScene },
  { label: 'Upload', component: UploadScene },
  { label: 'Share', component: ShareScene },
  { label: 'Trash', component: TrashScene },
  { label: 'Canary', component: CanaryScene },
  { label: 'Presence', component: PresenceScene },
] as const;

export function App() {
  const [tab, setTab] = useState(0);
  const Scene = scenes[tab].component;

  return (
    <Box sx={{ width: '100%', maxWidth: 1200, mx: 'auto', p: 2 }}>
      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        aria-label="E2E test scenes"
      >
        {scenes.map((s, i) => (
          <Tab key={i} label={s.label} />
        ))}
      </Tabs>
      <Box sx={{ mt: 2 }}>
        <Scene />
      </Box>
    </Box>
  );
}
