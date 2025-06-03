import React from 'react';
import { Container, Paper, Typography } from '@mui/material';
import { CredentialsManager } from '../components/CredentialsManager';
import { Layout } from '../components/Layout';

export const CredentialsPage: React.FC = () => {
  return (
    <Layout>
      <Container maxWidth="lg" sx={{ mt: 4, mb: 4 }}>
        <Paper sx={{ p: 3 }}>
          <Typography variant="h4" gutterBottom>
            Integration Credentials
          </Typography>
          <Typography variant="body1" color="textSecondary" paragraph>
            Manage your integration credentials for various services. Add, edit, or remove credentials
            as needed. All credentials are encrypted and securely stored.
          </Typography>
          <CredentialsManager />
        </Paper>
      </Container>
    </Layout>
  );
};

export default CredentialsPage; 