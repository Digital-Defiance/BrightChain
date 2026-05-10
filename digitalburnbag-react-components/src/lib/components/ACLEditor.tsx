import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import DeleteIcon from '@mui/icons-material/Delete';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Box,
  Button,
  Checkbox,
  Chip,
  FormControlLabel,
  FormGroup,
  IconButton,
  MenuItem,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';
import type { IPrincipalOption } from './PrincipalPicker';
import { PrincipalPicker } from './PrincipalPicker';

export interface IACLEditorEntry {
  id: string;
  principalId: string;
  principalName: string;
  principalType: 'user' | 'group' | 'share_link';
  level: string;
  /** When true, not all selected items share this entry's permission level. */
  indeterminate?: boolean;
  ipRange?: string;
  timeWindow?: { start: string; end: string };
}

export interface IACLEditorProps {
  entries: IACLEditorEntry[];
  inheritedFrom?: string;
  onUpdateEntry: (entryId: string, level: string) => void;
  onRemoveEntry: (entryId: string) => void;
  onAddEntry: (principalId: string, level: string) => void;
  permissionSets?: Array<{ id: string; name: string; flags: string[] }>;
  onCreatePermissionSet?: (name: string, flags: string[]) => void;
  /** Optional async search for principal autocomplete. */
  searchPrincipals?: (query: string) => Promise<IPrincipalOption[]>;
}

const PERMISSION_LEVELS = ['Viewer', 'Commenter', 'Editor', 'Owner'];
const PERMISSION_FLAGS = [
  'Read',
  'Write',
  'Delete',
  'Share',
  'Admin',
  'Preview',
  'Comment',
  'Download',
  'ManageVersions',
];

/** Sentinel value used in the Select when the entry is indeterminate. */
const MIXED_VALUE = '__mixed__';

