import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { formatDateWithBD } from '../utils/formatBrightDate';
import CreateNewFolderIcon from '@mui/icons-material/CreateNewFolder';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import FolderIcon from '@mui/icons-material/Folder';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import LockIcon from '@mui/icons-material/Lock';
import MoreHorizIcon from '@mui/icons-material/MoreHoriz';
import NavigateNextIcon from '@mui/icons-material/NavigateNext';
import {
  Box,
  Breadcrumbs,
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  LinearProgress,
  Link,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import type {
  DragEvent as ReactDragEvent,
  MouseEvent as ReactMouseEvent,
} from 'react';
import { useCallback, useState } from 'react';
import { AccessIndicator } from './AccessIndicator';
import { EncryptionBadge } from './EncryptionBadge';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export interface IFileBrowserItem {
  id: string;
  name: string;
  type: 'file' | 'folder';
  mimeType?: string;
  sizeBytes?: number;
  modifiedAt?: string;
  ownerId?: string;
  /** Encryption status for visual indicator */
  encryptionStatus?: 'encrypted' | 'key_wrapped' | 'quorum';
  /** Users/groups who have access (excluding the owner) */
  sharedWith?: Array<{
    id: string;
    name: string;
    initials?: string;
    avatarUrl?: string;
  }>;
}

export interface IBreadcrumbSegment {
  id: string;
  name: string;
}

export type FileBrowserSortField = 'name' | 'size' | 'modifiedDate' | 'type';
export type SortDirection = 'asc' | 'desc';

export interface IFileBrowserProps {
  items: IFileBrowserItem[];
  breadcrumbs: IBreadcrumbSegment[];
  selectedIds: Set<string>;
  sortField: FileBrowserSortField;
  sortDirection: SortDirection;
  onSortChange: (field: FileBrowserSortField, direction: SortDirection) => void;
  onSelectionChange: (ids: Set<string>) => void;
  onNavigate: (folderId: string) => void;
  onBreadcrumbClick: (folderId: string) => void;
  onContextAction: (action: string, itemIds: string[]) => void;
  onDrop?: (itemId: string, targetFolderId: string) => void;
  onCreateFolder?: (name: string) => void;
  /** When true, a "Paste" option is shown in the context menu. */
  showPaste?: boolean;
  loading?: boolean;
  /** Optional vault name shown as the first breadcrumb segment. */
  vaultName?: string;
  /** Called when the user clicks the access indicator to view permissions. */
  onViewAccess?: (itemId: string) => void;
  /**
   * When true, all write operations (rename, move, copy, delete,
   * upload new version, duplicate) are hidden from context menus
   * and drag-and-drop is disabled. Used for sealed vaults.
   */
  isSealed?: boolean;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB', 'TB'];
  const k = 1024;
  const i = Math.min(
    Math.floor(Math.log(bytes) / Math.log(k)),
    units.length - 1,
  );
  const value = bytes / Math.pow(k, i);
  return `${i === 0 ? value : value.toFixed(1)} ${units[i]}`;
}

function formatDate(iso: string): string {
  return formatDateWithBD(iso);
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export function FileBrowser({
  items,
  breadcrumbs,
  selectedIds,
  sortField,
  sortDirection,
  onSortChange,
  onSelectionChange,
  onNavigate,
  onBreadcrumbClick,
  onContextAction,
  onDrop,
  onCreateFolder,
  showPaste = false,
  loading = false,
  vaultName,
  onViewAccess,
  isSealed = false,
}: IFileBrowserProps) {
  const { tBranded: t } = useI18n();

  const COLUMNS: {
    field: FileBrowserSortField;
    labelKey: string;
    width?: string;
    align?: 'left' | 'right';
  }[] = [
    { field: 'name', labelKey: DigitalBurnbagStrings.FileBrowser_ColName },
    {
      field: 'size',
      labelKey: DigitalBurnbagStrings.FileBrowser_ColSize,
      width: '120px',
      align: 'right',
    },
    {
      field: 'modifiedDate',
      labelKey: DigitalBurnbagStrings.FileBrowser_ColModified,
      width: '200px',
    },
    {
      field: 'type',
      labelKey: DigitalBurnbagStrings.FileBrowser_ColType,
      width: '120px',
    },
  ];

  /** Non-sortable display columns appended after the sortable ones. */
  const EXTRA_COLUMNS = [
    {
      key: 'security',
      labelKey: DigitalBurnbagStrings.FileBrowser_ColSecurity,
      width: '100px',
    },
    {
      key: 'access',
      labelKey: DigitalBurnbagStrings.FileBrowser_ColAccess,
      width: '160px',
    },
  ];

  // Write actions are suppressed when the vault is sealed
  const WRITE_ACTIONS = new Set([
    'rename',
    'move',
    'copy',
    'paste',
    'delete',
    'uploadNewVersion',
    'duplicate',
  ]);

  const CONTEXT_ACTIONS: { action: string; labelKey: string }[] = [
    { action: 'preview', labelKey: DigitalBurnbagStrings.Action_Preview },
    ...(!isSealed
      ? [
          { action: 'rename', labelKey: DigitalBurnbagStrings.Action_Rename },
          { action: 'move', labelKey: DigitalBurnbagStrings.Action_Move },
          { action: 'copy', labelKey: DigitalBurnbagStrings.Action_Copy },
          ...(showPaste
            ? [
                {
                  action: 'paste',
                  labelKey: DigitalBurnbagStrings.Action_Paste,
                },
              ]
            : []),
          { action: 'delete', labelKey: DigitalBurnbagStrings.Action_Delete },
        ]
      : []),
    { action: 'share', labelKey: DigitalBurnbagStrings.Action_Share },
  ];

  const MORE_ACTIONS: { action: string; labelKey: string }[] = [
    { action: 'download', labelKey: DigitalBurnbagStrings.Action_Download },
    ...(!isSealed
      ? [
          {
            action: 'uploadNewVersion',
            labelKey: DigitalBurnbagStrings.Action_UploadNewVersion,
          },
          {
            action: 'duplicate',
            labelKey: DigitalBurnbagStrings.Action_Duplicate,
          },
        ]
      : []),
    { action: 'history', labelKey: DigitalBurnbagStrings.Action_History },
    {
      action: 'permissions',
      labelKey: DigitalBurnbagStrings.Action_Permissions,
    },
    {
      action: 'storageContract',
      labelKey: DigitalBurnbagStrings.Action_StorageContract,
    },
    {
      action: 'copyPathLink',
      labelKey: DigitalBurnbagStrings.Action_CopyPathLink,
    },
  ];

  const [contextMenu, setContextMenu] = useState<{
    anchor: { top: number; left: number };
    itemId: string;
  } | null>(null);
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<HTMLElement | null>(
    null,
  );
  const [lastClickedIndex, setLastClickedIndex] = useState<number | null>(null);
  const [dragItemId, setDragItemId] = useState<string | null>(null);
  const [dropTargetId, setDropTargetId] = useState<string | null>(null);
  const [newFolderDialogOpen, setNewFolderDialogOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  const handleSortClick = useCallback(
    (field: FileBrowserSortField) => {
      const newDirection =
        sortField === field && sortDirection === 'asc' ? 'desc' : 'asc';
      onSortChange(field, newDirection);
    },
    [sortField, sortDirection, onSortChange],
  );

  const allSelected =
    items.length > 0 && items.every((item) => selectedIds.has(item.id));
  const someSelected =
    items.some((item) => selectedIds.has(item.id)) && !allSelected;

  const handleSelectAll = useCallback(() => {
    onSelectionChange(
      allSelected ? new Set() : new Set(items.map((item) => item.id)),
    );
  }, [allSelected, items, onSelectionChange]);

  const handleRowSelect = useCallback(
    (index: number, event: ReactMouseEvent) => {
      const item = items[index];
      const next = new Set(selectedIds);
      if (event.shiftKey && lastClickedIndex !== null) {
        const start = Math.min(lastClickedIndex, index);
        const end = Math.max(lastClickedIndex, index);
        for (let i = start; i <= end; i++) next.add(items[i].id);
      } else if (event.ctrlKey || event.metaKey) {
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
      } else {
        if (next.has(item.id)) {
          next.delete(item.id);
        } else {
          next.add(item.id);
        }
      }
      setLastClickedIndex(index);
      onSelectionChange(next);
    },
    [items, selectedIds, lastClickedIndex, onSelectionChange],
  );

  const handleDoubleClick = useCallback(
    (item: IFileBrowserItem) => {
      if (item.type === 'folder') {
        onNavigate(item.id);
      } else {
        onContextAction('open', [item.id]);
      }
    },
    [onNavigate, onContextAction],
  );

  const handleContextMenu = useCallback(
    (event: ReactMouseEvent, itemId: string) => {
      event.preventDefault();
      if (!selectedIds.has(itemId)) onSelectionChange(new Set([itemId]));
      setContextMenu({
        anchor: { top: event.clientY, left: event.clientX },
        itemId,
      });
    },
    [selectedIds, onSelectionChange],
  );

  const handleContextAction = useCallback(
    (action: string) => {
      onContextAction(
        action,
        selectedIds.size > 0 ? Array.from(selectedIds) : [],
      );
      setContextMenu(null);
      setMoreMenuAnchor(null);
    },
    [selectedIds, onContextAction],
  );

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
    setMoreMenuAnchor(null);
  }, []);
  const handleMoreClick = useCallback(
    (event: ReactMouseEvent<HTMLLIElement>) => {
      setMoreMenuAnchor(event.currentTarget);
    },
    [],
  );
  const handleCloseMoreMenu = useCallback(() => {
    setMoreMenuAnchor(null);
  }, []);

  const handleDragStart = useCallback(
    (event: ReactDragEvent, itemId: string) => {
      if (isSealed) {
        event.preventDefault();
        return;
      }
      setDragItemId(itemId);
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', itemId);
    },
    [isSealed],
  );
  const handleDragOver = useCallback(
    (event: ReactDragEvent, item: IFileBrowserItem) => {
      if (isSealed) return;
      if (item.type === 'folder' && dragItemId && dragItemId !== item.id) {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        setDropTargetId(item.id);
      }
    },
    [dragItemId, isSealed],
  );
  const handleDragLeave = useCallback(() => {
    setDropTargetId(null);
  }, []);
  const handleDropOnRow = useCallback(
    (event: ReactDragEvent, targetItem: IFileBrowserItem) => {
      event.preventDefault();
      setDropTargetId(null);
      if (
        onDrop &&
        dragItemId &&
        targetItem.type === 'folder' &&
        dragItemId !== targetItem.id
      )
        onDrop(dragItemId, targetItem.id);
      setDragItemId(null);
    },
    [onDrop, dragItemId],
  );
  const handleDragEnd = useCallback(() => {
    setDragItemId(null);
    setDropTargetId(null);
  }, []);

  return (
    <Box>
      <Box
        sx={{
          px: 2,
          py: 1,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Breadcrumbs
          separator={<NavigateNextIcon fontSize="small" />}
          aria-label={t(DigitalBurnbagStrings.FileBrowser_FolderPath)}
        >
          {vaultName && (
            <Typography variant="body2" sx={{ fontWeight: 600 }}>
              {vaultName}
            </Typography>
          )}
          {breadcrumbs.map((segment, idx) => {
            const isLast = idx === breadcrumbs.length - 1;
            return isLast ? (
              <Typography key={segment.id} color="text.primary" variant="body2">
                {segment.name}
              </Typography>
            ) : (
              <Link
                key={segment.id}
                component="button"
                variant="body2"
                underline="hover"
                onClick={() => onBreadcrumbClick(segment.id)}
                sx={{ cursor: 'pointer' }}
              >
                {segment.name}
              </Link>
            );
          })}
        </Breadcrumbs>
        {onCreateFolder && (
          <Button
            size="small"
            variant="outlined"
            startIcon={<CreateNewFolderIcon />}
            onClick={() => setNewFolderDialogOpen(true)}
          >
            New Folder
          </Button>
        )}
      </Box>
      {loading && (
        <LinearProgress
          aria-label={t(DigitalBurnbagStrings.FileBrowser_Loading)}
        />
      )}
      <Table
        size="small"
        aria-label={t(DigitalBurnbagStrings.FileBrowser_ColName)}
      >
        <TableHead>
          <TableRow>
            <TableCell padding="checkbox" sx={{ width: 32 }} />
            <TableCell padding="checkbox">
              <Checkbox
                indeterminate={someSelected}
                checked={allSelected}
                onChange={handleSelectAll}
                inputProps={{
                  'aria-label': t(DigitalBurnbagStrings.FileBrowser_SelectAll),
                }}
                size="small"
              />
            </TableCell>
            {COLUMNS.map((col) => (
              <TableCell
                key={col.field}
                align={col.align}
                sx={col.width ? { width: col.width } : undefined}
                sortDirection={sortField === col.field ? sortDirection : false}
              >
                <TableSortLabel
                  active={sortField === col.field}
                  direction={sortField === col.field ? sortDirection : 'asc'}
                  onClick={() => handleSortClick(col.field)}
                >
                  {t(col.labelKey)}
                </TableSortLabel>
              </TableCell>
            ))}
            {EXTRA_COLUMNS.map((col) => (
              <TableCell key={col.key} sx={{ width: col.width }}>
                {t(col.labelKey)}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>
        <TableBody>
          {items.length === 0 && !loading ? (
            <TableRow>
              <TableCell
                colSpan={COLUMNS.length + EXTRA_COLUMNS.length + 2}
                align="center"
              >
                <Typography variant="body2" color="text.secondary" py={4}>
                  {t(DigitalBurnbagStrings.FileBrowser_EmptyFolder)}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            items.map((item, index) => {
              const isSelected = selectedIds.has(item.id);
              const isDropTarget = dropTargetId === item.id;
              return (
                <TableRow
                  key={item.id}
                  hover
                  selected={isSelected}
                  onContextMenu={(e) => handleContextMenu(e, item.id)}
                  onDoubleClick={() => handleDoubleClick(item)}
                  draggable
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item)}
                  onDragLeave={handleDragLeave}
                  onDrop={(e) => handleDropOnRow(e, item)}
                  onDragEnd={handleDragEnd}
                  sx={{
                    cursor: 'default',
                    ...(isDropTarget && {
                      outline: '2px dashed',
                      outlineColor: 'primary.main',
                      backgroundColor: 'action.hover',
                    }),
                  }}
                >
                  <TableCell padding="checkbox" sx={{ width: 32 }}>
                    <DragIndicatorIcon
                      fontSize="small"
                      sx={{ color: 'text.disabled', cursor: 'grab' }}
                      aria-hidden
                    />
                  </TableCell>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isSelected}
                      onClick={(e) => handleRowSelect(index, e)}
                      inputProps={{ 'aria-label': `Select ${item.name}` }}
                      size="small"
                    />
                  </TableCell>
                  <TableCell>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      {item.type === 'folder' ? (
                        <FolderIcon
                          fontSize="small"
                          color="action"
                          aria-hidden
                        />
                      ) : (
                        <InsertDriveFileIcon
                          fontSize="small"
                          color="action"
                          aria-hidden
                        />
                      )}
                      <Typography variant="body2" noWrap>
                        {item.name}
                      </Typography>
                      {item.type === 'file' && (
                        <Tooltip
                          title={t(
                            DigitalBurnbagStrings.Encryption_EncryptedTooltip,
                          )}
                        >
                          <LockIcon
                            sx={{
                              fontSize: 14,
                              color: 'success.main',
                              ml: 0.5,
                            }}
                            aria-hidden
                          />
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                  <TableCell align="right">
                    <Typography variant="body2" color="text.secondary">
                      {item.type === 'file' && item.sizeBytes != null
                        ? formatBytes(item.sizeBytes)
                        : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.modifiedAt ? formatDate(item.modifiedAt) : '—'}
                    </Typography>
                  </TableCell>
                  <TableCell>
                    <Typography variant="body2" color="text.secondary">
                      {item.type === 'folder'
                        ? t(DigitalBurnbagStrings.FileBrowser_TypeFolder)
                        : (item.mimeType ??
                          t(DigitalBurnbagStrings.FileBrowser_TypeFile))}
                    </Typography>
                  </TableCell>
                  {/* Security column */}
                  <TableCell>
                    {item.encryptionStatus && (
                      <EncryptionBadge status={item.encryptionStatus} compact />
                    )}
                  </TableCell>
                  {/* Access column */}
                  <TableCell>
                    <AccessIndicator
                      sharedWith={item.sharedWith ?? []}
                      isPrivate={
                        !item.sharedWith || item.sharedWith.length === 0
                      }
                      onViewAccess={
                        onViewAccess ? () => onViewAccess(item.id) : undefined
                      }
                    />
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
      <Menu
        open={contextMenu !== null}
        onClose={handleCloseContextMenu}
        anchorReference="anchorPosition"
        anchorPosition={
          contextMenu
            ? { top: contextMenu.anchor.top, left: contextMenu.anchor.left }
            : undefined
        }
      >
        {CONTEXT_ACTIONS.map(({ action, labelKey }) => (
          <MenuItem key={action} onClick={() => handleContextAction(action)}>
            {t(labelKey)}
          </MenuItem>
        ))}
        <Divider />
        <MenuItem onClick={handleMoreClick}>
          <MoreHorizIcon fontSize="small" sx={{ mr: 1 }} />
          {t(DigitalBurnbagStrings.Action_More)}
        </MenuItem>
      </Menu>
      <Menu
        open={Boolean(moreMenuAnchor)}
        anchorEl={moreMenuAnchor}
        onClose={handleCloseMoreMenu}
        anchorOrigin={{ vertical: 'top', horizontal: 'right' }}
        transformOrigin={{ vertical: 'top', horizontal: 'left' }}
      >
        {MORE_ACTIONS.map(({ action, labelKey }) => (
          <MenuItem key={action} onClick={() => handleContextAction(action)}>
            {t(labelKey)}
          </MenuItem>
        ))}
      </Menu>
      {/* New Folder dialog */}
      <Dialog
        open={newFolderDialogOpen}
        onClose={() => {
          setNewFolderDialogOpen(false);
          setNewFolderName('');
        }}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>New Folder</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="dense"
            label="Folder name"
            value={newFolderName}
            onChange={(e) => setNewFolderName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && newFolderName.trim()) {
                onCreateFolder?.(newFolderName.trim());
                setNewFolderDialogOpen(false);
                setNewFolderName('');
              }
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button
            onClick={() => {
              setNewFolderDialogOpen(false);
              setNewFolderName('');
            }}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            disabled={!newFolderName.trim()}
            onClick={() => {
              onCreateFolder?.(newFolderName.trim());
              setNewFolderDialogOpen(false);
              setNewFolderName('');
            }}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default FileBrowser;
