/**
 * AttachmentBar — File attachment upload, listing, and removal component.
 *
 * Provides a hidden file input triggered by an "Attach" icon button,
 * displays attached files with human-readable sizes and remove buttons,
 * and validates per-file and cumulative size against the 25 MB limit.
 *
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5, 3.6, 3.8
 */

import {
  formatFileSize,
  MAX_ATTACHMENT_SIZE_BYTES,
  validateAttachmentSize,
  validateTotalAttachmentSize,
} from '@brightchain/brightchain-lib';
import { BrightMailStrings } from '@brightchain/brightmail-lib';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import DeleteIcon from '@mui/icons-material/Delete';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemText from '@mui/material/ListItemText';
import Typography from '@mui/material/Typography';
import { ChangeEvent, FC, memo, useCallback, useRef, useState } from 'react';

import { useBrightMailTranslation } from './hooks/useBrightMailTranslation';

// ─── Types ──────────────────────────────────────────────────────────────────

/**
 * Represents a file attachment in the compose form.
 * The `base64Data` field is populated before send.
 */
export interface AttachmentFile {
  file: File;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  base64Data?: string;
}

export interface AttachmentBarProps {
  attachments: AttachmentFile[];
  onChange: (files: AttachmentFile[]) => void;
  maxTotalBytes?: number;
}

// ─── Component ──────────────────────────────────────────────────────────────

const AttachmentBar: FC<AttachmentBarProps> = ({
  attachments,
  onChange,
  maxTotalBytes = MAX_ATTACHMENT_SIZE_BYTES,
}) => {
  const { t } = useBrightMailTranslation();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);

  const handleAttachClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: ChangeEvent<HTMLInputElement>) => {
      const selectedFiles = e.target.files;
      if (!selectedFiles || selectedFiles.length === 0) {
        // File picker cancelled — no-op (Requirement 3.8)
        return;
      }

      setError(null);

      const newAttachments: AttachmentFile[] = [];
      const existingSizes = attachments.map((a) => a.sizeBytes);

      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];

        // Per-file size validation (Requirement 3.4)
        if (!validateAttachmentSize(file.size, maxTotalBytes)) {
          setError(
            t(BrightMailStrings.Attachment_FileSizeExceededTemplate)
              .replace('{FILENAME}', file.name)
              .replace('{LIMIT}', formatFileSize(maxTotalBytes)),
          );
          // Reset input so the same file can be re-selected
          if (fileInputRef.current) fileInputRef.current.value = '';
          return;
        }

        newAttachments.push({
          file,
          filename: file.name,
          mimeType: file.type || 'application/octet-stream',
          sizeBytes: file.size,
        });
      }

      // Cumulative size validation (Requirement 3.5)
      const allSizes = [
        ...existingSizes,
        ...newAttachments.map((a) => a.sizeBytes),
      ];
      if (!validateTotalAttachmentSize(allSizes, maxTotalBytes)) {
        setError(
          t(BrightMailStrings.Attachment_TotalSizeExceeded).replace(
            '{LIMIT}',
            formatFileSize(maxTotalBytes),
          ),
        );
        if (fileInputRef.current) fileInputRef.current.value = '';
        return;
      }

      onChange([...attachments, ...newAttachments]);

      // Reset input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    },
    [attachments, onChange, maxTotalBytes],
  );

  const handleRemove = useCallback(
    (index: number) => {
      const updated = attachments.filter((_, i) => i !== index);
      onChange(updated);
      setError(null);
    },
    [attachments, onChange],
  );

  return (
    <Box data-testid="attachment-bar">
      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        style={{ display: 'none' }}
        onChange={handleFileChange}
        data-testid="attachment-file-input"
      />

      {/* Attach button */}
      <IconButton
        onClick={handleAttachClick}
        aria-label={t(BrightMailStrings.Attachment_AttachFiles)}
        data-testid="attach-button"
        size="small"
      >
        <AttachFileIcon />
      </IconButton>

      {/* Error message */}
      {error && (
        <Typography
          variant="caption"
          color="error"
          role="alert"
          data-testid="attachment-error"
          sx={{ display: 'block', mt: 0.5 }}
        >
          {error}
        </Typography>
      )}

      {/* Attachment list */}
      {attachments.length > 0 && (
        <List dense data-testid="attachment-list">
          {attachments.map((att, idx) => (
            <ListItem
              key={`${att.filename}-${idx}`}
              data-testid={`attachment-item-${idx}`}
              secondaryAction={
                <IconButton
                  edge="end"
                  aria-label={t(
                    BrightMailStrings.Attachment_RemoveTemplate,
                  ).replace('{FILENAME}', att.filename)}
                  onClick={() => handleRemove(idx)}
                  data-testid={`attachment-remove-${idx}`}
                  size="small"
                >
                  <DeleteIcon fontSize="small" />
                </IconButton>
              }
            >
              <ListItemText
                primary={att.filename}
                secondary={formatFileSize(att.sizeBytes)}
              />
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
};

export default memo(AttachmentBar);
