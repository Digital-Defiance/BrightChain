import { useState } from 'react';
import type {
  FileBrowserSortField,
  IBreadcrumbSegment,
  IFileBrowserItem,
  SortDirection,
} from '../../src/lib/components/FileBrowser';
import { FileBrowser } from '../../src/lib/components/FileBrowser';

const mockFiles: IFileBrowserItem[] = [
  {
    id: 'f1',
    name: 'report.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    sizeBytes: 1048576,
    modifiedAt: '2025-12-01T10:00:00Z',
    ownerId: 'alice',
  },
  {
    id: 'f2',
    name: 'photo.jpg',
    type: 'file',
    mimeType: 'image/jpeg',
    sizeBytes: 2097152,
    modifiedAt: '2025-12-02T14:30:00Z',
    ownerId: 'bob',
  },
  {
    id: 'f3',
    name: 'notes.txt',
    type: 'file',
    mimeType: 'text/plain',
    sizeBytes: 512,
    modifiedAt: '2025-12-03T09:15:00Z',
    ownerId: 'alice',
  },
  {
    id: 'd1',
    name: 'Documents',
    type: 'folder',
    sizeBytes: 0,
    modifiedAt: '2025-11-20T08:00:00Z',
    ownerId: 'alice',
  },
  {
    id: 'd2',
    name: 'Photos',
    type: 'folder',
    sizeBytes: 0,
    modifiedAt: '2025-11-25T16:00:00Z',
    ownerId: 'bob',
  },
];

const subfolderFiles: IFileBrowserItem[] = [
  {
    id: 'sf1',
    name: 'contract.docx',
    type: 'file',
    mimeType:
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    sizeBytes: 524288,
    modifiedAt: '2025-12-04T11:00:00Z',
    ownerId: 'alice',
  },
  {
    id: 'sf2',
    name: 'invoice.pdf',
    type: 'file',
    mimeType: 'application/pdf',
    sizeBytes: 131072,
    modifiedAt: '2025-12-05T13:00:00Z',
    ownerId: 'alice',
  },
];

export function FileBrowserScene() {
  const [items, setItems] = useState<IFileBrowserItem[]>(mockFiles);
  const [breadcrumbs, setBreadcrumbs] = useState<IBreadcrumbSegment[]>([
    { id: 'root', name: 'My Files' },
  ]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sortField, setSortField] = useState<FileBrowserSortField>('name');
  const [sortDir, setSortDir] = useState<SortDirection>('asc');

  return (
    <FileBrowser
      items={items}
      breadcrumbs={breadcrumbs}
      selectedIds={selected}
      sortField={sortField}
      sortDirection={sortDir}
      onSortChange={(field, dir) => {
        setSortField(field);
        setSortDir(dir);
      }}
      onSelectionChange={setSelected}
      onNavigate={(id) => {
        if (id === 'd1') {
          setItems(subfolderFiles);
          setBreadcrumbs([
            { id: 'root', name: 'My Files' },
            { id: 'd1', name: 'Documents' },
          ]);
        }
      }}
      onBreadcrumbClick={(id) => {
        if (id === 'root') {
          setItems(mockFiles);
          setBreadcrumbs([{ id: 'root', name: 'My Files' }]);
        }
      }}
      onContextAction={() => {}}
    />
  );
}
