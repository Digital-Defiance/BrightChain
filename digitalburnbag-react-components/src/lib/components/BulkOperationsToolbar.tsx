import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import ClearIcon from '@mui/icons-material/Clear';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import DeleteIcon from '@mui/icons-material/Delete';
import DriveFileMoveIcon from '@mui/icons-material/DriveFileMove';
import LockIcon from '@mui/icons-material/Lock';
import ShareIcon from '@mui/icons-material/Share';
import {
  Alert,
  Box,
  Button,
  Chip,
  Collapse,
  IconButton,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material';
import type React from 'react';

// ---------------------------------------------------------------------------
// Public interfaces
// ---------------------------------------------------------------------------

export type BulkAction = 'move' | 'copy' | 'delete' | 'share' | 'permissions';

export interface IBulkOperationsToolbarProps {
  /** Number of currently selected items */
  selectedCount: number;
  /** Called when a bulk action button is clicked */
  onBulkAction: (action: BulkAction) => void;
  /** Called when the user clears the selection */
  onClearSelection: () => void;
  /** Operation result summary (shown as an alert) */
  operationResult?: { successes: number; failures: number } | null;
  /** Disable all action buttons */
  disabled?: boolean;
}

// ---------------------------------------------------------------------------
// Action definitions
// ---------------------------------------------------------------------------

interface ActionDef {
  action: BulkAction;
  labelKey: string;
  icon: React.ReactElement;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * Toolbar that appears when items are selected, providing bulk operation
 * buttons and an optional result summary.
 */
export function BulkOperationsToolbar({
  selectedCount,
  onBulkAction,
  onClearSelection,
  operationResult,
  disabled = false,
}: IBulkOperationsToolbarProps) {
  const { tBranded: t } = useI18n();
  const visible = selectedCount > 0;

  const ACTIONS: ActionDef[] = [
    {
      action: 'move',
      labelKey: DigitalBurnbagStrings.Action_Move,
      icon: <DriveFileMoveIcon />,
    },
    {
      action: 'copy',
      labelKey: DigitalBurnbagStrings.Action_Copy,
      icon: <ContentCopyIcon />,
    },
    {
      action: 'delete',
      labelKey: DigitalBurnbagStrings.Action_Delete,
      icon: <DeleteIcon />,
    },
    {
      action: 'share',
      labelKey: DigitalBurnbagStrings.Action_Share,
      icon: <ShareIcon />,
    },
    {
      action: 'permissions',
      labelKey: DigitalBurnbagStrings.Action_Permissions,
      icon: <LockIcon />,
    },
  ];

  return (
    <Collapse in={visible}>
      <Toolbar
        variant="dense"
        sx={{
          bgcolor: 'action.selected',
          borderRadius: 1,
          mb: 1,
          gap: 1,
          flexWrap: 'wrap',
        }}
      >
        {/* Selection count */}
        <Chip
          label={t(DigitalBurnbagStrings.Bulk_ItemsSelected, {
            count: selectedCount,
          })}
          size="small"
          onDelete={onClearSelection}
          deleteIcon={
            <Tooltip title={t(DigitalBurnbagStrings.Bulk_ClearSelection)}>
              <ClearIcon fontSize="small" />
            </Tooltip>
          }
        />

        {/* Action buttons */}
        <Box sx={{ display: 'flex', gap: 0.5, ml: 1 }}>
          {ACTIONS.map(({ action, labelKey, icon }) => (
            <Button
              key={action}
              size="small"
              startIcon={icon}
              onClick={() => onBulkAction(action)}
              disabled={disabled}
            >
              {t(labelKey)}
            </Button>
          ))}
        </Box>

        {/* Clear selection (redundant icon button for quick access) */}
        <Box sx={{ flexGrow: 1 }} />
        <IconButton
          size="small"
          onClick={onClearSelection}
          aria-label={t(DigitalBurnbagStrings.Bulk_ClearSelection)}
        >
          <ClearIcon fontSize="small" />
        </IconButton>
      </Toolbar>

      {/* Operation result alert */}
      {operationResult && (
        <Alert
          severity={operationResult.failures > 0 ? 'warning' : 'success'}
          sx={{ mb: 1 }}
        >
          <Typography variant="body2">
            {operationResult.successes > 0 &&
              t(DigitalBurnbagStrings.Bulk_Succeeded, {
                count: operationResult.successes,
              })}
            {operationResult.successes > 0 &&
              operationResult.failures > 0 &&
              ', '}
            {operationResult.failures > 0 &&
              t(DigitalBurnbagStrings.Bulk_Failed, {
                count: operationResult.failures,
              })}
          </Typography>
        </Alert>
      )}
    </Collapse>
  );
}

export default BulkOperationsToolbar;
