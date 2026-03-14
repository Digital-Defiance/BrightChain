/**
 * ConnectionListManager Component
 *
 * CRUD interface for connection lists with bulk member add/remove.
 *
 * @remarks
 * Implements Requirements 35.1, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import {
  ConnectionVisibility,
  IBaseConnectionList,
} from '@brightchain/brighthub-lib';
import {
  Add,
  Delete,
  Edit,
  Lock,
  People,
  PersonAdd,
  PersonRemove,
  Public,
} from '@mui/icons-material';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  MenuItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the ConnectionListManager component */
export interface ConnectionListManagerProps {
  /** The connection lists to display */
  lists: IBaseConnectionList<string>[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when a new list is created */
  onCreateList?: (data: {
    name: string;
    description?: string;
    visibility: ConnectionVisibility;
  }) => void;
  /** Callback when a list is updated */
  onUpdateList?: (
    listId: string,
    data: {
      name: string;
      description?: string;
      visibility: ConnectionVisibility;
    },
  ) => void;
  /** Callback when a list is deleted */
  onDeleteList?: (listId: string) => void;
  /** Callback when members are added to a list */
  onAddMembers?: (listId: string, userIds: string[]) => void;
  /** Callback when members are removed from a list */
  onRemoveMembers?: (listId: string, userIds: string[]) => void;
}

/** Visibility icon mapping */
const visibilityIcons: Record<ConnectionVisibility, React.ReactNode> = {
  [ConnectionVisibility.Private]: <Lock fontSize="small" />,
  [ConnectionVisibility.FollowersOnly]: <People fontSize="small" />,
  [ConnectionVisibility.Public]: <Public fontSize="small" />,
};

/**
 * ConnectionListManager
 *
 * Provides a full CRUD interface for connection lists including
 * create, edit, delete, and bulk member management.
 */
export function ConnectionListManager({
  lists,
  loading = false,
  onCreateList,
  onUpdateList,
  onDeleteList,
  onAddMembers,
  onRemoveMembers,
}: ConnectionListManagerProps) {
  const { t } = useBrightHubTranslation();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingList, setEditingList] =
    useState<IBaseConnectionList<string> | null>(null);
  const [deleteTarget, setDeleteTarget] =
    useState<IBaseConnectionList<string> | null>(null);
  const [memberDialogTarget, setMemberDialogTarget] = useState<{
    listId: string;
    mode: 'add' | 'remove';
  } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formVisibility, setFormVisibility] = useState<ConnectionVisibility>(
    ConnectionVisibility.Private,
  );
  const [memberIdsText, setMemberIdsText] = useState('');

  const visibilityLabel = (v: ConnectionVisibility) => {
    switch (v) {
      case ConnectionVisibility.Private:
        return t(BrightHubStrings.ConnectionListManager_VisibilityPrivate);
      case ConnectionVisibility.FollowersOnly:
        return t(
          BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly,
        );
      case ConnectionVisibility.Public:
        return t(BrightHubStrings.ConnectionListManager_VisibilityPublic);
    }
  };

  const openCreateDialog = () => {
    setEditingList(null);
    setFormName('');
    setFormDescription('');
    setFormVisibility(ConnectionVisibility.Private);
    setFormOpen(true);
  };

  const openEditDialog = (list: IBaseConnectionList<string>) => {
    setEditingList(list);
    setFormName(list.name);
    setFormDescription(list.description ?? '');
    setFormVisibility(list.visibility);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    const data = {
      name: formName.trim(),
      description: formDescription.trim() || undefined,
      visibility: formVisibility,
    };
    if (editingList) {
      onUpdateList?.(editingList._id, data);
    } else {
      onCreateList?.(data);
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      onDeleteList?.(deleteTarget._id);
      setDeleteTarget(null);
    }
  };

  const handleMemberSubmit = () => {
    if (!memberDialogTarget) return;
    const ids = memberIdsText
      .split('\n')
      .map((id) => id.trim())
      .filter(Boolean);
    if (ids.length === 0) return;
    if (memberDialogTarget.mode === 'add') {
      onAddMembers?.(memberDialogTarget.listId, ids);
    } else {
      onRemoveMembers?.(memberDialogTarget.listId, ids);
    }
    setMemberDialogTarget(null);
    setMemberIdsText('');
  };

  const openMemberDialog = (listId: string, mode: 'add' | 'remove') => {
    setMemberDialogTarget({ listId, mode });
    setMemberIdsText('');
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.ConnectionListManager_AriaLabel)}
      >
        <CircularProgress
          aria-label={t(BrightHubStrings.ConnectionListManager_Loading)}
        />
      </Box>
    );
  }

  return (
    <Box aria-label={t(BrightHubStrings.ConnectionListManager_AriaLabel)}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="h6">
          {t(BrightHubStrings.ConnectionListManager_Title)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={openCreateDialog}
          aria-label={t(BrightHubStrings.ConnectionListManager_CreateList)}
        >
          {t(BrightHubStrings.ConnectionListManager_CreateList)}
        </Button>
      </Box>

      {/* Empty state */}
      {lists.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.ConnectionListManager_EmptyState)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(BrightHubStrings.ConnectionListManager_EmptyStateHint)}
          </Typography>
        </Box>
      )}

      {/* List cards */}
      {lists.map((list) => (
        <Card key={list._id} variant="outlined" sx={{ mb: 1 }}>
          <CardContent sx={{ pb: 0 }}>
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'flex-start',
              }}
            >
              <Box sx={{ flex: 1, minWidth: 0 }}>
                <Typography variant="subtitle1" fontWeight="bold" noWrap>
                  {list.name}
                </Typography>
                {list.description && (
                  <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ mt: 0.5 }}
                  >
                    {list.description}
                  </Typography>
                )}
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Tooltip
                  title={t(BrightHubStrings.ConnectionListManager_EditList)}
                >
                  <IconButton
                    size="small"
                    onClick={() => openEditDialog(list)}
                    aria-label={t(
                      BrightHubStrings.ConnectionListManager_EditList,
                    )}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip
                  title={t(BrightHubStrings.ConnectionListManager_DeleteList)}
                >
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(list)}
                    aria-label={t(
                      BrightHubStrings.ConnectionListManager_DeleteList,
                    )}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                icon={visibilityIcons[list.visibility] as React.ReactElement}
                label={visibilityLabel(list.visibility)}
                data-testid={`visibility-${list.visibility}`}
              />
              <Chip
                size="small"
                label={t(
                  BrightHubStrings.ConnectionListManager_MembersTemplate,
                  { COUNT: String(list.memberCount) },
                )}
              />
              <Chip
                size="small"
                variant="outlined"
                label={t(
                  BrightHubStrings.ConnectionListManager_FollowersTemplate,
                  { COUNT: String(list.followerCount) },
                )}
              />
            </Box>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              startIcon={<PersonAdd />}
              onClick={() => openMemberDialog(list._id, 'add')}
              aria-label={t(BrightHubStrings.ConnectionListManager_AddMembers)}
            >
              {t(BrightHubStrings.ConnectionListManager_AddMembers)}
            </Button>
            <Button
              size="small"
              startIcon={<PersonRemove />}
              onClick={() => openMemberDialog(list._id, 'remove')}
              aria-label={t(
                BrightHubStrings.ConnectionListManager_RemoveMembers,
              )}
            >
              {t(BrightHubStrings.ConnectionListManager_RemoveMembers)}
            </Button>
          </CardActions>
        </Card>
      ))}

      {/* Create / Edit dialog */}
      <Dialog
        open={formOpen}
        onClose={() => setFormOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {editingList
            ? t(BrightHubStrings.ConnectionListManager_EditList)
            : t(BrightHubStrings.ConnectionListManager_CreateList)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t(BrightHubStrings.ConnectionListManager_ListName)}
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            inputProps={{
              'aria-label': t(BrightHubStrings.ConnectionListManager_ListName),
            }}
          />
          <TextField
            margin="dense"
            label={t(BrightHubStrings.ConnectionListManager_ListDescription)}
            fullWidth
            multiline
            rows={2}
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            inputProps={{
              'aria-label': t(
                BrightHubStrings.ConnectionListManager_ListDescription,
              ),
            }}
          />
          <TextField
            select
            margin="dense"
            label={t(BrightHubStrings.ConnectionListManager_Visibility)}
            fullWidth
            value={formVisibility}
            onChange={(e) =>
              setFormVisibility(e.target.value as ConnectionVisibility)
            }
            inputProps={{
              'aria-label': t(
                BrightHubStrings.ConnectionListManager_Visibility,
              ),
            }}
          >
            <MenuItem value={ConnectionVisibility.Private}>
              {t(BrightHubStrings.ConnectionListManager_VisibilityPrivate)}
            </MenuItem>
            <MenuItem value={ConnectionVisibility.FollowersOnly}>
              {t(
                BrightHubStrings.ConnectionListManager_VisibilityFollowersOnly,
              )}
            </MenuItem>
            <MenuItem value={ConnectionVisibility.Public}>
              {t(BrightHubStrings.ConnectionListManager_VisibilityPublic)}
            </MenuItem>
          </TextField>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>
            {t(BrightHubStrings.ConnectionListManager_Cancel)}
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={!formName.trim()}
          >
            {t(BrightHubStrings.ConnectionListManager_Save)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Delete confirmation dialog */}
      <Dialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>
          {t(BrightHubStrings.ConnectionListManager_DeleteList)}
        </DialogTitle>
        <DialogContent>
          <Typography>
            {t(BrightHubStrings.ConnectionListManager_DeleteConfirmTemplate, {
              NAME: deleteTarget?.name ?? '',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {t(BrightHubStrings.ConnectionListManager_Cancel)}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t(BrightHubStrings.ConnectionListManager_DeleteConfirmAction)}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Bulk member dialog */}
      <Dialog
        open={!!memberDialogTarget}
        onClose={() => setMemberDialogTarget(null)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {memberDialogTarget?.mode === 'add'
            ? t(BrightHubStrings.ConnectionListManager_AddMembersTitle)
            : t(BrightHubStrings.ConnectionListManager_RemoveMembersTitle)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            multiline
            rows={4}
            placeholder={t(
              BrightHubStrings.ConnectionListManager_UserIdsPlaceholder,
            )}
            value={memberIdsText}
            onChange={(e) => setMemberIdsText(e.target.value)}
            inputProps={{
              'aria-label': t(
                BrightHubStrings.ConnectionListManager_UserIdsPlaceholder,
              ),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogTarget(null)}>
            {t(BrightHubStrings.ConnectionListManager_Cancel)}
          </Button>
          <Button
            variant="contained"
            onClick={handleMemberSubmit}
            disabled={!memberIdsText.trim()}
          >
            {memberDialogTarget?.mode === 'add'
              ? t(BrightHubStrings.ConnectionListManager_AddMembers)
              : t(BrightHubStrings.ConnectionListManager_RemoveMembers)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default ConnectionListManager;
