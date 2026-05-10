import { formatDateWithBD } from '../utils/formatBrightDate';
import CheckIcon from '@mui/icons-material/Check';
import ReplyIcon from '@mui/icons-material/Reply';
import {
  Box,
  Button,
  Divider,
  IconButton,
  List,
  ListItem,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

export interface IComment {
  id: string;
  authorName: string;
  content: string;
  createdAt: string;
  resolved: boolean;
  parentId?: string;
}

export interface ICommentsPanelProps {
  comments: IComment[];
  onAddComment: (content: string, parentId?: string) => Promise<void>;
  onResolve: (commentId: string) => void;
}

/**
 * Threaded comments panel for files.
 */
export function CommentsPanel({
  comments,
  onAddComment,
  onResolve,
}: ICommentsPanelProps) {
  const [newComment, setNewComment] = useState('');
  const [replyTo, setReplyTo] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const topLevel = comments.filter((c) => !c.parentId);
  const replies = (parentId: string) =>
    comments.filter((c) => c.parentId === parentId);

  const handleSubmit = useCallback(async () => {
    if (!newComment.trim()) return;
    setSubmitting(true);
    try {
      await onAddComment(newComment.trim(), replyTo ?? undefined);
      setNewComment('');
      setReplyTo(null);
    } finally {
      setSubmitting(false);
    }
  }, [newComment, replyTo, onAddComment]);

  const renderComment = (comment: IComment, depth: number) => (
    <Box key={comment.id} sx={{ pl: depth * 3 }}>
      <ListItem disableGutters sx={{ alignItems: 'flex-start' }}>
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="subtitle2">{comment.authorName}</Typography>
            <Typography variant="caption" color="text.secondary">
              {formatDateWithBD(comment.createdAt)}
            </Typography>
            {comment.resolved && (
              <Typography variant="caption" color="success.main">
                Resolved
              </Typography>
            )}
          </Box>
          <Typography variant="body2">{comment.content}</Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          <Tooltip title="Reply">
            <IconButton
              size="small"
              onClick={() => setReplyTo(comment.id)}
              aria-label="Reply"
            >
              <ReplyIcon fontSize="small" />
            </IconButton>
          </Tooltip>
          {!comment.resolved && (
            <Tooltip title="Resolve">
              <IconButton
                size="small"
                onClick={() => onResolve(comment.id)}
                aria-label="Resolve"
              >
                <CheckIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
        </Box>
      </ListItem>
      {replies(comment.id).map((r) => renderComment(r, depth + 1))}
    </Box>
  );

  return (
    <Box>
      <List dense>
        {topLevel.length === 0 ? (
          <Typography
            variant="body2"
            color="text.secondary"
            textAlign="center"
            py={2}
          >
            No comments yet
          </Typography>
        ) : (
          topLevel.map((c) => renderComment(c, 0))
        )}
      </List>
      <Divider sx={{ my: 1 }} />
      {replyTo && (
        <Typography variant="caption" color="text.secondary" sx={{ px: 1 }}>
          Replying to comment…{' '}
          <Button size="small" onClick={() => setReplyTo(null)}>
            Cancel
          </Button>
        </Typography>
      )}
      <Box sx={{ display: 'flex', gap: 1, p: 1 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Add a comment…"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          multiline
          maxRows={4}
        />
        <Button
          variant="contained"
          size="small"
          onClick={handleSubmit}
          disabled={submitting || !newComment.trim()}
        >
          Post
        </Button>
      </Box>
    </Box>
  );
}
