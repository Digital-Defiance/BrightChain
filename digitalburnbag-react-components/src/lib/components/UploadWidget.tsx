import { DigitalBurnbagStrings } from '@brightchain/digitalburnbag-lib';
import { useI18n } from '@digitaldefiance/express-suite-react-components';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';
import ErrorIcon from '@mui/icons-material/Error';
import {
  Box,
  LinearProgress,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
} from '@mui/material';
import type { DragEvent as ReactDragEvent } from 'react';
import React, { useCallback, useRef, useState } from 'react';

export interface IUploadProgress {
  fileName: string;
  progress: number;
  status: 'uploading' | 'complete' | 'error';
  error?: string;
}

export interface IUploadWidgetProps {
  onUploadFiles: (files: File[]) => void;
  onUploadFolder?: (files: File[], basePath: string) => void;
  uploadProgress?: IUploadProgress[];
  disabled?: boolean;
}

export function UploadWidget({
  onUploadFiles,
  uploadProgress,
  disabled = false,
}: IUploadWidgetProps) {
  const { tBranded: t } = useI18n();
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault();
      if (!disabled) setDragOver(true);
    },
    [disabled],
  );

  const handleDragLeave = useCallback(() => setDragOver(false), []);

  const handleDrop = useCallback(
    (e: ReactDragEvent) => {
      e.preventDefault();
      setDragOver(false);
      if (disabled) return;
      const files = Array.from(e.dataTransfer.files);
      if (files.length > 0) onUploadFiles(files);
    },
    [disabled, onUploadFiles],
  );

  const handleClick = useCallback(() => {
    if (!disabled) inputRef.current?.click();
  }, [disabled]);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) onUploadFiles(files);
      e.target.value = '';
    },
    [onUploadFiles],
  );

  return (
    <Box>
      <Box
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        aria-label={t(DigitalBurnbagStrings.Upload_DropZoneLabel)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') handleClick();
        }}
        sx={{
          border: '2px dashed',
          borderColor: dragOver ? 'primary.main' : 'divider',
          borderRadius: 2,
          p: 4,
          textAlign: 'center',
          cursor: disabled ? 'default' : 'pointer',
          bgcolor: dragOver ? 'action.hover' : 'transparent',
          opacity: disabled ? 0.5 : 1,
          transition: 'all 0.2s',
        }}
      >
        <CloudUploadIcon
          sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }}
        />
        <Typography color="text.secondary">
          {t(DigitalBurnbagStrings.Upload_DropOrBrowse)}
        </Typography>
      </Box>
      <input
        ref={inputRef}
        type="file"
        multiple
        hidden
        onChange={handleFileChange}
        aria-hidden
      />

      {uploadProgress && uploadProgress.length > 0 && (
        <List dense sx={{ mt: 2 }}>
          {uploadProgress.map((item) => (
            <ListItem key={item.fileName}>
              <ListItemIcon sx={{ minWidth: 36 }}>
                {item.status === 'complete' && (
                  <CheckCircleIcon color="success" fontSize="small" />
                )}
                {item.status === 'error' && (
                  <ErrorIcon color="error" fontSize="small" />
                )}
                {item.status === 'uploading' && (
                  <CloudUploadIcon color="primary" fontSize="small" />
                )}
              </ListItemIcon>
              <ListItemText
                primary={item.fileName}
                secondary={
                  item.status === 'error'
                    ? (item.error ?? t(DigitalBurnbagStrings.Upload_Failed))
                    : `${item.progress}%`
                }
              />
              {item.status === 'uploading' && (
                <Box sx={{ width: 120, ml: 2 }}>
                  <LinearProgress
                    variant="determinate"
                    value={item.progress}
                    aria-label={`${item.fileName} upload progress`}
                  />
                </Box>
              )}
            </ListItem>
          ))}
        </List>
      )}
    </Box>
  );
}
