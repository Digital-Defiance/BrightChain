import { Button } from '@mui/material';
import { useState } from 'react';
import { ShareDialog } from '../../src/lib/components/ShareDialog';

export function ShareScene() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button
        variant="contained"
        onClick={() => setOpen(true)}
        data-testid="open-share"
      >
        Open Share Dialog
      </Button>
      <ShareDialog
        open={open}
        onClose={() => setOpen(false)}
        fileId="f1"
        fileName="report.pdf"
        onShareInternal={async (email, _permission) => {
          // Simulate API call
          await new Promise((r) => setTimeout(r, 300));
          if (email === 'fail@test.com') throw new Error('User not found');
        }}
        onCreateShareLink={async (options) => {
          await new Promise((r) => setTimeout(r, 300));
          const token = Math.random().toString(36).slice(2, 10);
          const fragment =
            options.encryptionMode === 'ephemeral_key_pair'
              ? '#ephemeral-private-key-abc123'
              : '';
          return {
            token,
            url: `https://burnbag.example.com/s/${token}${fragment}`,
          };
        }}
        onGetMagnetUrl={async () => {
          await new Promise((r) => setTimeout(r, 300));
          return {
            magnetUrl: 'magnet:?xt=urn:btih:abc123def456&dn=report.pdf',
          };
        }}
      />
    </>
  );
}
