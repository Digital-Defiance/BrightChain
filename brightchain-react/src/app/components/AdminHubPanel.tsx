import {
  faNewspaper,
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
  MenuItem,
  Select,
  SelectChangeEvent,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import { FC, memo, useCallback, useEffect, useState } from 'react';
import authenticatedApi from '../../services/authenticatedApi';

interface HubPost {
  id: string;
  authorId: string;
  authorUsername: string;
  content: string;
  createdAt: string;
  isDeleted: boolean;
  likeCount: number;
  repostCount: number;
}

interface PostsResponse {
  posts: HubPost[];
  total: number;
  page: number;
  limit: number;
}

const PAGE_LIMIT = 20;

const AdminHubPanel: FC = () => {
  const { tBranded: t } = useI18n();
  const [posts, setPosts] = useState<HubPost[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [authorFilter, setAuthorFilter] = useState('');
  const [deletedFilter, setDeletedFilter] = useState<string>('All');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deletePostId, setDeletePostId] = useState<string | null>(null);

  const fetchPosts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: String(PAGE_LIMIT),
      });
      if (authorFilter.trim()) params.set('authorId', authorFilter.trim());
      if (deletedFilter !== 'All') params.set('isDeleted', deletedFilter);
      const res = await authenticatedApi.get(
        `/admin/hub/posts?${params.toString()}`,
      );
      const data: PostsResponse = res.data.data ?? res.data;
      setPosts(data.posts);
      setTotal(data.total);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch posts');
    } finally {
      setLoading(false);
    }
  }, [page, authorFilter, deletedFilter]);

  useEffect(() => {
    fetchPosts();
  }, [fetchPosts]);

  const handleDelete = async () => {
    if (!deletePostId) return;
    try {
      await authenticatedApi.delete(`/admin/hub/posts/${deletePostId}`);
      setDeleteOpen(false);
      setDeletePostId(null);
      fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete post');
      setDeleteOpen(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_LIMIT));

  return (
    <Box>
      <Box display="flex" alignItems="center" gap={1} mb={2}>
        <FontAwesomeIcon icon={faNewspaper} />
        <Typography variant="h6">
          {t(BrightChainStrings.Admin_Hub_Title)}
        </Typography>
      </Box>

      <Box display="flex" alignItems="center" gap={2} mb={2}>
        <TextField
          size="small"
          placeholder={t(BrightChainStrings.Admin_Hub_FilterByAuthorId)}
          value={authorFilter}
          onChange={(e) => setAuthorFilter(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') setPage(1);
          }}
        />
        <Select
          size="small"
          value={deletedFilter}
          onChange={(e: SelectChangeEvent<string>) => {
            setDeletedFilter(e.target.value);
            setPage(1);
          }}
          sx={{ minWidth: 140 }}
        >
          <MenuItem value="All">
            {t(BrightChainStrings.Admin_Hub_FilterAllPosts)}
          </MenuItem>
          <MenuItem value="false">
            {t(BrightChainStrings.Admin_Hub_FilterActive)}
          </MenuItem>
          <MenuItem value="true">
            {t(BrightChainStrings.Admin_Hub_FilterDeleted)}
          </MenuItem>
        </Select>
      </Box>

      {error && (
        <Typography color="error" mb={1}>
          {error}
        </Typography>
      )}

      <Table size="small">
        <TableHead>
          <TableRow>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColAuthor)}</TableCell>
            <TableCell>
              {t(BrightChainStrings.Admin_Hub_ColContentPreview)}
            </TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColCreated)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColStatus)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColLikes)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColReposts)}</TableCell>
            <TableCell>{t(BrightChainStrings.Admin_Hub_ColActions)}</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {loading && posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Common_Loading)}
              </TableCell>
            </TableRow>
          ) : posts.length === 0 ? (
            <TableRow>
              <TableCell colSpan={7} align="center">
                {t(BrightChainStrings.Admin_Hub_NoPostsFound)}
              </TableCell>
            </TableRow>
          ) : (
            posts.map((post) => (
              <TableRow key={post.id}>
                <TableCell>{post.authorUsername}</TableCell>
                <TableCell
                  sx={{
                    maxWidth: 300,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {post.content}
                </TableCell>
                <TableCell>
                  {new Date(post.createdAt).toLocaleString()}
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      post.isDeleted
                        ? t(BrightChainStrings.Admin_Hub_StatusDeleted)
                        : t(BrightChainStrings.Admin_Hub_StatusActive)
                    }
                    color={post.isDeleted ? 'default' : 'success'}
                    size="small"
                  />
                </TableCell>
                <TableCell>{post.likeCount}</TableCell>
                <TableCell>{post.repostCount}</TableCell>
                <TableCell>
                  {!post.isDeleted && (
                    <Tooltip
                      title={t(BrightChainStrings.Admin_Hub_SoftDeletePost)}
                    >
                      <IconButton
                        size="small"
                        color="error"
                        onClick={() => {
                          setDeletePostId(post.id);
                          setDeleteOpen(true);
                        }}
                      >
                        <FontAwesomeIcon icon={faTrash} />
                      </IconButton>
                    </Tooltip>
                  )}
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
          {t(BrightChainStrings.Admin_Hub_DeletePostTitle)}
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {t(BrightChainStrings.Admin_Hub_DeletePostConfirm)}
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

export default memo(AdminHubPanel);
