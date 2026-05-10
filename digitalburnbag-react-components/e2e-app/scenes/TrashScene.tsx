import { Alert } from '@mui/material';
import { useState } from 'react';
import type { ITrashItem } from '../../src/lib/components/TrashBinView';
import { TrashBinView } from '../../src/lib/components/TrashBinView';

const initialTrash: ITrashItem[] = [
  {
    id: 't1',
    name: 'old-report.pdf',
    type: 'file',
    originalPath: '/Documents/old-report.pdf',
    deletedAt: '2025-12-01T10:00:00Z',
    autoPurgeAt: '2025-12-31T10:00:00Z',
  },
  {
    id: 't2',
    name: 'temp-folder',
    type: 'folder',
    originalPath: '/temp-folder',
    deletedAt: '2025-12-02T14:30:00Z',
    autoPurgeAt: '2026-01-01T14:30:00Z',
  },
  {
    id: 't3',
    name: 'draft.txt',
    type: 'file',
    originalPath: '/Documents/draft.txt',
    deletedAt: '2025-12-03T09:15:00Z',
    autoPurgeAt: '2026-01-02T09:15:00Z',
  },
];

export function TrashScene() {
  const [items, setItems] = useState<ITrashItem[]>(initialTrash);
  const [message, setMessage] = useState('');

  return (
    <>
      {message && (
        <Alert severity="info" sx={{ mb: 2 }} data-testid="trash-message">
          {message}
        </Alert>
      )}
      <TrashBinView
        items={items}
        onRestore={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id));
          const item = items.find((i) => i.id === id);
          setMessage(`Restored ${item?.name ?? id}`);
        }}
        onPermanentDelete={(id) => {
          setItems((prev) => prev.filter((i) => i.id !== id));
          const item = items.find((i) => i.id === id);
          setMessage(`Permanently deleted ${item?.name ?? id}`);
        }}
      />
    </>
  );
}
