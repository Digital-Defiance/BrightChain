/**
 * PostComposer Component
 *
 * Provides a rich text editor for creating new posts with markdown,
 * emoji, and FontAwesome icon support. Includes media attachment upload,
 * character counting, hub visibility selection, and reply/quote context.
 *
 * @remarks
 * Implements Requirement 12.2
 */

import { BrightHubStrings } from '@brightchain/brightchain-lib';
import {
  IBaseHub,
  IBasePostData,
  IBaseUserProfile,
  getCharacterCount,
  parsePostContent,
} from '@brightchain/brighthub-lib';
import {
  Close,
  Code,
  EmojiEmotions,
  FormatBold,
  FormatItalic,
  HelpOutline,
  Image,
  Send,
  Visibility,
} from '@mui/icons-material';
import {
  Avatar,
  Box,
  Button,
  Card,
  Chip,
  CircularProgress,
  FormControl,
  IconButton,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  ToggleButton,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  type ChangeEvent,
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useBrightHubTranslation } from '../hooks/useBrightHubTranslation';
import { MarkupHelpDialog } from './MarkupHelpDialog';

/** Maximum character count for a post */
const MAX_CHAR_COUNT = 280;

/** Maximum number of media attachments */
const MAX_ATTACHMENTS = 4;

/** Props for the PostComposer component */
export interface PostComposerProps {
  /** Current user's profile */
  currentUser?: IBaseUserProfile<string>;
  /** Post being replied to */
  replyTo?: IBasePostData<string>;
  /** Author of the post being replied to */
  replyToAuthor?: IBaseUserProfile<string>;
  /** Post being quoted */
  quotedPost?: IBasePostData<string>;
  /** Author of the quoted post */
  quotedPostAuthor?: IBaseUserProfile<string>;
  /** Available hubs for visibility selection */
  hubOptions?: IBaseHub<string>[];
  /** Whether the composer is in a submitting state */
  isSubmitting?: boolean;
  /** Callback when the post is submitted */
  onSubmit?: (data: PostComposerSubmitData) => void;
  /** Callback when the composer is cancelled/closed */
  onCancel?: () => void;
  /** Placeholder text for the editor */
  placeholder?: string;
}

/** Data submitted from the PostComposer */
export interface PostComposerSubmitData {
  /** Raw text content */
  content: string;
  /** Selected media files */
  mediaFiles: File[];
  /** Selected hub IDs for visibility restriction */
  hubIds: string[];
  /** ID of the post being replied to */
  replyToId?: string;
  /** ID of the post being quoted */
  quotedPostId?: string;
  /** Whether this is a blog post (enables full markdown rendering) */
  isBlogPost: boolean;
}

/**
 * PostComposer
 *
 * A textarea-based post creation component with a formatting toolbar,
 * media attachment support, character count indicator, and hub
 * visibility selection.
 */
