import React, { useState } from 'react';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Tooltip,
  Badge,
  Typography
} from '@mui/material';
import { Add as AddIcon } from '@mui/icons-material';
import { useIntegration } from '../contexts/IntegrationContext';
import { integrationProviders } from '@pumpflix/api/config/integrations';
import { IntegrationManager } from './IntegrationManager';

interface CredentialSelectorProps {
  providerId: string;
  value?: string;
  onChange: (credentialId: string) => void;
  label?: string;
  required?: boolean;
  disabled?: boolean;
}

export const CredentialSelector: React.FC<CredentialSelectorProps> = ({
  providerId,
  value,
  onChange,
  label = 'Credential',
  required = false,
  disabled = false
}) => {
  const [openManager, setOpenManager] = useState(false);
  const { credentials, loading, isCredentialExpired } = useIntegration(providerId);
  const provider = integrationProviders[providerId];

  if (!provider) {
    return (
      <Typography color="error">
        Invalid provider: {providerId}
      </Typography>
    );
  }

  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value);
  };

  const handleAddClick = () => {
    setOpenManager(true);
  };

  if (loading) {
    return <Typography>Loading credentials...</Typography>;
  }

  return (
    <Box>
      <FormControl fullWidth required={required} disabled={disabled}>
        <InputLabel>{label}</InputLabel>
        <Select
          value={value || ''}
          onChange={handleChange}
          label={label}
          endAdornment={
            <Button
              size="small"
              startIcon={<AddIcon />}
              onClick={handleAddClick}
              sx={{ mr: 1 }}
            >
              Add
            </Button>
          }
        >
          {credentials.map((credential) => (
            <MenuItem
              key={credential.id}
              value={credential.id}
              disabled={isCredentialExpired(credential)}
            >
              <Box display="flex" alignItems="center" width="100%">
                <Badge
                  color="error"
                  variant="dot"
                  invisible={!isCredentialExpired(credential)}
                  sx={{ mr: 1 }}
                >
                  <Typography>{credential.label}</Typography>
                </Badge>
                {credential.scopes && (
                  <Tooltip title={`Scopes: ${credential.scopes.join(', ')}`}>
                    <Typography
                      variant="caption"
                      color="textSecondary"
                      sx={{ ml: 'auto' }}
                    >
                      {credential.scopes.length} scopes
                    </Typography>
                  </Tooltip>
                )}
              </Box>
            </MenuItem>
          ))}
          {credentials.length === 0 && (
            <MenuItem disabled>
              No credentials available
            </MenuItem>
          )}
        </Select>
      </FormControl>

      {openManager && (
        <IntegrationManager
          open={openManager}
          onClose={() => setOpenManager(false)}
          initialProvider={providerId}
        />
      )}
    </Box>
  );
}; 