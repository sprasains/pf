import React from 'react';
import { Container, Paper, Typography } from '@mui/material';
import { WorkflowBuilder } from '../components/WorkflowBuilder';
import { WorkflowProvider } from '../contexts/WorkflowContext';
import { WorkflowExecutionProvider } from '../contexts/WorkflowExecutionContext';

export function WorkflowPage() {
  return (
    <WorkflowProvider>
      <WorkflowExecutionProvider>
        <Container maxWidth="lg" sx={{ py: 4 }}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
              Workflow Builder
            </Typography>
            <Typography color="textSecondary" paragraph>
              Create and manage your workflows using prebuilt templates or AI-generated workflows.
              Each workflow can be customized with your own configurations and credentials.
            </Typography>
            <WorkflowBuilder />
          </Paper>
        </Container>
      </WorkflowExecutionProvider>
    </WorkflowProvider>
  );
} 