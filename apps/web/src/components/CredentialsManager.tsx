import React, { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  List,
  ListItem,
  ListItemSecondaryAction,
  ListItemText,
  MenuItem,
  Select,
  TextField,
  Typography
} from '@mui/material';
import { useSnackbar } from 'notistack';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import axios from 'axios';

interface Credential {
  id: string;
  provider: string;
  label: string;
  isActive: boolean;
  lastUsedAt: string | null;
  expiresAt: string | null;
  createdAt: string;
}

interface CredentialFormData {
  provider: string;
  label: string;
  credentials: Record<string, any>;
  metadata?: Record<string, any>;
  expiresAt?: string;
}

const providers = [
  { value: 'GOOGLE_SHEETS', label: 'Google Sheets' },
  { value: 'SLACK', label: 'Slack' },
  { value: 'AIRTABLE', label: 'Airtable' },
  { value: 'ZAPIER', label: 'Zapier' },
  { value: 'MAKERSUITE', label: 'MakerSuite' },
  { value: 'CUSTOM', label: 'Custom Integration' }
];

export const CredentialsManager: React.FC = () => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [open, setOpen] = useState(false);
  const [editingCredential, setEditingCredential] = useState<Credential | null>(null);
  const [formData, setFormData] = useState<CredentialFormData>({
    provider: '',
    label: '',
    credentials: {}
  });
  const { enqueueSnackbar } = useSnackbar();

  useEffect(() => {
    fetchCredentials();
  }, []);

  const fetchCredentials = async () => {
    try {
      const response = await axios.get('/api/credentials');
      setCredentials(response.data);
    } catch (error) {
      enqueueSnackbar('Failed to fetch credentials', { variant: 'error' });
    }
  };

  const handleOpen = (credential?: Credential) => {
    if (credential) {
      setEditingCredential(credential);
      setFormData({
        provider: credential.provider,
        label: credential.label,
        credentials: {}
      });
    } else {
      setEditingCredential(null);
      setFormData({
        provider: '',
        label: '',
        credentials: {}
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingCredential(null);
    setFormData({
      provider: '',
      label: '',
      credentials: {}
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (editingCredential) {
        await axios.patch(`/api/credentials/${editingCredential.id}`, formData);
        enqueueSnackbar('Credential updated successfully', { variant: 'success' });
      } else {
        await axios.post('/api/credentials', formData);
        enqueueSnackbar('Credential created successfully', { variant: 'success' });
      }
      handleClose();
      fetchCredentials();
    } catch (error) {
      enqueueSnackbar('Failed to save credential', { variant: 'error' });
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('Are you sure you want to delete this credential?')) {
      try {
        await axios.delete(`/api/credentials/${id}`);
        enqueueSnackbar('Credential deleted successfully', { variant: 'success' });
        fetchCredentials();
      } catch (error) {
        enqueueSnackbar('Failed to delete credential', { variant: 'error' });
      }
    }
  };

  const handleValidate = async (id: string) => {
    try {
      const response = await axios.post(`/api/credentials/${id}/validate`);
      if (response.data.valid) {
        enqueueSnackbar('Credential is valid', { variant: 'success' });
      } else {
        enqueueSnackbar('Credential is invalid', { variant: 'error' });
      }
    } catch (error) {
      enqueueSnackbar('Failed to validate credential', { variant: 'error' });
    }
  };

  return (
    <Box>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h5">Integration Credentials</Typography>
        <Button
          variant="contained"
          color="primary"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Credential
        </Button>
      </Box>

      <List>
        {credentials.map((credential) => (
          <Card key={credential.id} sx={{ mb: 2 }}>
            <CardContent>
              <Box display="flex" justifyContent="space-between" alignItems="center">
                <Box>
                  <Typography variant="h6">{credential.label}</Typography>
                  <Typography color="textSecondary">
                    Provider: {credential.provider}
                  </Typography>
                  <Typography color="textSecondary">
                    Status: {credential.isActive ? 'Active' : 'Inactive'}
                  </Typography>
                  {credential.lastUsedAt && (
                    <Typography color="textSecondary">
                      Last used: {new Date(credential.lastUsedAt).toLocaleString()}
                    </Typography>
                  )}
                  {credential.expiresAt && (
                    <Typography color="textSecondary">
                      Expires: {new Date(credential.expiresAt).toLocaleString()}
                    </Typography>
                  )}
                </Box>
                <Box>
                  <IconButton onClick={() => handleValidate(credential.id)}>
                    <RefreshIcon />
                  </IconButton>
                  <IconButton onClick={() => handleOpen(credential)}>
                    <EditIcon />
                  </IconButton>
                  <IconButton onClick={() => handleDelete(credential.id)}>
                    <DeleteIcon />
                  </IconButton>
                </Box>
              </Box>
            </CardContent>
          </Card>
        ))}
      </List>

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <form onSubmit={handleSubmit}>
          <DialogTitle>
            {editingCredential ? 'Edit Credential' : 'Add New Credential'}
          </DialogTitle>
          <DialogContent>
            <Box display="flex" flexDirection="column" gap={2} mt={1}>
              <Select
                value={formData.provider}
                onChange={(e) => setFormData({ ...formData, provider: e.target.value })}
                label="Provider"
                required
              >
                {providers.map((provider) => (
                  <MenuItem key={provider.value} value={provider.value}>
                    {provider.label}
                  </MenuItem>
                ))}
              </Select>

              <TextField
                label="Label"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
                required
                fullWidth
              />

              <TextField
                label="API Key"
                type="password"
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    credentials: { ...formData.credentials, apiKey: e.target.value }
                  })
                }
                required
                fullWidth
              />

              {formData.provider === 'GOOGLE_SHEETS' && (
                <TextField
                  label="Client ID"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, clientId: e.target.value }
                    })
                  }
                  fullWidth
                />
              )}

              {formData.provider === 'SLACK' && (
                <TextField
                  label="Bot Token"
                  type="password"
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      credentials: { ...formData.credentials, botToken: e.target.value }
                    })
                  }
                  fullWidth
                />
              )}

              <TextField
                label="Expiration Date"
                type="datetime-local"
                InputLabelProps={{ shrink: true }}
                onChange={(e) =>
                  setFormData({ ...formData, expiresAt: e.target.value })
                }
                fullWidth
              />
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained" color="primary">
              {editingCredential ? 'Update' : 'Create'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
}; 