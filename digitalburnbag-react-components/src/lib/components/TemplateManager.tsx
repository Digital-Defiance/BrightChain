import AddIcon from '@mui/icons-material/Add';
import {
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  TextField,
  Typography,
} from '@mui/material';
import { useCallback, useState } from 'react';

export interface IFolderTemplate {
  id: string;
  name: string;
  description?: string;
  isBuiltIn: boolean;
}

export interface ITemplateManagerProps {
  templates: IFolderTemplate[];
  onCreateFromTemplate: (
    templateId: string,
    folderName: string,
  ) => Promise<void>;
  onSaveAsTemplate: (name: string, description: string) => Promise<void>;
}

/**
 * Template manager for creating folders from templates.
 */
export function TemplateManager({
  templates,
  onCreateFromTemplate,
  onSaveAsTemplate,
}: ITemplateManagerProps) {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<string | null>(null);
  const [folderName, setFolderName] = useState('');
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState('');
  const [templateDesc, setTemplateDesc] = useState('');

  const handleCreate = useCallback(async () => {
    if (!selectedTemplate || !folderName.trim()) return;
    await onCreateFromTemplate(selectedTemplate, folderName.trim());
    setCreateDialogOpen(false);
    setFolderName('');
    setSelectedTemplate(null);
  }, [selectedTemplate, folderName, onCreateFromTemplate]);

  const handleSave = useCallback(async () => {
    if (!templateName.trim()) return;
    await onSaveAsTemplate(templateName.trim(), templateDesc.trim());
    setSaveDialogOpen(false);
    setTemplateName('');
    setTemplateDesc('');
  }, [templateName, templateDesc, onSaveAsTemplate]);

  return (
    <Box>
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 2,
        }}
      >
        <Typography variant="subtitle1">Folder Templates</Typography>
        <Button
          size="small"
          startIcon={<AddIcon />}
          onClick={() => setSaveDialogOpen(true)}
        >
          Save Current as Template
        </Button>
      </Box>

      <Grid container spacing={2}>
        {templates.map((t) => (
          <Grid key={t.id} size={{ xs: 12, sm: 6, md: 4 }}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="subtitle2">{t.name}</Typography>
                {t.description && (
                  <Typography variant="body2" color="text.secondary">
                    {t.description}
                  </Typography>
                )}
                {t.isBuiltIn && (
                  <Typography variant="caption" color="primary">
                    Built-in
                  </Typography>
                )}
              </CardContent>
              <CardActions>
                <Button
                  size="small"
                  onClick={() => {
                    setSelectedTemplate(t.id);
                    setCreateDialogOpen(true);
                  }}
                >
                  Use Template
                </Button>
              </CardActions>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Create from template dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Create from Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label="Folder name"
            value={folderName}
            onChange={(e) => setFolderName(e.target.value)}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleCreate}
            disabled={!folderName.trim()}
          >
            Create
          </Button>
        </DialogActions>
      </Dialog>

      {/* Save as template dialog */}
      <Dialog
        open={saveDialogOpen}
        onClose={() => setSaveDialogOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>Save as Template</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            fullWidth
            margin="normal"
            label="Template name"
            value={templateName}
            onChange={(e) => setTemplateName(e.target.value)}
          />
          <TextField
            fullWidth
            margin="normal"
            label="Description"
            value={templateDesc}
            onChange={(e) => setTemplateDesc(e.target.value)}
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            onClick={handleSave}
            disabled={!templateName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