export function ACLEditor({
  entries,
  inheritedFrom,
  onUpdateEntry,
  onRemoveEntry,
  onAddEntry,
  permissionSets,
  onCreatePermissionSet,
  searchPrincipals,
}: IACLEditorProps) {
  const { tBranded: t } = useI18n();
  const [pendingPrincipals, setPendingPrincipals] = useState<
    IPrincipalOption[]
  >([]);
  const [newLevel, setNewLevel] = useState('Viewer');
  const [newSetName, setNewSetName] = useState('');
  const [newSetFlags, setNewSetFlags] = useState<Set<string>>(new Set());

  const handleAdd = useCallback(() => {
    if (pendingPrincipals.length === 0) return;
    for (const p of pendingPrincipals) {
      onAddEntry(p.id, newLevel);
    }
    setPendingPrincipals([]);
    setNewLevel('Viewer');
  }, [pendingPrincipals, newLevel, onAddEntry]);

  const handleCreateSet = useCallback(() => {
    if (!newSetName.trim() || newSetFlags.size === 0 || !onCreatePermissionSet)
      return;
    onCreatePermissionSet(newSetName.trim(), Array.from(newSetFlags));
    setNewSetName('');
    setNewSetFlags(new Set());
  }, [newSetName, newSetFlags, onCreatePermissionSet]);

  const toggleFlag = useCallback((flag: string) => {
    setNewSetFlags((prev) => {
      const next = new Set(prev);
      if (next.has(flag)) next.delete(flag);
      else next.add(flag);
      return next;
    });
  }, []);

  return (
    <Box>
      {inheritedFrom && (
        <Chip
          label={t(DigitalBurnbagStrings.ACL_InheritedFrom).replace(
            '{source}',
            inheritedFrom,
          )}
          size="small"
          color="info"
          sx={{ mb: 1 }}
        />
      )}

      <Table size="small" aria-label="ACL entries">
        <TableHead>
          <TableRow>
            <TableCell>{t(DigitalBurnbagStrings.ACL_ColPrincipal)}</TableCell>
            <TableCell>{t(DigitalBurnbagStrings.ACL_ColType)}</TableCell>
            <TableCell>{t(DigitalBurnbagStrings.ACL_ColPermission)}</TableCell>
            <TableCell align="right">
              {t(DigitalBurnbagStrings.ACL_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {entries.map((entry) => {
            const isMixed = entry.indeterminate === true;
            const selectValue = isMixed ? MIXED_VALUE : entry.level;
            return (
              <TableRow
                key={entry.id}
                sx={isMixed ? { opacity: 0.6 } : undefined}
              >
                <TableCell>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                    {entry.principalName}
                    {isMixed && (
                      <Tooltip
                        title={t(DigitalBurnbagStrings.ACL_MixedTooltip)}
                      >
                        <Chip
                          label={t(DigitalBurnbagStrings.ACL_Mixed)}
                          size="small"
                          color="warning"
                          variant="outlined"
                        />
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
                <TableCell>{entry.principalType}</TableCell>
                <TableCell>
                  <Select
                    size="small"
                    value={selectValue}
                    onChange={(e) => {
                      const val = e.target.value;
                      if (val !== MIXED_VALUE) {
                        onUpdateEntry(entry.id, val);
                      }
                    }}
                    sx={
                      isMixed
                        ? { fontStyle: 'italic', color: 'text.secondary' }
                        : undefined
                    }
                  >
                    {isMixed && (
                      <MenuItem
                        value={MIXED_VALUE}
                        disabled
                        sx={{ fontStyle: 'italic' }}
                      >
                        {t(DigitalBurnbagStrings.ACL_Mixed)}
                      </MenuItem>
                    )}
                    {PERMISSION_LEVELS.map((l) => (
                      <MenuItem key={l} value={l}>
                        {l}
                      </MenuItem>
                    ))}
                  </Select>
                </TableCell>
                <TableCell align="right">
                  <Tooltip title={t(DigitalBurnbagStrings.ACL_Remove)}>
                    <IconButton
                      size="small"
                      onClick={() => onRemoveEntry(entry.id)}
                      aria-label={`${t(DigitalBurnbagStrings.ACL_Remove)} ${entry.principalName}`}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            );
          })}
          {/* Add row */}
          <TableRow>
            <TableCell colSpan={2}>
              <PrincipalPicker
                value={pendingPrincipals}
                onChange={setPendingPrincipals}
                searchPrincipals={searchPrincipals}
              />
            </TableCell>
            <TableCell>
              <Select
                size="small"
                value={newLevel}
                onChange={(e) => setNewLevel(e.target.value)}
              >
                {PERMISSION_LEVELS.map((l) => (
                  <MenuItem key={l} value={l}>
                    {l}
                  </MenuItem>
                ))}
              </Select>
            </TableCell>
            <TableCell align="right">
              <Button
                size="small"
                onClick={handleAdd}
                disabled={pendingPrincipals.length === 0}
              >
                {t(DigitalBurnbagStrings.ACL_Add)}
              </Button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>

      {/* Advanced section */}
      <Accordion sx={{ mt: 2 }}>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="subtitle2">
            {t(DigitalBurnbagStrings.ACL_AdvancedPermissions)}
          </Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" gutterBottom>
            {t(DigitalBurnbagStrings.ACL_PermissionFlags)}
          </Typography>
          <FormGroup row>
            {PERMISSION_FLAGS.map((flag) => (
              <FormControlLabel
                key={flag}
                control={
                  <Checkbox
                    size="small"
                    checked={newSetFlags.has(flag)}
                    onChange={() => toggleFlag(flag)}
                  />
                }
                label={flag}
              />
            ))}
          </FormGroup>

          {onCreatePermissionSet && (
            <Box sx={{ display: 'flex', gap: 1, mt: 2 }}>
              <TextField
                size="small"
                label={t(DigitalBurnbagStrings.ACL_PermissionSetName)}
                value={newSetName}
                onChange={(e) => setNewSetName(e.target.value)}
              />
              <Button
                size="small"
                variant="outlined"
                onClick={handleCreateSet}
                disabled={!newSetName.trim() || newSetFlags.size === 0}
              >
                {t(DigitalBurnbagStrings.ACL_CreateSet)}
              </Button>
            </Box>
          )}

          {permissionSets && permissionSets.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="body2" gutterBottom>
                {t(DigitalBurnbagStrings.ACL_CustomSets)}
              </Typography>
              {permissionSets.map((ps) => (
                <Chip
                  key={ps.id}
                  label={`${ps.name} (${ps.flags.join(', ')})`}
                  size="small"
                  sx={{ mr: 0.5, mb: 0.5 }}
                />
              ))}
            </Box>
          )}
        </AccordionDetails>
      </Accordion>
    </Box>
  );
}
