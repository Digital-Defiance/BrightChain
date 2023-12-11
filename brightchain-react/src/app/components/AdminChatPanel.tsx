import {
  faComments,
  faTrash,
} from '@awesome.me/kit-a20d532681/icons/classic/solid';
import { BrightChainStrings } from '@brightchain/brightchain-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  Box,
  Button,
  Chip,
  Collapse,
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

interface Conversation {
  id: string;
  participantCount: number;
  messageCount: number;
  createdAt: string;
  lastActivityAt: string;
}

interface ChatMessage {
  id: string;
  senderId: string;
  content: string;
  createdAt: string;
  isDeleted: boolean;
}

interface ConversationsResponse {
  conversations: Conversation[];
  total: number;
  page: number;
  limit: number;
}

interface MessagesResponse {
  messages: ChatMessage[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const AdminChatPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgPage, setMsgPage] = useState(1);
  const [msgTotal, setMsgTotal] = useState(0);
  const [msgLoading, setMsgLoading] = useState(false);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteMessageId, setDeleteMessageId] = useState<string | null>(null);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      const res = await authenticatedApi.get(
        `/admin/chat/conversations?${params.toString()}`,
      );
      const data: ConversationsResponse = res.data.data ?? res.data;
      setConversations(data.conversations);
      setTotal(data.total);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Failed to fetch conversations',
      );
    } finally {
      setLoading(false);
    }
  }, [page]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const fetchMessages = useCallback(
    async (conversationId: string, messagePage: number) => {
      setMsgLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(messagePage),
          limit: String(PAGE_LIMIT),
        });
        const res = await authenticatedApi.get(
          `/admin/chat/conversations/${conversationId}/messages?${params.toString()}`,
        );
        const data: MessagesResponse = res.data.data ?? res.data;
        setMessages(data.messages);
        setMsgTotal(data.total);
      } catch (err) {
        setError(
          err instanceof Error ? err.message : 'Failed to fetch messages',
        );
      } finally {
        setMsgLoading(false);
      }
    },
    [],
  );

  const toggleExpand = (conversationId: string) => {
    if (expandedId === conversationId) {
      setExpandedId(null);
      setMessages([]);
    } else {
      setExpandedId(conversationId);
      setMsgPage(1);
      fetchMessages(conversationId, 1);
    }
  };

  const handleDeleteMessage = async () => {
    if (!deleteMessageId) return;
    try {
      await authenticatedApi.delete(`/admin/chat/messages/${deleteMessageId}`);
      setDeleteOpen(false);
      setDeleteMessageId(null);
      if (expandedId) fetchMessages(expandedId, msgPage);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete message');
      setDeleteOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));
  const msgTotalPages = Math.max(1, Math.ceil(msgTotal / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faComments} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Chat_Title)}
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
            <TableCell>{t(BrightChainStrings.Admin_Chat_ColId)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Chat_ColParticipants)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Chat_ColMessages)}
            </TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Chat_ColLastActivity)}
            </TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && conversations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : conversations.length === 0 ? (
            <TableRow>
              <TableCell colSpan={4} align="center">
                {t(BrightChainStrings.Admin_Chat_NoConversationsFound)}
              </TableCell>
            </TableRow>
          ) : (
            conversations.map((conv) => (
              <TableRow key={conv.id}>
                <TableCell>
                  <Button size="small" onClick={() => toggleExpand(conv.id)}>
                    {conv.id.length > 12 ? `${conv.id.slice(0, 12)}…` : conv.id}
                  </Button>
                </TableCell>
                <TableCell>{conv.participantCount}</TableCell>
                <TableCell>{conv.messageCount}</TableCell>
                <TableCell>
                  {new Date(conv.lastActivityAt).toLocaleString()}
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

      <Collapse in={!!expandedId} timeout="auto">
        {expandedId && (
          <Box mt={2} p={2} border={1} borderColor="divider" borderRadius={1}>
            <Typography variant="subtitle2" mb={1}>
              {t(BrightChainStrings.Admin_Chat_MessagesForTemplate, {
                CONVERSATION_ID: expandedId,
              })}
            </Typography>
            {msgLoading ? (
              <Typography variant="body2">
                {t(BrightChainStrings.Admin_Chat_LoadingMessages)}
              </Typography>
            ) : messages.length === 0 ? (
              <Typography variant="body2">
                {t(BrightChainStrings.Admin_Chat_NoMessages)}
              </Typography>
            ) : (
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Chat_ColSender)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Chat_ColContent)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Chat_ColCreated)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Chat_ColStatus)}
                    </TableCell>
                    <TableCell>
                      {t(BrightChainStrings.Admin_Pass_ColActions)}
                    </TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {messages.map((msg) => (
                    <TableRow key={msg.id}>
                      <TableCell>{msg.senderId}</TableCell>
                      <TableCell
                        sx={{
                          maxWidth: 300,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {msg.content}
                      </TableCell>
                      <TableCell>
                        {new Date(msg.createdAt).toLocaleString()}
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={
                            msg.isDeleted
                              ? t(BrightChainStrings.Admin_Chat_StatusDeleted)
                              : t(BrightChainStrings.Admin_Chat_StatusActive)
                          }
                          color={msg.isDeleted ? 'default' : 'success'}
                          size="small"
                        />
                      </TableCell>
                      <TableCell>
                        {!msg.isDeleted && (
                          <Tooltip
                            title={t(
                              BrightChainStrings.Admin_Chat_DeleteMessage,
                            )}
                          >
                            <IconButton
                              size="small"
                              color="error"
                              onClick={() => {
                                setDeleteMessageId(msg.id);
                                setDeleteOpen(true);
                              }}
                            >
                              <FontAwesomeIcon icon={faTrash} />
                            </IconButton>
                          </Tooltip>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Box
              display="flex"
              justifyContent="center"
              alignItems="center"
              gap={2}
              mt={1}
            >
              <Button
                size="small"
                disabled={msgPage <= 1}
                onClick={() => {
                  const newPage = Math.max(1, msgPage - 1);
                  setMsgPage(newPage);
                  fetchMessages(expandedId, newPage);
                }}
              >
                {t(BrightChainStrings.Admin_Common_Previous)}
              </Button>
              <Typography variant="body2">
                {t(BrightChainStrings.Admin_Common_PageTemplate, {
                  PAGE: String(msgPage),
                  TOTAL: String(msgTotalPages),
                })}
              </Typography>
              <Button
                size="small"
                disabled={msgPage >= msgTotalPages}
                onClick={() => {
                  const newPage = msgPage + 1;
                  setMsgPage(newPage);
                  fetchMessages(expandedId, newPage);
                }}
              >
                {t(BrightChainStrings.Admin_Common_Next)}
              </Button>
            </Box>
          </Box>
        )}
      </Collapse>

      <Dialog open={deleteOpen} onClose={() => setDeleteOpen(false)}>
        <DialogTitle>
          {t(BrightChainStrings.Admin_Chat_DeleteMessageTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Chat_DeleteMessageConfirm)}
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDeleteOpen(false)}>
            {t(BrightChainStrings.Admin_Common_Cancel)}
          </Button>
          <Button
            onClick={handleDeleteMessage}
            color="error"
            variant="contained"
          >
            {t(BrightChainStrings.Admin_Common_Delete)}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default memo(AdminChatPanel);
