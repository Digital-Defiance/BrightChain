/**
 * Post Components
 * Components for displaying and creating posts
 *
 * @remarks
 * Implements Requirements 12.1, 12.2
 * - PostCard: Displays individual posts
 * - PostComposer: Creates new posts
 */

export { PostCard } from './PostCard';
export type { PostCardProps } from './PostCard';

export { HUB_POST_MAX_CHAR_COUNT, PostComposer } from './PostComposer';
export type { PostComposerProps, PostComposerSubmitData } from './PostComposer';

export { MarkupHelpDialog } from './MarkupHelpDialog';
export type { MarkupHelpDialogProps } from './MarkupHelpDialog';

export { EditPostDialog } from './EditPostDialog';
export type { EditPostDialogProps } from './EditPostDialog';

export { extractMarkdownImages, updateAltText } from './inlineImageUtils';

export { default as ImageCropDialog } from './ImageCropDialog';
export type { ImageCropDialogProps } from './ImageCropDialog';

export { default as FontAwesomeIconPicker } from './FontAwesomeIconPicker';
export type { FontAwesomeIconPickerProps } from './FontAwesomeIconPicker';
