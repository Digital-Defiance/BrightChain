import {
  faEnvelope,
  faTrash,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

interface Email {
  id: string;
  senderId: string;
  senderUsername: string;
  recipientCount: number;
  subject: string;
  createdAt: string;
  deliveryStatus: string;
}

interface EmailsResponse {
  emails: Email[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const deliveryStatusColor = (
  status: string,
): 'success' | 'error' | 'warning' | 'default' => {
  switch (status.toLowerCase()) {
    case 'delivered':
      return 'success';
    case 'failed':
      return 'error';
    case 'pending':
    case 'queued':
      return 'warning';
    default:
      return 'default';
  }
};

const AdminMailPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const [emails, setEmails] = useState<Email[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteEmailId, setDeleteEmailId] = useState<string | null>(null);

  const fetchEmails = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      const res = await authenticatedApi.get(
        `/admin/mail/emails?${params.toString()}`,
      );
      const data: EmailsResponse = res.data.data ?? res.data;
      setEmails(data.emails);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch emails');
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchEmails();
  }, [fetchEmails]);

  const handleDelete = async () => {
    if (!deleteEmailId) return;
    try {
      await authenticatedApi.delete(`/admin/mail/emails/${deleteEmailId}`);
      setDeleteOpen(false);
      setDeleteEmailId(null);
      fetchEmails();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete email');
      setDeleteOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faEnvelope} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Mail_Title)}
        </Typography>
      </Box>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(BrightChainStrings.Admin_Mail_ColSender)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Mail_ColRecipients)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Mail_ColSubject)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Mail_ColCreated)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Mail_ColDeliveryStatus)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Mail_ColActions)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && emails.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : emails.length === 0 ? (
            <TableRow>
              <TableCell colSpan={6} align="center">
                {t(BrightChainStrings.Admin_Mail_NoEmailsFound)}
              </TableCell>
            </TableRow>
          ) : (
            emails.map((email) => (
              <TableRow key={email.id}>
                <TableCell>{email.senderUsername}</TableCell>
                <TableCell>{email.recipientCount}</TableCell>
                <TableCell
                  sx={{
                    maxWidth: 250,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {email.subject}
                </TableCell>
                <TableCell>
                  {new Date(email.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={email.deliveryStatus}
                    color={deliveryStatusColor(email.deliveryStatus)}
                    size="small"
                  />
                </TableCell>
                <TableCell>
                  <Tooltip title={t(BrightChainStrings.Admin_Mail_DeleteEmail)}>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setDeleteEmailId(email.id);
                        setDeleteOpen(true);
                      }}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                    </IconButton>
                  </Tooltip>
                </TableCell>
              </TableRow>
            ))
          )}
        </TableBody>
      </Table>

      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        gap={2}
        mt={2}
      >
        <Button
          size="small"
          disabled={page <= 1}
          onClick={() => setPage((p) => Math.max(1, p - 1))}
        >
          {t(BrightChainStrings.Admin_Common_Previous)}
        </Button>
        <Typography variant="body2">
          {t(BrightChainStrings.Admin_Common_PageTemplate, {
            PAGE: String(page),
            TOTAL: String(totalPages),
          })}
        </Typography>
        <Button
          size="small"
          disabled={page >= totalPages}
          onClick={() => setPage((p) => p + 1)}
        >
          {t(BrightChainStrings.Admin_Common_Next)}
        </Button>
      </Box>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>
          {t(BrightChainStrings.Admin_Mail_DeleteEmailTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Mail_DeleteEmailConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button onClick={handleDelete} color="error" variant="contained">
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default memo(AdminMailPanel);
