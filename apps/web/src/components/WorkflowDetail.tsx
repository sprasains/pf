import React, { useState } from 'react';
import { Button, Modal, TextField, Typography, Box } from '@mui/material';
import { useWorkflowExecution } from '../contexts/WorkflowExecutionContext';
import { api } from '../utils/api';

interface SaveTemplateModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: { name: string; description: string; thumbnail?: string }) => void;
}

const SaveTemplateModal: React.FC<SaveTemplateModalProps> = ({ open, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({ name, description, thumbnail: thumbnail || undefined });
    onClose();
  };

  return (
    <Modal open={open} onClose={onClose}>
      <Box sx={{
        position: 'absolute',
        top: '50%',
        left: '50%',
        transform: 'translate(-50%, -50%)',
        width: 400,
        bgcolor: 'background.paper',
        boxShadow: 24,
        p: 4,
        borderRadius: 1,
      }}>
        <Typography variant="h6" component="h2" gutterBottom>
          Save as Template
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField
            fullWidth
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            margin="normal"
          />
          <TextField
            fullWidth
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
            multiline
            rows={3}
            margin="normal"
          />
          <TextField
            fullWidth
            label="Thumbnail URL (optional)"
            value={thumbnail}
            onChange={(e) => setThumbnail(e.target.value)}
            margin="normal"
          />
          <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
            <Button onClick={onClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              Save Template
            </Button>
          </Box>
        </form>
      </Box>
    </Modal>
  );
};

export const WorkflowDetail: React.FC = () => {
  const { workflow, status, logs } = useWorkflowExecution();
  const [saveModalOpen, setSaveModalOpen] = useState(false);

  const handleSaveTemplate = async (data: { name: string; description: string; thumbnail?: string }) => {
    try {
      await api.post(`/api/workflow-templates/promote/${workflow.id}`, data);
      // Show success message or redirect
    } catch (error) {
      console.error('Error saving template:', error);
      // Show error message
    }
  };

  return (
    <div>
      {/* Existing workflow detail content */}
      
      <Button
        variant="contained"
        color="primary"
        onClick={() => setSaveModalOpen(true)}
        sx={{ mt: 2 }}
      >
        Save as Template
      </Button>

      <SaveTemplateModal
        open={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        onSave={handleSaveTemplate}
      />
    </div>
  );
}; 