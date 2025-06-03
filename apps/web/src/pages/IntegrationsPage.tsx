import React from 'react';
import { Container, Paper, Typography } from '@mui/material';
import { IntegrationManager } from '../components/IntegrationManager';

export const IntegrationsPage: React.FC = () => {
  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Paper sx={{ p: 3 }}>
        <Typography variant="h3" gutterBottom>
          Integrations
        </Typography>
        <Typography color="textSecondary" paragraph>
          Connect your PumpFlix account with other services to enhance your workflow automation.
          Manage your integration credentials securely below.
        </Typography>
        <IntegrationManager />
      </Paper>
    </Container>
  );
}; 