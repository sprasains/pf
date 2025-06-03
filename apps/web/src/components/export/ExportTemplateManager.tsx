import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
  SelectChangeEvent,
} from '@mui/material';
import { Add as AddIcon, Compare as CompareIcon } from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { TemplateVersionStatus } from '@prisma/client';
import { VersionComparison } from './VersionComparison';

interface ExportTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  type: string;
  currentVersion: string;
  versions: ExportTemplateVersion[];
}

interface ExportTemplateVersion {
  id: string;
  version: string;
  changeNotes: string;
  tags: string[];
  status: TemplateVersionStatus;
  createdAt: string;
  createdByEmail: string;
}

export const ExportTemplateManager: React.FC = () => {
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [isVersionModalOpen, setIsVersionModalOpen] = useState(false);
  const [isCompareModalOpen, setIsCompareModalOpen] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [newVersion, setNewVersion] = useState({
    version: '',
    changeNotes: '',
    tags: [] as string[],
    status: TemplateVersionStatus.DRAFT,
  });
  const [currentTag, setCurrentTag] = useState('');
  const [comparisonResults, setComparisonResults] = useState<any>(null);
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await fetch('/api/exportTemplates');
      if (!response.ok) throw new Error('Failed to fetch templates');
      const data = await response.json();
      setTemplates(data);
    } catch (error) {
      enqueueSnackbar('Error loading templates', { variant: 'error' });
    }
  };

  const handleCreateVersion = async () => {
    if (!selectedTemplate) return;

    try {
      const response = await fetch(`/api/exportTemplates/${selectedTemplate}/versions`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newVersion),
      });

      if (!response.ok) throw new Error('Failed to create version');
      
      await fetchTemplates();
      setIsVersionModalOpen(false);
      setNewVersion({
        version: '',
        changeNotes: '',
        tags: [],
        status: TemplateVersionStatus.DRAFT,
      });
      enqueueSnackbar('Version created successfully', { variant: 'success' });
    } catch (error) {
      enqueueSnackbar('Error creating version', { variant: 'error' });
    }
  };

  const handleCompareVersions = async () => {
    if (selectedVersions.length !== 2) return;

    try {
      const response = await fetch(
        `/api/exportTemplates/versions/${selectedVersions[0]}/compare/${selectedVersions[1]}`
      );
      if (!response.ok) throw new Error('Failed to compare versions');
      const diff = await response.json();
      setComparisonResults(diff);
    } catch (error) {
      enqueueSnackbar('Error comparing versions', { variant: 'error' });
    }
  };

  const handleTagAdd = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && currentTag) {
      setNewVersion(prev => ({
        ...prev,
        tags: [...prev.tags, currentTag],
      }));
      setCurrentTag('');
    }
  };

  const handleTagDelete = (tagToDelete: string) => {
    setNewVersion(prev => ({
      ...prev,
      tags: prev.tags.filter(tag => tag !== tagToDelete),
    }));
  };

  const handleStatusChange = (event: SelectChangeEvent) => {
    setNewVersion(prev => ({
      ...prev,
      status: event.target.value as TemplateVersionStatus,
    }));
  };

  return (
    <Box sx={{ p: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center" mb={3}>
        <FormControl sx={{ minWidth: 200 }}>
          <InputLabel>Select Template</InputLabel>
          <Select
            value={selectedTemplate}
            label="Select Template"
            onChange={(e) => setSelectedTemplate(e.target.value)}
          >
            {templates.map((template) => (
              <MenuItem key={template.id} value={template.id}>
                {template.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => setIsVersionModalOpen(true)}
          disabled={!selectedTemplate}
        >
          New Version
        </Button>
        <Button
          variant="outlined"
          startIcon={<CompareIcon />}
          onClick={() => setIsCompareModalOpen(true)}
          disabled={!selectedTemplate}
        >
          Compare Versions
        </Button>
      </Stack>

      {/* Version Creation Modal */}
      <Dialog open={isVersionModalOpen} onClose={() => setIsVersionModalOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Create New Version</DialogTitle>
        <DialogContent>
          <Stack spacing={3} sx={{ mt: 2 }}>
            <TextField
              label="Version"
              value={newVersion.version}
              onChange={(e) => setNewVersion(prev => ({ ...prev, version: e.target.value }))}
              placeholder="e.g., 1.0.0"
              fullWidth
            />
            <TextField
              label="Change Notes"
              value={newVersion.changeNotes}
              onChange={(e) => setNewVersion(prev => ({ ...prev, changeNotes: e.target.value }))}
              multiline
              rows={4}
              fullWidth
            />
            <TextField
              label="Add Tags"
              value={currentTag}
              onChange={(e) => setCurrentTag(e.target.value)}
              onKeyPress={handleTagAdd}
              fullWidth
            />
            <Box>
              {newVersion.tags.map((tag) => (
                <Chip
                  key={tag}
                  label={tag}
                  onDelete={() => handleTagDelete(tag)}
                  sx={{ m: 0.5 }}
                />
              ))}
            </Box>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={newVersion.status}
                label="Status"
                onChange={handleStatusChange}
              >
                {Object.values(TemplateVersionStatus).map((status) => (
                  <MenuItem key={status} value={status}>
                    {status}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setIsVersionModalOpen(false)}>Cancel</Button>
          <Button onClick={handleCreateVersion} variant="contained">
            Create Version
          </Button>
        </DialogActions>
      </Dialog>

      {/* Version Comparison Modal */}
      <Dialog open={isCompareModalOpen} onClose={() => setIsCompareModalOpen(false)} maxWidth="md" fullWidth>
        <DialogTitle>Compare Versions</DialogTitle>
        <DialogContent>
          {comparisonResults ? (
            <VersionComparison diff={comparisonResults} />
          ) : (
            <Stack spacing={2} sx={{ mt: 2 }}>
              {templates
                .find(t => t.id === selectedTemplate)
                ?.versions.map((version) => (
                  <Card key={version.id}>
                    <CardContent>
                      <Stack direction="row" spacing={2} alignItems="center">
                        <Typography variant="subtitle1">
                          Version {version.version}
                        </Typography>
                        <Chip
                          label={version.status}
                          color={version.status === TemplateVersionStatus.RELEASED ? 'success' : 'default'}
                          size="small"
                        />
                        <Typography variant="body2" color="text.secondary">
                          {new Date(version.createdAt).toLocaleDateString()}
                        </Typography>
                        <Button
                          size="small"
                          onClick={() => {
                            setSelectedVersions(prev =>
                              prev.includes(version.id)
                                ? prev.filter(id => id !== version.id)
                                : [...prev, version.id].slice(-2)
                            );
                          }}
                          variant={selectedVersions.includes(version.id) ? 'contained' : 'outlined'}
                        >
                          Select
                        </Button>
                      </Stack>
                    </CardContent>
                  </Card>
                ))}
            </Stack>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => {
            setIsCompareModalOpen(false);
            setComparisonResults(null);
            setSelectedVersions([]);
          }}>
            Close
          </Button>
          {!comparisonResults && (
            <Button
              onClick={handleCompareVersions}
              variant="contained"
              disabled={selectedVersions.length !== 2}
            >
              Compare Selected Versions
            </Button>
          )}
        </DialogActions>
      </Dialog>
    </Box>
  );
}; 