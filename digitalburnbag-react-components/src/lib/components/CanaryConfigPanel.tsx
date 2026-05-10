import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import {
  Alert,
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
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

export interface ICanaryBindingDisplay {
  id: string;
  condition: string;
  provider: string;
  action: string;
  targetDescription: string;
}

export interface ICanaryBindingInput {
  condition: string;
  provider: string;
  action: string;
  targetIds: string[];
  recipientListId?: string;
  cascadeDelay?: number;
}

export interface IRecipientListDisplay {
  id: string;
  name: string;
  recipientCount: number;
}

export interface IRecipientListInput {
  name: string;
  recipients: Array<{ email: string; label?: string; pgpKey?: string }>;
}

export interface IDryRunReportDisplay {
  actionsDescription: string[];
  affectedFileCount: number;
  recipientCount: number;
}

export interface ICanaryConfigPanelProps {
  bindings: ICanaryBindingDisplay[];
  recipientLists: IRecipientListDisplay[];
  onCreateBinding: (binding: ICanaryBindingInput) => Promise<void>;
  onUpdateBinding: (id: string, updates: Partial<ICanaryBindingInput>) => void;
  onDeleteBinding: (id: string) => void;
  onDryRun: (bindingId: string) => Promise<IDryRunReportDisplay>;
  onCreateRecipientList: (list: IRecipientListInput) => Promise<void>;
  onUpdateRecipientList: (
    id: string,
    updates: Partial<IRecipientListInput>,
  ) => void;
}

const CONDITIONS = ['MISSED_CHECK_IN', 'DURESS', 'MANUAL', 'EXTERNAL_SIGNAL'];
const ACTIONS = [
  'DeleteFiles',
  'EmailFilesAsAttachments',
  'EmailFilesAsLinks',
  'ReleaseToPublic',
];

export function CanaryConfigPanel({
  bindings,
  recipientLists,
  onCreateBinding,
  onDeleteBinding,
  onDryRun,
  onCreateRecipientList,
}: ICanaryConfigPanelProps) {
  const { tBranded: t } = useI18n();
  const [showAddBinding, setShowAddBinding] = useState(false);
  const [newCondition, setNewCondition] = useState(CONDITIONS[0]);
  const [newProvider, setNewProvider] = useState('');
  const [newAction, setNewAction] = useState(ACTIONS[0]);
  const [newTargetIds, setNewTargetIds] = useState('');
  const [newRecipientListId, setNewRecipientListId] = useState('');
  const [newCascadeDelay, setNewCascadeDelay] = useState('');
  const [dryRunReport, setDryRunReport] = useState<IDryRunReportDisplay | null>(
    null,
  );
  const [dryRunDialogOpen, setDryRunDialogOpen] = useState(false);
  const [error, setError] = useState('');

  // Recipient list form
  const [showAddList, setShowAddList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListEmails, setNewListEmails] = useState('');

  const handleCreateBinding = useCallback(async () => {
    setError('');
    try {
      const input: ICanaryBindingInput = {
        condition: newCondition,
        provider: newProvider,
        action: newAction,
        targetIds: newTargetIds
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean),
      };
      if (newRecipientListId) input.recipientListId = newRecipientListId;
      const delay = parseInt(newCascadeDelay, 10);
      if (!isNaN(delay) && delay > 0) input.cascadeDelay = delay;
      await onCreateBinding(input);
      setShowAddBinding(false);
      setNewProvider('');
      setNewTargetIds('');
      setNewRecipientListId('');
      setNewCascadeDelay('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create binding');
    }
  }, [
    newCondition,
    newProvider,
    newAction,
    newTargetIds,
    newRecipientListId,
    newCascadeDelay,
    onCreateBinding,
  ]);

  const handleDryRun = useCallback(
    async (bindingId: string) => {
      try {
        const report = await onDryRun(bindingId);
        setDryRunReport(report);
        setDryRunDialogOpen(true);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : 'Dry run failed');
      }
    },
    [onDryRun],
  );

  const handleCreateList = useCallback(async () => {
    setError('');
    try {
      const recipients = newListEmails
        .split('\n')
        .map((line) => {
          const [email, label] = line.split(',').map((s) => s.trim());
          return { email, label: label || undefined };
        })
        .filter((r) => r.email);
      await onCreateRecipientList({ name: newListName.trim(), recipients });
      setShowAddList(false);
      setNewListName('');
      setNewListEmails('');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to create list');
    }
  }, [newListName, newListEmails, onCreateRecipientList]);

  return (
    <Box>
      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Bindings */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1">
          {t(DigitalBurnbagStrings.Canary_Bindings)}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowAddBinding(true)}
        >
          {t(DigitalBurnbagStrings.Canary_AddBinding)}
        </Button>
      </Box>
      <Table size="small" aria-label="Canary bindings">
        <TableHead>
          <TableRow>
            <TableCell>
              {t(DigitalBurnbagStrings.Canary_ColCondition)}
            </TableCell>
            <TableCell>{t(DigitalBurnbagStrings.Canary_ColAction)}</TableCell>
            <TableCell>{t(DigitalBurnbagStrings.Canary_ColTarget)}</TableCell>
            <TableCell align="right">
              {t(DigitalBurnbagStrings.Canary_ColActions)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {bindings.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                <Typography variant="body2" color="text.secondary" py={2}>
                  {t(DigitalBurnbagStrings.Canary_NoBindings)}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            bindings.map((b) => (
              <TableRow key={b.id}>
                <TableCell>{b.condition}</TableCell>
                <TableCell>{b.action}</TableCell>
                <TableCell>{b.targetDescription}</TableCell>
                <TableCell align="right">
                  <Tooltip title={t(DigitalBurnbagStrings.Canary_DryRun)}>
                    <IconButton
                      size="small"
                      onClick={() => handleDryRun(b.id)}
                      aria-label={t(DigitalBurnbagStrings.Canary_DryRun)}
                    >
                      <PlayArrowIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                  <Tooltip
                    title={t(DigitalBurnbagStrings.Canary_DeleteBinding)}
                  >
                    <IconButton
                      size="small"
                      onClick={() => onDeleteBinding(b.id)}
                      aria-label={t(DigitalBurnbagStrings.Canary_DeleteBinding)}
                    >
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {/* Add binding form */}
      {showAddBinding && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Canary_NewBinding)}
          </Typography>
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            <Select
              size="small"
              value={newCondition}
              onChange={(e) => setNewCondition(e.target.value)}
              sx={{ minWidth: 160 }}
            >
              {CONDITIONS.map((c) => (
                <MenuItem key={c} value={c}>
                  {c}
                </MenuItem>
              ))}
            </Select>
            <TextField
              size="small"
              label={t(DigitalBurnbagStrings.Canary_ProviderLabel)}
              value={newProvider}
              onChange={(e) => setNewProvider(e.target.value)}
            />
            <Select
              size="small"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              sx={{ minWidth: 200 }}
            >
              {ACTIONS.map((a) => (
                <MenuItem key={a} value={a}>
                  {a}
                </MenuItem>
              ))}
            </Select>
          </Box>
          <TextField
            size="small"
            fullWidth
            margin="normal"
            label={t(DigitalBurnbagStrings.Canary_TargetIdsLabel)}
            value={newTargetIds}
            onChange={(e) => setNewTargetIds(e.target.value)}
          />
          {recipientLists.length > 0 && (
            <Select
              size="small"
              fullWidth
              displayEmpty
              value={newRecipientListId}
              onChange={(e) => setNewRecipientListId(e.target.value)}
              sx={{ mt: 1 }}
            >
              <MenuItem value="">
                {t(DigitalBurnbagStrings.Canary_NoRecipientList)}
              </MenuItem>
              {recipientLists.map((rl) => (
                <MenuItem key={rl.id} value={rl.id}>
                  {rl.name} ({rl.recipientCount})
                </MenuItem>
              ))}
            </Select>
          )}
          <TextField
            size="small"
            fullWidth
            margin="normal"
            label={t(DigitalBurnbagStrings.Canary_CascadeDelayLabel)}
            type="number"
            value={newCascadeDelay}
            onChange={(e) => setNewCascadeDelay(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateBinding}
            >
              {t(DigitalBurnbagStrings.Canary_Create)}
            </Button>
            <Button size="small" onClick={() => setShowAddBinding(false)}>
              {t(DigitalBurnbagStrings.Canary_Cancel)}
            </Button>
          </Box>
        </Box>
      )}

      <Divider sx={{ my: 3 }} />

      {/* Recipient Lists */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          mb: 1,
        }}
      >
        <Typography variant="subtitle1">
          {t(DigitalBurnbagStrings.Canary_RecipientLists)}
        </Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setShowAddList(true)}
        >
          {t(DigitalBurnbagStrings.Canary_AddList)}
        </Button>
      </Box>
      <Table size="small" aria-label="Recipient lists">
        <TableHead>
          <TableRow>
            <TableCell>{t(DigitalBurnbagStrings.Canary_ColListName)}</TableCell>
            <TableCell align="right">
              {t(DigitalBurnbagStrings.Canary_ColRecipients)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {recipientLists.length === 0 ? (
            <TableRow>
              <TableCell colSpan={2} align="center">
                <Typography variant="body2" color="text.secondary" py={2}>
                  {t(DigitalBurnbagStrings.Canary_NoLists)}
                </Typography>
              </TableCell>
            </TableRow>
          ) : (
            recipientLists.map((rl) => (
              <TableRow key={rl.id}>
                <TableCell>{rl.name}</TableCell>
                <TableCell align="right">{rl.recipientCount}</TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      {showAddList && (
        <Box
          sx={{
            mt: 2,
            p: 2,
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 1,
          }}
        >
          <Typography variant="subtitle2" gutterBottom>
            {t(DigitalBurnbagStrings.Canary_NewList)}
          </Typography>
          <TextField
            size="small"
            fullWidth
            label={t(DigitalBurnbagStrings.Canary_ListNameLabel)}
            value={newListName}
            onChange={(e) => setNewListName(e.target.value)}
          />
          <TextField
            size="small"
            fullWidth
            margin="normal"
            label={t(DigitalBurnbagStrings.Canary_RecipientsLabel)}
            multiline
            minRows={3}
            value={newListEmails}
            onChange={(e) => setNewListEmails(e.target.value)}
          />
          <Box sx={{ display: 'flex', gap: 1, mt: 1 }}>
            <Button
              size="small"
              variant="contained"
              onClick={handleCreateList}
              disabled={!newListName.trim()}
            >
              {t(DigitalBurnbagStrings.Canary_Create)}
            </Button>
            <Button size="small" onClick={() => setShowAddList(false)}>
              {t(DigitalBurnbagStrings.Canary_Cancel)}
            </Button>
          </Box>
        </Box>
      )}

      {/* Dry run report dialog */}
      <Dialog
        open={dryRunDialogOpen}
        onClose={() => setDryRunDialogOpen(false)}
        maxWidth="sm"
        fullWidth
      >
        <DialogTitle>
          {t(DigitalBurnbagStrings.Canary_DryRunReport)}
        </DialogTitle>
        <DialogContent dividers>
          {dryRunReport && (
            <>
              <Typography variant="body2" gutterBottom>
                {t(DigitalBurnbagStrings.Canary_AffectedFiles).replace(
                  '{count}',
                  String(dryRunReport.affectedFileCount),
                )}
              </Typography>
              <Typography variant="body2" gutterBottom>
                {t(DigitalBurnbagStrings.Canary_RecipientsCount).replace(
                  '{count}',
                  String(dryRunReport.recipientCount),
                )}
              </Typography>
              <Typography variant="subtitle2" sx={{ mt: 1 }}>
                {t(DigitalBurnbagStrings.Canary_ActionsLabel)}
              </Typography>
              {dryRunReport.actionsDescription.map((desc, i) => (
                <Typography key={i} variant="body2" color="text.secondary">
                  • {desc}
                </Typography>
              ))}
            </>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDryRunDialogOpen(false)}>
            {t(DigitalBurnbagStrings.Common_Close)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
