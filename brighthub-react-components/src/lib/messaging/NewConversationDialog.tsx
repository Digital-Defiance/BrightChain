/**
 * NewConversationDialog Component
 *
 * Dialog for starting a new conversation with user search and group creation.
 *
 * @remarks
 * Implements Requirements 44.10, 61.4
 */

import { BrightHubStrings } from '@brightchain/brighthub-lib';
import { Group, Search } from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Checkbox,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  InputAdornment,
  List,
  ListItemAvatar,
  ListItemButton,
  ListItemText,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import React, { useState } from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';

/** User search result */
export interface UserSearchResult {
  userId: string;
  displayName: string;
  username: string;
  avatarUrl?: string;
}

/** Props for the NewConversationDialog component */
export interface NewConversationDialogProps {
  /** Whether the dialog is open */
  open: boolean;
  /** Callback to close the dialog */
  onClose: () => void;
  /** Callback when a conversation is started */
  onStart: (userIds: string[], groupName?: string) => void;
  /** Search results to display */
  searchResults: UserSearchResult[];
  /** Callback when search query changes */
  onSearchChange: (query: string) => void;
  /** Whether search is loading */
  searching?: boolean;
}

/**
 * NewConversationDialog
 *
 * Modal dialog with user search, multi-select, and optional group creation.
 */
export function NewConversationDialog({
  open,
  onClose,
  onStart,
  searchResults,
  onSearchChange,
  searching = false,
}: NewConversationDialogProps) {
  const { t } = useBrightHubTranslation();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UserSearchResult[]>([]);
  const [isGroup, setIsGroup] = useState(false);
  const [groupName, setGroupName] = useState('');

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    onSearchChange(value);
  };

  const toggleUser = (user: UserSearchResult) => {
    setSelected((prev) =>
      prev.some((u) => u.userId === user.userId)
        ? prev.filter((u) => u.userId !== user.userId)
        : [...prev, user],
    );
  };

  const handleStart = () => {
    const userIds = selected.map((u) => u.userId);
    onStart(userIds, isGroup ? groupName.trim() || undefined : undefined);
    // Reset state
    setQuery('');
    setSelected([]);
    setIsGroup(false);
    setGroupName('');
  };

  const canStart = selected.length > 0 && (!isGroup || selected.length >= 2);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      aria-label={t(BrightHubStrings.NewConversationDialog_AriaLabel)}
    >
      <DialogTitle>
        {t(BrightHubStrings.NewConversationDialog_Title)}
      </DialogTitle>
      <DialogContent>
        {/* Search */}
        <TextField
          autoFocus
          fullWidth
          size="small"
          placeholder={t(
            BrightHubStrings.NewConversationDialog_SearchPlaceholder,
          )}
          value={query}
          onChange={handleSearchChange}
          sx={{ mb: 1 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <Search fontSize="small" />
                </InputAdornment>
              ),
              'aria-label': t(
                BrightHubStrings.NewConversationDialog_SearchPlaceholder,
              ),
            },
          }}
        />

        {/* Group toggle */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Switch
            checked={isGroup}
            onChange={(e) => setIsGroup(e.target.checked)}
            size="small"
          />
          <Group fontSize="small" />
          <Typography variant="body2">
            {t(BrightHubStrings.NewConversationDialog_CreateGroup)}
          </Typography>
        </Box>

        {isGroup && (
          <TextField
            fullWidth
            size="small"
            placeholder={t(
              BrightHubStrings.NewConversationDialog_GroupNamePlaceholder,
            )}
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            sx={{ mb: 1 }}
            slotProps={{
              input: {
                'aria-label': t(
                  BrightHubStrings.NewConversationDialog_GroupNamePlaceholder,
                ),
              },
            }}
          />
        )}

        {/* Selected chips */}
        {selected.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap', mb: 1 }}>
            {selected.map((u) => (
              <Chip
                key={u.userId}
                label={u.displayName}
                size="small"
                onDelete={() => toggleUser(u)}
              />
            ))}
            <Typography
              variant="caption"
              color="text.secondary"
              sx={{ alignSelf: 'center' }}
            >
              {t(BrightHubStrings.NewConversationDialog_SelectedTemplate, {
                COUNT: String(selected.length),
              })}
            </Typography>
          </Box>
        )}

        {/* Search results */}
        {searchResults.length === 0 && query && (
          <Typography
            variant="body2"
            color="text.secondary"
            sx={{ textAlign: 'center', py: 2 }}
          >
            {t(BrightHubStrings.NewConversationDialog_NoResults)}
          </Typography>
        )}

        <List disablePadding>
          {searchResults.map((user) => {
            const isSelected = selected.some((u) => u.userId === user.userId);
            return (
              <ListItemButton
                key={user.userId}
                onClick={() => toggleUser(user)}
                data-testid={`user-${user.userId}`}
              >
                <Checkbox checked={isSelected} tabIndex={-1} disableRipple />
                <ListItemAvatar>
                  <Avatar src={user.avatarUrl}>
                    {user.displayName.charAt(0).toUpperCase()}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={user.displayName}
                  secondary={`@${user.username}`}
                />
              </ListItemButton>
            );
          })}
        </List>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>
          {t(BrightHubStrings.NewConversationDialog_Cancel)}
        </Button>
        <Button variant="contained" onClick={handleStart} disabled={!canStart}>
          {t(BrightHubStrings.NewConversationDialog_Start)}
        </Button>
      </DialogActions>
    </Dialog>
  );
}

export default NewConversationDialog;
