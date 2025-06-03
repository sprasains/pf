import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  TextField,
  Typography,
} from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon } from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';

interface Tenant {
  id: string;
  name: string;
  slug: string;
  users: {
    id: string;
    email: string;
    name: string | null;
    role: string;
  }[];
}

export default function Tenants() {
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [open, setOpen] = useState(false);
  const [editingTenant, setEditingTenant] = useState<Tenant | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    slug: '',
  });
  const { user } = useAuthStore();

  useEffect(() => {
    fetchTenants();
  }, []);

  const fetchTenants = async () => {
    try {
      const response = await fetch('/api/tenants');
      if (!response.ok) throw new Error('Failed to fetch tenants');
      const data = await response.json();
      setTenants(data);
    } catch (error) {
      console.error('Error fetching tenants:', error);
    }
  };

  const handleOpen = (tenant?: Tenant) => {
    if (tenant) {
      setEditingTenant(tenant);
      setFormData({
        name: tenant.name,
        slug: tenant.slug,
      });
    } else {
      setEditingTenant(null);
      setFormData({
        name: '',
        slug: '',
      });
    }
    setOpen(true);
  };

  const handleClose = () => {
    setOpen(false);
    setEditingTenant(null);
    setFormData({
      name: '',
      slug: '',
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingTenant
        ? `/api/tenants/${editingTenant.id}`
        : '/api/tenants';
      const method = editingTenant ? 'PUT' : 'POST';

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (!response.ok) throw new Error('Failed to save tenant');
      await fetchTenants();
      handleClose();
    } catch (error) {
      console.error('Error saving tenant:', error);
    }
  };

  const handleDelete = async (tenantId: string) => {
    if (!window.confirm('Are you sure you want to delete this tenant?')) return;

    try {
      const response = await fetch(`/api/tenants/${tenantId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete tenant');
      await fetchTenants();
    } catch (error) {
      console.error('Error deleting tenant:', error);
    }
  };

  return (
    <Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Tenants</Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => handleOpen()}
        >
          Add Tenant
        </Button>
      </Box>

      <Grid container spacing={3}>
        {tenants.map((tenant) => (
          <Grid item xs={12} sm={6} md={4} key={tenant.id}>
            <Card>
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="h6">{tenant.name}</Typography>
                  <Box>
                    <IconButton
                      size="small"
                      onClick={() => handleOpen(tenant)}
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => handleDelete(tenant.id)}
                    >
                      <DeleteIcon />
                    </IconButton>
                  </Box>
                </Box>
                <Typography color="textSecondary" gutterBottom>
                  {tenant.slug}
                </Typography>
                <Typography variant="body2">
                  {tenant.users.length} users
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Dialog open={open} onClose={handleClose}>
        <DialogTitle>
          {editingTenant ? 'Edit Tenant' : 'Add Tenant'}
        </DialogTitle>
        <form onSubmit={handleSubmit}>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Name"
              fullWidth
              value={formData.name}
              onChange={(e) =>
                setFormData({ ...formData, name: e.target.value })
              }
            />
            <TextField
              margin="dense"
              label="Slug"
              fullWidth
              value={formData.slug}
              onChange={(e) =>
                setFormData({ ...formData, slug: e.target.value })
              }
              helperText="Lowercase letters, numbers, and hyphens only"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={handleClose}>Cancel</Button>
            <Button type="submit" variant="contained">
              {editingTenant ? 'Save' : 'Add'}
            </Button>
          </DialogActions>
        </form>
      </Dialog>
    </Box>
  );
} 