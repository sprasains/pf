import { useState, useEffect } from 'react';
import {
  Box,
  Button,
  Menu,
  MenuItem,
  Typography,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import { Business, SwapHoriz } from '@mui/icons-material';
import { useAuthStore } from '../stores/auth';

export default function TenantSwitcher() {
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [tenants, setTenants] = useState<any[]>([]);
  const { user, updateUser } = useAuthStore();

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

  const handleClick = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleTenantSwitch = async (tenantId: string) => {
    try {
      const response = await fetch('/api/tenants/switch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ tenantId }),
      });

      if (!response.ok) throw new Error('Failed to switch tenant');
      const data = await response.json();
      updateUser(data.user);
      handleClose();
    } catch (error) {
      console.error('Error switching tenant:', error);
    }
  };

  return (
    <Box>
      <Button
        onClick={handleClick}
        startIcon={<SwapHoriz />}
        endIcon={<Business />}
        color="inherit"
      >
        {user?.tenant?.name || 'Select Tenant'}
      </Button>
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleClose}
        PaperProps={{
          sx: { width: 320, maxHeight: 400 },
        }}
      >
        {tenants.map((tenant) => (
          <MenuItem
            key={tenant.id}
            onClick={() => handleTenantSwitch(tenant.id)}
            selected={tenant.id === user?.tenant?.id}
          >
            <ListItemIcon>
              <Business />
            </ListItemIcon>
            <ListItemText
              primary={tenant.name}
              secondary={`${tenant.users.length} users`}
            />
          </MenuItem>
        ))}
      </Menu>
    </Box>
  );
} 