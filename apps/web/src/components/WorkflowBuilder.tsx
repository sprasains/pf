import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  MenuItem,
  Select,
  TextField,
  Typography,
  Tooltip,
  Badge,
  Chip
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  PlayArrow as PlayIcon,
  Stop as StopIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useWorkflow } from '../contexts/WorkflowContext';
import { useWorkflowExecution } from '../contexts/WorkflowExecutionContext';
import { useIntegration } from '../contexts/IntegrationContext';
import { WorkflowTemplate, WorkflowInstance } from '@pumpflix/shared';
import { formatDistanceToNow } from 'date-fns';

interface WorkflowBuilderProps {
  onSave?: (instance: WorkflowInstance) => void;
}

export function WorkflowBuilder({ onSave }: WorkflowBuilderProps) {
  const {
    templates,
    instances,
    loading,
    error,
    createInstance,
    updateInstance,
    deleteInstance
  } = useWorkflow();

  const {
    status,
    logs,
    loading: executionLoading,
    startWorkflow,
    stopWorkflow,
    refreshStatus,
    refreshLogs
  } = useWorkflowExecution();

  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedInstance, setSelectedInstance] = useState<string>('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    config: {}
  });

  useEffect(() => {
    if (selectedInstance) {
      refreshStatus(selectedInstance);
      refreshLogs(selectedInstance);
    }
  }, [selectedInstance]);

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      setSelectedTemplate(templateId);
      setFormData({
        name: template.name,
        description: template.description,
        config: template.config
      });
    }
  };

  const handleInstanceSelect = (instanceId: string) => {
    setSelectedInstance(instanceId);
    const instance = instances.find(i => i.id === instanceId);
    if (instance) {
      setFormData({
        name: instance.name,
        description: instance.description,
        config: instance.config
      });
    }
  };

  const handleSubmit = async () => {
    try {
      if (selectedInstance) {
        await updateInstance(selectedInstance, formData);
      } else {
        const instance = await createInstance({
          ...formData,
          templateId: selectedTemplate
        });
        if (onSave) {
          onSave(instance);
        }
      }
      setDialogOpen(false);
    } catch (error) {
      console.error('Failed to save workflow:', error);
    }
  };

  const handleDelete = async (instanceId: string) => {
    if (window.confirm('Are you sure you want to delete this workflow?')) {
      try {
        await deleteInstance(instanceId);
        if (selectedInstance === instanceId) {
          setSelectedInstance('');
        }
      } catch (error) {
        console.error('Failed to delete workflow:', error);
      }
    }
  };

  const handleStart = async (instanceId: string) => {
    try {
      await startWorkflow(instanceId);
    } catch (error) {
      console.error('Failed to start workflow:', error);
    }
  };

  const handleStop = async (instanceId: string) => {
    try {
      await stopWorkflow(instanceId);
    } catch (error) {
      console.error('Failed to stop workflow:', error);
    }
  };

  if (loading || executionLoading) {
    return <Typography>Loading...</Typography>;
  }

  if (error) {
    return <Typography color="error">{error}</Typography>;
  }

  return (
    <Box>
      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Templates
            </Typography>
            <Select
              fullWidth
              value={selectedTemplate}
              onChange={(e) => handleTemplateSelect(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select a template</em>
              </MenuItem>
              {templates.map((template) => (
                <MenuItem key={template.id} value={template.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {template.name}
                    <Chip
                      size="small"
                      label={template.sourceType}
                      color={template.sourceType === 'ai' ? 'primary' : 'default'}
                    />
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {selectedTemplate && (
              <Button
                startIcon={<AddIcon />}
                onClick={() => setDialogOpen(true)}
                sx={{ mt: 2 }}
              >
                Create Instance
              </Button>
            )}
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Instances
            </Typography>
            <Select
              fullWidth
              value={selectedInstance}
              onChange={(e) => handleInstanceSelect(e.target.value)}
              displayEmpty
            >
              <MenuItem value="">
                <em>Select an instance</em>
              </MenuItem>
              {instances.map((instance) => (
                <MenuItem key={instance.id} value={instance.id}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {instance.name}
                    {status[instance.id]?.isActive && (
                      <Chip size="small" label="Running" color="success" />
                    )}
                    {instance.promptText && (
                      <Chip size="small" label="AI Generated" color="primary" />
                    )}
                  </Box>
                </MenuItem>
              ))}
            </Select>
            {selectedInstance && (
              <Box sx={{ mt: 2 }}>
                <Tooltip title="Edit">
                  <IconButton onClick={() => setDialogOpen(true)}>
                    <EditIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title="Delete">
                  <IconButton onClick={() => handleDelete(selectedInstance)}>
                    <DeleteIcon />
                  </IconButton>
                </Tooltip>
                <Tooltip title={status[selectedInstance]?.isActive ? 'Stop' : 'Start'}>
                  <IconButton
                    onClick={() =>
                      status[selectedInstance]?.isActive
                        ? handleStop(selectedInstance)
                        : handleStart(selectedInstance)
                    }
                  >
                    {status[selectedInstance]?.isActive ? <StopIcon /> : <PlayIcon />}
                  </IconButton>
                </Tooltip>
                <Tooltip title="Refresh">
                  <IconButton onClick={() => refreshStatus(selectedInstance)}>
                    <RefreshIcon />
                  </IconButton>
                </Tooltip>
                {status[selectedInstance]?.lastRun && (
                  <Typography variant="caption" sx={{ ml: 2 }}>
                    Last run: {formatDistanceToNow(new Date(status[selectedInstance].lastRun!))} ago
                  </Typography>
                )}
              </Box>
            )}
          </Card>

          {selectedInstance && logs[selectedInstance] && (
            <Card sx={{ p: 2, mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Logs
              </Typography>
              <Box sx={{ maxHeight: 300, overflow: 'auto' }}>
                {logs[selectedInstance].map((log, index) => (
                  <Typography
                    key={index}
                    variant="body2"
                    color={log.level === 'error' ? 'error' : 'textSecondary'}
                  >
                    {new Date(log.timestamp).toLocaleString()} [{log.level}] {log.message}
                  </Typography>
                ))}
              </Box>
            </Card>
          )}
        </Grid>
      </Grid>

      <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
        <DialogTitle>
          {selectedInstance ? 'Edit Workflow' : 'Create Workflow'}
        </DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Name"
            value={formData.name}
            onChange={(e) =>
              setFormData({ ...formData, name: e.target.value })
            }
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={formData.description}
            onChange={(e) =>
              setFormData({ ...formData, description: e.target.value })
            }
            margin="normal"
            multiline
            rows={4}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDialogOpen(false)}>Cancel</Button>
          <Button onClick={handleSubmit} variant="contained">
            {selectedInstance ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
} 