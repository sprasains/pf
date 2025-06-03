import React, { useState } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Typography,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Alert,
  CircularProgress
} from '@mui/material';
import { useExecution } from '../contexts/ExecutionContext';
import { useWorkflow } from '../contexts/WorkflowContext';

export function ExecutionControlPanel() {
  const { currentExecution, isLoading, error, startExecution, completeExecution, recordTransition } = useExecution();
  const { currentWorkflow } = useWorkflow();
  const [isTransitionDialogOpen, setIsTransitionDialogOpen] = useState(false);
  const [selectedStateId, setSelectedStateId] = useState('');
  const [metadata, setMetadata] = useState('');

  const handleStartExecution = async () => {
    if (!currentWorkflow) return;
    try {
      await startExecution(currentWorkflow.id);
    } catch (err) {
      console.error('Failed to start execution:', err);
    }
  };

  const handleCompleteExecution = async (status: 'SUCCESS' | 'ERROR') => {
    if (!currentExecution) return;
    try {
      await completeExecution(status);
    } catch (err) {
      console.error('Failed to complete execution:', err);
    }
  };

  const handleTransition = async () => {
    if (!currentExecution) return;
    try {
      const metadataObj = metadata ? JSON.parse(metadata) : undefined;
      await recordTransition(selectedStateId, metadataObj);
      setIsTransitionDialogOpen(false);
      setSelectedStateId('');
      setMetadata('');
    } catch (err) {
      console.error('Failed to record transition:', err);
    }
  };

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="h6" gutterBottom>
          Execution Control Panel
        </Typography>

        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        {!currentExecution ? (
          <Box>
            <Button
              variant="contained"
              color="primary"
              onClick={handleStartExecution}
              disabled={!currentWorkflow}
            >
              Start Execution
            </Button>
          </Box>
        ) : (
          <Box>
            <Typography variant="body1" gutterBottom>
              Current Status: {currentExecution.status}
            </Typography>
            <Box display="flex" gap={2} mt={2}>
              <Button
                variant="contained"
                color="success"
                onClick={() => handleCompleteExecution('SUCCESS')}
                disabled={currentExecution.status !== 'RUNNING'}
              >
                Complete Successfully
              </Button>
              <Button
                variant="contained"
                color="error"
                onClick={() => handleCompleteExecution('ERROR')}
                disabled={currentExecution.status !== 'RUNNING'}
              >
                Complete with Error
              </Button>
              <Button
                variant="contained"
                color="primary"
                onClick={() => setIsTransitionDialogOpen(true)}
                disabled={currentExecution.status !== 'RUNNING'}
              >
                Record Transition
              </Button>
            </Box>
          </Box>
        )}

        <Dialog open={isTransitionDialogOpen} onClose={() => setIsTransitionDialogOpen(false)}>
          <DialogTitle>Record State Transition</DialogTitle>
          <DialogContent>
            <TextField
              fullWidth
              label="Target State ID"
              value={selectedStateId}
              onChange={(e) => setSelectedStateId(e.target.value)}
              margin="normal"
            />
            <TextField
              fullWidth
              label="Metadata (JSON)"
              value={metadata}
              onChange={(e) => setMetadata(e.target.value)}
              margin="normal"
              multiline
              rows={4}
              helperText="Optional JSON metadata for the transition"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setIsTransitionDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleTransition} color="primary">
              Record Transition
            </Button>
          </DialogActions>
        </Dialog>
      </CardContent>
    </Card>
  );
} 