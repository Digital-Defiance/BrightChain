/**
 * HubManager Component
 *
 * CRUD interface for hubs with member management.
 * Hubs allow users to share content with a select group of connections.
 *
 * @remarks
 * Implements Requirements 35.8, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { IBaseHub } from '@brightchain/brighthub-lib';
import {
  Add,
  Delete,
  Edit,
  PersonAdd,
  PersonRemove,
  Star,
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
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** Props for the HubManager component */
export interface HubManagerProps {
  /** The hubs to display */
  hubs: IBaseHub<string>[];
  /** Whether data is loading */
  loading?: boolean;
  /** Callback when a new hub is created */
  onCreateHub?: (data: { name: string }) => void;
  /** Callback when a hub is updated */
  onUpdateHub?: (hubId: string, data: { name: string }) => void;
  /** Callback when a hub is deleted */
  onDeleteHub?: (hubId: string) => void;
  /** Callback when members are added to a hub */
  onAddMembers?: (hubId: string, userIds: string[]) => void;
  /** Callback when members are removed from a hub */
  onRemoveMembers?: (hubId: string, userIds: string[]) => void;
}

/**
 * HubManager
 *
 * Provides a full CRUD interface for hubs including
 * create, edit, delete, and bulk member management.
 */
export function HubManager({
  hubs,
  loading = false,
  onCreateHub,
  onUpdateHub,
  onDeleteHub,
  onAddMembers,
  onRemoveMembers,
}: HubManagerProps) {
  const { t } = useBrightHubTranslation();

  // Dialog state
  const [formOpen, setFormOpen] = useState(false);
  const [editingHub, setEditingHub] = useState<IBaseHub<string> | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<IBaseHub<string> | null>(
    null,
  );
  const [memberDialogTarget, setMemberDialogTarget] = useState<{
    hubId: string;
    mode: 'add' | 'remove';
  } | null>(null);

  // Form state
  const [formName, setFormName] = useState('');
  const [memberIdsText, setMemberIdsText] = useState('');

  const openCreateDialog = () => {
    setEditingHub(null);
    setFormName('');
    setFormOpen(true);
  };

  const openEditDialog = (hub: IBaseHub<string>) => {
    setEditingHub(hub);
    setFormName(hub.name);
    setFormOpen(true);
  };

  const handleFormSubmit = () => {
    const data = { name: formName.trim() };
    if (editingHub) {
      onUpdateHub?.(editingHub._id, data);
    } else {
      onCreateHub?.(data);
    }
    setFormOpen(false);
  };

  const handleDelete = () => {
    if (deleteTarget) {
      onDeleteHub?.(deleteTarget._id);
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
      onAddMembers?.(memberDialogTarget.hubId, ids);
    } else {
      onRemoveMembers?.(memberDialogTarget.hubId, ids);
    }
    setMemberDialogTarget(null);
    setMemberIdsText('');
  };

  const openMemberDialog = (hubId: string, mode: 'add' | 'remove') => {
    setMemberDialogTarget({ hubId, mode });
    setMemberIdsText('');
  };

  // Loading state
  if (loading) {
    return (
      <Box
        sx={{ display: 'flex', justifyContent: 'center', py: 4 }}
        aria-label={t(BrightHubStrings.HubManager_AriaLabel)}
      >
        <CircularProgress aria-label={t(BrightHubStrings.HubManager_Loading)} />
      </Box>
    );
  }

  return (
    <Box aria-label={t(BrightHubStrings.HubManager_AriaLabel)}>
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
          {t(BrightHubStrings.HubManager_Title)}
        </Typography>
        <Button
          variant="contained"
          size="small"
          startIcon={<Add />}
          onClick={openCreateDialog}
          aria-label={t(BrightHubStrings.HubManager_CreateHub)}
        >
          {t(BrightHubStrings.HubManager_CreateHub)}
        </Button>
      </Box>

      {/* Empty state */}
      {hubs.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }} data-testid="empty-state">
          <Typography variant="body1" color="text.secondary">
            {t(BrightHubStrings.HubManager_EmptyState)}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {t(BrightHubStrings.HubManager_EmptyStateHint)}
          </Typography>
        </Box>
      )}

      {/* Hub cards */}
      {hubs.map((hub) => (
        <Card key={hub._id} variant="outlined" sx={{ mb: 1 }}>
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
                  {hub.name}
                </Typography>
              </Box>
              <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
                <Tooltip title={t(BrightHubStrings.HubManager_EditHub)}>
                  <IconButton
                    size="small"
                    onClick={() => openEditDialog(hub)}
                    aria-label={t(BrightHubStrings.HubManager_EditHub)}
                  >
                    <Edit fontSize="small" />
                  </IconButton>
                </Tooltip>
                <Tooltip title={t(BrightHubStrings.HubManager_DeleteHub)}>
                  <IconButton
                    size="small"
                    onClick={() => setDeleteTarget(hub)}
                    aria-label={t(BrightHubStrings.HubManager_DeleteHub)}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Tooltip>
              </Box>
            </Box>
            <Box sx={{ display: 'flex', gap: 1, mt: 1, flexWrap: 'wrap' }}>
              <Chip
                size="small"
                label={t(BrightHubStrings.HubManager_MembersTemplate, {
                  COUNT: String(hub.memberCount),
                })}
              />
              {hub.isDefault && (
                <Chip
                  size="small"
                  icon={<Star fontSize="small" />}
                  label={t(BrightHubStrings.HubManager_DefaultBadge)}
                  color="primary"
                  variant="outlined"
                  data-testid="default-badge"
                />
              )}
            </Box>
          </CardContent>
          <CardActions>
            <Button
              size="small"
              startIcon={<PersonAdd />}
              onClick={() => openMemberDialog(hub._id, 'add')}
              aria-label={t(BrightHubStrings.HubManager_AddMembers)}
            >
              {t(BrightHubStrings.HubManager_AddMembers)}
            </Button>
            <Button
              size="small"
              startIcon={<PersonRemove />}
              onClick={() => openMemberDialog(hub._id, 'remove')}
              aria-label={t(BrightHubStrings.HubManager_RemoveMembers)}
            >
              {t(BrightHubStrings.HubManager_RemoveMembers)}
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
          {editingHub
            ? t(BrightHubStrings.HubManager_EditHub)
            : t(BrightHubStrings.HubManager_CreateHub)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            label={t(BrightHubStrings.HubManager_HubName)}
            fullWidth
            value={formName}
            onChange={(e) => setFormName(e.target.value)}
            inputProps={{
              'aria-label': t(BrightHubStrings.HubManager_HubName),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFormOpen(false)}>
            {t(BrightHubStrings.HubManager_Cancel)}
          </Button>
          <Button
            variant="contained"
            onClick={handleFormSubmit}
            disabled={!formName.trim()}
          >
            {t(BrightHubStrings.HubManager_Save)}
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
        <DialogTitle>{t(BrightHubStrings.HubManager_DeleteHub)}</DialogTitle>
        <DialogContent>
          <Typography>
            {t(BrightHubStrings.HubManager_DeleteConfirmTemplate, {
              NAME: deleteTarget?.name ?? '',
            })}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteTarget(null)}>
            {t(BrightHubStrings.HubManager_Cancel)}
          </Button>
          <Button variant="contained" color="error" onClick={handleDelete}>
            {t(BrightHubStrings.HubManager_DeleteConfirmAction)}
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
            ? t(BrightHubStrings.HubManager_AddMembersTitle)
            : t(BrightHubStrings.HubManager_RemoveMembersTitle)}
        </DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            margin="dense"
            fullWidth
            multiline
            rows={4}
            placeholder={t(BrightHubStrings.HubManager_UserIdsPlaceholder)}
            value={memberIdsText}
            onChange={(e) => setMemberIdsText(e.target.value)}
            inputProps={{
              'aria-label': t(BrightHubStrings.HubManager_UserIdsPlaceholder),
            }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setMemberDialogTarget(null)}>
            {t(BrightHubStrings.HubManager_Cancel)}
          </Button>
          <Button
            variant="contained"
            onClick={handleMemberSubmit}
            disabled={!memberIdsText.trim()}
          >
            {memberDialogTarget?.mode === 'add'
              ? t(BrightHubStrings.HubManager_AddMembers)
              : t(BrightHubStrings.HubManager_RemoveMembers)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

export default HubManager;
