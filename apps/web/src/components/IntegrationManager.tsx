import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Grid,
  TextField,
  Typography,
  IconButton,
  Tooltip,
  Chip,
  Alert,
  CircularProgress
} from '@mui/material';
import {
  Add as AddIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Info as InfoIcon
} from '@mui/icons-material';
import { useSnackbar } from 'notistack';
import { useIntegration } from '../contexts/IntegrationContext';
import { integrationProviders } from '../../api/config/integrations';
import { formatDistanceToNow } from 'date-fns';
import { z } from 'zod';

interface IntegrationManagerProps {
  open?: boolean;
  onClose?: () => void;
  initialProvider?: string;
}

interface Credential {
  id: string;
  provider: string;
  label: string;
  credentials: Record<string, string>;
  scopes?: string[];
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
}

export const IntegrationManager: React.FC<IntegrationManagerProps> = ({
  open = false,
  onClose,
  initialProvider
}) => {
  const [selectedProvider, setSelectedProvider] = useState<string | null>(initialProvider || null);
  const [formData, setFormData] = useState<Record<string, string>>({});
  const [editingCredential, setEditingCredential] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { enqueueSnackbar } = useSnackbar();
  const { credentials, loading, error, refreshCredentials, addCredential, updateCredential, deleteCredential } = useIntegration();

  useEffect(() => {
    if (initialProvider) {
      setSelectedProvider(initialProvider);
    }
  }, [initialProvider]);

  const handleProviderSelect = (providerId: string) => {
    setSelectedProvider(providerId);
    setFormData({});
    setEditingCredential(null);
  };

  const handleAddClick = () => {
    setSelectedProvider(null);
    setFormData({});
    setEditingCredential(null);
  };

  const handleEditClick = (credentialId: string) => {
    const credential = credentials.find((c: Credential) => c.id === credentialId);
    if (credential) {
      setSelectedProvider(credential.provider);
      setFormData(credential.credentials);
      setEditingCredential(credentialId);
    }
  };

  const handleDeleteClick = async (credentialId: string) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await deleteCredential(credentialId);
        enqueueSnackbar('Credential deleted successfully', { variant: 'success' });
      } catch (error) {
        enqueueSnackbar('Failed to delete credential', { variant: 'error' });
      }
    }
  };

  const handleSubmit = async () => {
    if (!selectedProvider) return;

    setIsSubmitting(true);
    try {
      const provider = integrationProviders[selectedProvider];
      const validatedData = provider.credentialSchema.parse(formData);

      if (editingCredential) {
        await updateCredential(editingCredential, validatedData);
        enqueueSnackbar('Credential updated successfully', { variant: 'success' });
      } else {
        await addCredential(selectedProvider, validatedData);
        enqueueSnackbar('Credential added successfully', { variant: 'success' });
      }

      setFormData({});
      setEditingCredential(null);
      if (onClose) onClose();
    } catch (error) {
      enqueueSnackbar(error instanceof Error ? error.message : 'Failed to save credential', { variant: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderProviderForm = () => {
    if (!selectedProvider) return null;

    const provider = integrationProviders[selectedProvider];
    const schema = provider.credentialSchema.shape;

    return (
      <Dialog open={true} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>
          {editingCredential ? 'Edit' : 'Add'} {provider.name} Credential
        </DialogTitle>
        <DialogContent>
          <Box sx={{ mt: 2 }}>
            {Object.entries(schema).map(([key, field]) => (
              <TextField
                key={key}
                fullWidth
                label={key}
                type={key.toLowerCase().includes('secret') || key.toLowerCase().includes('key') ? 'password' : 'text'}
                value={formData[key] || ''}
                onChange={(e) => setFormData({ ...formData, [key]: e.target.value })}
                margin="normal"
                required
                helperText={(field as z.ZodTypeAny).description}
              />
            ))}
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            disabled={isSubmitting}
            startIcon={isSubmitting ? <CircularProgress size={20} /> : null}
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>
    );
  };

  const renderCredentialList = () => {
    if (loading) {
      return (
        <Box display="flex" justifyContent="center" p={3}>
          <CircularProgress />
        </Box>
      );
    }

    if (error) {
      return (
        <Alert severity="error" sx={{ m: 2 }}>
          {error}
        </Alert>
      );
    }

    const groupedCredentials = credentials.reduce((acc: Record<string, Credential[]>, credential: Credential) => {
      if (!acc[credential.provider]) {
        acc[credential.provider] = [];
      }
      acc[credential.provider].push(credential);
      return acc;
    }, {});

    return (
      <Grid container spacing={2} sx={{ p: 2 }}>
        {Object.entries(groupedCredentials).map(([providerId, providerCredentials]) => {
          const provider = integrationProviders[providerId];
          return (
            <Grid item xs={12} key={providerId}>
              <Card>
                <Box p={2}>
                  <Box display="flex" alignItems="center" mb={2}>
                    <img
                      src={`/icons/${providerId}.svg`}
                      alt={provider.name}
                      style={{ width: 32, height: 32, marginRight: 8 }}
                    />
                    <Typography variant="h6">{provider.name}</Typography>
                    <Button
                      startIcon={<AddIcon />}
                      onClick={() => handleProviderSelect(providerId)}
                      sx={{ ml: 'auto' }}
                    >
                      Add Credential
                    </Button>
                  </Box>
                  {providerCredentials.map((credential) => (
                    <Box
                      key={credential.id}
                      display="flex"
                      alignItems="center"
                      p={1}
                      sx={{
                        border: '1px solid',
                        borderColor: 'divider',
                        borderRadius: 1,
                        mb: 1
                      }}
                    >
                      <Box flex={1}>
                        <Typography variant="subtitle1">{credential.label}</Typography>
                        <Box display="flex" alignItems="center" mt={0.5}>
                          <Tooltip title={`Created ${formatDistanceToNow(new Date(credential.createdAt))} ago`}>
                            <Typography variant="caption" color="textSecondary">
                              Added {formatDistanceToNow(new Date(credential.createdAt))} ago
                            </Typography>
                          </Tooltip>
                          {credential.scopes && (
                            <Box ml={2}>
                              {credential.scopes.map((scope) => (
                                <Chip
                                  key={scope}
                                  label={scope}
                                  size="small"
                                  sx={{ mr: 0.5 }}
                                />
                              ))}
                            </Box>
                          )}
                        </Box>
                      </Box>
                      <Box>
                        <Tooltip title="Edit">
                          <IconButton onClick={() => handleEditClick(credential.id)}>
                            <EditIcon />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton onClick={() => handleDeleteClick(credential.id)}>
                            <DeleteIcon />
                          </IconButton>
                        </Tooltip>
                      </Box>
                    </Box>
                  ))}
                </Box>
              </Card>
            </Grid>
          );
        })}
      </Grid>
    );
  };

  if (open) {
    return renderProviderForm();
  }

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
        <Typography variant="h5">Integration Credentials</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAddClick}
        >
          Add New Credential
        </Button>
      </Box>
      {renderCredentialList()}
    </Box>
  );
}; 