export function PostComposer({
  currentUser,
  replyTo,
  replyToAuthor,
  quotedPost,
  quotedPostAuthor,
  hubOptions,
  isSubmitting = false,
  onSubmit,
  onCancel,
  placeholder,
}: PostComposerProps) {
  const { t } = useBrightHubTranslation();
  const [content, setContent] = useState('');
  const [mediaFiles, setMediaFiles] = useState<File[]>([]);
  const [mediaPreviews, setMediaPreviews] = useState<string[]>([]);
  const [selectedHubIds, setSelectedHubIds] = useState<string[]>([]);
  const [showPreview, setShowPreview] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Top-level posts are blog posts (markdown enabled), replies are not
  const isReply = !!replyTo;
  const isBlogPost = !isReply;

  const previewHtml = useMemo(
    () =>
      showPreview && content.trim()
        ? parsePostContent(content, isBlogPost)
        : '',
    [showPreview, content, isBlogPost],
  );

  const charCount = useMemo(
    () => getCharacterCount(content, isBlogPost),
    [content, isBlogPost],
  );
  const charRemaining = MAX_CHAR_COUNT - charCount;
  const isOverLimit = charRemaining < 0;
  const canSubmit = content.trim().length > 0 && !isOverLimit && !isSubmitting;

  const charProgressValue = useMemo(
    () => Math.min((charCount / MAX_CHAR_COUNT) * 100, 100),
    [charCount],
  );

  const charProgressColor = useMemo(() => {
    if (isOverLimit) return 'error' as const;
    if (charRemaining <= 20) return 'warning' as const;
    return 'primary' as const;
  }, [isOverLimit, charRemaining]);

  const handleContentChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
    setContent(e.target.value);
  };

  const insertMarkdown = useCallback(
    (prefix: string, suffix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const selected = content.substring(start, end);
      const newContent =
        content.substring(0, start) +
        prefix +
        selected +
        suffix +
        content.substring(end);
      setContent(newContent);
      // Restore focus after state update
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(
          start + prefix.length,
          start + prefix.length + selected.length,
        );
      }, 0);
    },
    [content],
  );

  const handleBold = () => insertMarkdown('**', '**');
  const handleItalic = () => insertMarkdown('*', '*');
  const handleCode = () => insertMarkdown('`', '`');
  const handleEmoji = () => insertMarkdown('😊', '');

  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    const remaining = MAX_ATTACHMENTS - mediaFiles.length;
    const newFiles = files.slice(0, remaining);

    setMediaFiles((prev) => [...prev, ...newFiles]);

    // Generate previews
    newFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setMediaPreviews((prev) => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleRemoveMedia = (index: number) => {
    setMediaFiles((prev) => prev.filter((_, i) => i !== index));
    setMediaPreviews((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit?.({
      content,
      mediaFiles,
      hubIds: selectedHubIds,
      replyToId: replyTo?._id,
      quotedPostId: quotedPost?._id,
      isBlogPost: isBlogPost,
    });
  };

  return (
    <Card variant="outlined" sx={{ p: 2 }}>
      {/* Reply context */}
      {replyTo && (
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, gap: 0.5 }}>
          <Typography variant="caption" color="text.secondary">
            {t(BrightHubStrings.PostComposer_ReplyingTo)}
          </Typography>
          <Typography variant="caption" color="primary">
            @{replyToAuthor?.username ?? 'unknown'}
          </Typography>
          {onCancel && (
            <IconButton
              size="small"
              onClick={onCancel}
              aria-label={t(BrightHubStrings.PostComposer_CancelReply)}
              sx={{ ml: 'auto' }}
            >
              <Close sx={{ fontSize: 16 }} />
            </IconButton>
          )}
        </Box>
      )}

      <Box sx={{ display: 'flex', gap: 1.5 }}>
        {/* Current user avatar */}
        <Avatar
          src={currentUser?.profilePictureUrl}
          sx={{ width: 40, height: 40 }}
        >
          {(currentUser?.displayName ?? 'U').charAt(0).toUpperCase()}
        </Avatar>

        <Box sx={{ flex: 1 }}>
          {/* Text input */}
          <TextField
            inputRef={textareaRef}
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            variant="standard"
            placeholder={
              replyTo
                ? t(BrightHubStrings.PostComposer_ReplyPlaceholder)
                : (placeholder ?? t(BrightHubStrings.PostComposer_Placeholder))
            }
            value={content}
            onChange={handleContentChange}
            disabled={isSubmitting}
            sx={{ display: showPreview ? 'none' : undefined }}
            slotProps={{
              input: {
                disableUnderline: true,
                sx: { fontSize: '1.1rem' },
                'aria-label': replyTo
                  ? t(BrightHubStrings.PostComposer_ReplyPlaceholder)
                  : (placeholder ??
                    t(BrightHubStrings.PostComposer_Placeholder)),
              },
            }}
          />

          {/* Preview panel */}
          {showPreview && content.trim() && (
            <Box
              aria-label={t(BrightHubStrings.PostComposer_PreviewAriaLabel)}
              sx={{
                minHeight: 80,
                py: 1,
                '& p': { m: 0 },
                wordBreak: 'break-word',
                fontSize: '1.1rem',
              }}
              dangerouslySetInnerHTML={{ __html: previewHtml }}
            />
          )}

          {/* Quoted post preview */}
          {quotedPost && (
            <Card variant="outlined" sx={{ p: 1.5, mt: 1 }}>
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 0.5,
                  mb: 0.5,
                }}
              >
                <Avatar
                  src={quotedPostAuthor?.profilePictureUrl}
                  sx={{ width: 20, height: 20 }}
                >
                  {(quotedPostAuthor?.displayName ?? '?').charAt(0)}
                </Avatar>
                <Typography variant="caption" fontWeight="bold">
                  {quotedPostAuthor?.displayName ?? 'Unknown'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  @{quotedPostAuthor?.username ?? 'unknown'}
                </Typography>
              </Box>
              <Typography variant="body2" noWrap>
                {quotedPost.content}
              </Typography>
            </Card>
          )}

          {/* Media previews */}
          {mediaPreviews.length > 0 && (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns:
                  mediaPreviews.length === 1 ? '1fr' : '1fr 1fr',
                gap: 0.5,
                mt: 1,
              }}
            >
              {mediaPreviews.map((preview, index) => (
                <Box key={index} sx={{ position: 'relative' }}>
                  <Box
                    component="img"
                    src={preview}
                    alt={t(
                      BrightHubStrings.PostComposer_AttachmentAltTemplate,
                      { INDEX: String(index + 1) },
                    )}
                    sx={{
                      width: '100%',
                      maxHeight: 200,
                      objectFit: 'cover',
                      borderRadius: 1,
                    }}
                  />
                  <IconButton
                    size="small"
                    onClick={() => handleRemoveMedia(index)}
                    aria-label={t(
                      BrightHubStrings.PostComposer_RemoveAttachmentTemplate,
                      { INDEX: String(index + 1) },
                    )}
                    sx={{
                      position: 'absolute',
                      top: 4,
                      right: 4,
                      bgcolor: 'rgba(0,0,0,0.6)',
                      color: 'white',
                      '&:hover': { bgcolor: 'rgba(0,0,0,0.8)' },
                    }}
                  >
                    <Close sx={{ fontSize: 16 }} />
                  </IconButton>
                </Box>
              ))}
            </Box>
          )}

          {/* Hub visibility selector */}
          {hubOptions && hubOptions.length > 0 && (
            <FormControl size="small" sx={{ mt: 1, minWidth: 200 }}>
              <InputLabel id="hub-select-label">
                {t(BrightHubStrings.PostComposer_VisibleTo)}
              </InputLabel>
              <Select
                labelId="hub-select-label"
                multiple
                value={selectedHubIds}
                onChange={(e) => setSelectedHubIds(e.target.value as string[])}
                label={t(BrightHubStrings.PostComposer_VisibleTo)}
                renderValue={(selected) => (
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                    {selected.map((id) => {
                      const hub = hubOptions.find((c) => c._id === id);
                      return (
                        <Chip key={id} label={hub?.name ?? id} size="small" />
                      );
                    })}
                  </Box>
                )}
              >
                {hubOptions.map((hub) => (
                  <MenuItem key={hub._id} value={hub._id}>
                    {hub.name} ({hub.memberCount} members)
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}

          {/* Toolbar and submit */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              mt: 1,
              pt: 1,
              borderTop: 1,
              borderColor: 'divider',
            }}
          >
            {/* Formatting toolbar */}
            <Box sx={{ display: 'flex', gap: 0.5, alignItems: 'center' }}>
              <Tooltip title={t(BrightHubStrings.PostComposer_Bold)}>
                <IconButton
                  size="small"
                  onClick={handleBold}
                  aria-label={t(BrightHubStrings.PostComposer_Bold)}
                >
                  <FormatBold sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(BrightHubStrings.PostComposer_Italic)}>
                <IconButton
                  size="small"
                  onClick={handleItalic}
                  aria-label={t(BrightHubStrings.PostComposer_Italic)}
                >
                  <FormatItalic sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(BrightHubStrings.PostComposer_Code)}>
                <IconButton
                  size="small"
                  onClick={handleCode}
                  aria-label={t(BrightHubStrings.PostComposer_Code)}
                >
                  <Code sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(BrightHubStrings.PostComposer_Emoji)}>
                <IconButton
                  size="small"
                  onClick={handleEmoji}
                  aria-label={t(BrightHubStrings.PostComposer_Emoji)}
                >
                  <EmojiEmotions sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
              <Tooltip title={t(BrightHubStrings.PostComposer_AttachImage)}>
                <span>
                  <IconButton
                    size="small"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={mediaFiles.length >= MAX_ATTACHMENTS}
                    aria-label={t(BrightHubStrings.PostComposer_AttachImage)}
                  >
                    <Image sx={{ fontSize: 20 }} />
                  </IconButton>
                </span>
              </Tooltip>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/gif,image/webp"
                multiple
                hidden
                onChange={handleFileSelect}
                aria-hidden="true"
              />
              <Tooltip title={t(BrightHubStrings.PostComposer_Preview)}>
                <ToggleButton
                  value="preview"
                  selected={showPreview}
                  onChange={() => setShowPreview((prev) => !prev)}
                  size="small"
                  aria-label={t(BrightHubStrings.PostComposer_Preview)}
                  sx={{ border: 'none', p: 0.5 }}
                >
                  <Visibility sx={{ fontSize: 20 }} />
                </ToggleButton>
              </Tooltip>
              <Tooltip title={t(BrightHubStrings.PostComposer_MarkupHelp)}>
                <IconButton
                  size="small"
                  onClick={() => setShowHelp(true)}
                  aria-label={t(BrightHubStrings.PostComposer_MarkupHelp)}
                >
                  <HelpOutline sx={{ fontSize: 20 }} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Character count and submit */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {content.length > 0 && (
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  <CircularProgress
                    variant="determinate"
                    value={charProgressValue}
                    size={24}
                    color={charProgressColor}
                    thickness={4}
                  />
                  <Typography
                    variant="caption"
                    color={
                      isOverLimit
                        ? 'error'
                        : charRemaining <= 20
                          ? 'warning.main'
                          : 'text.secondary'
                    }
                  >
                    {charRemaining}
                  </Typography>
                </Box>
              )}
              <Button
                variant="contained"
                size="small"
                onClick={handleSubmit}
                disabled={!canSubmit}
                startIcon={
                  isSubmitting ? <CircularProgress size={16} /> : <Send />
                }
                aria-label={t(BrightHubStrings.PostComposer_SubmitPost)}
              >
                {replyTo
                  ? t(BrightHubStrings.PostComposer_Reply)
                  : t(BrightHubStrings.PostComposer_Post)}
              </Button>
            </Box>
          </Box>
        </Box>
      </Box>
      <MarkupHelpDialog
        open={showHelp}
        onClose={() => setShowHelp(false)}
      />
    </Card>
  );
}

export default PostComposer;
