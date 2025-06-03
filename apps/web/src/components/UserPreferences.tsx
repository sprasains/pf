import React from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Switch,
  FormControlLabel,
  RadioGroup,
  Radio,
  Button,
  Divider,
  CircularProgress
} from '@mui/material';
import { useUserExperience } from '../contexts/UserExperienceContext';

export function UserPreferences() {
  const {
    preferences,
    isLoading,
    error,
    setPreference,
    resetPreferences
  } = useUserExperience();

  if (isLoading) {
    return (
      <Box className="flex justify-center items-center h-64">
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box className="p-4">
        <Typography color="error">{error}</Typography>
      </Box>
    );
  }

  if (!preferences) {
    return null;
  }

  return (
    <Card className="max-w-2xl mx-auto">
      <CardContent>
        <Typography variant="h5" className="mb-4">
          User Preferences
        </Typography>

        <Box className="space-y-6">
          {/* Theme Preference */}
          <Box>
            <Typography variant="subtitle1" className="mb-2">
              Theme
            </Typography>
            <RadioGroup
              value={preferences.theme}
              onChange={(e) => setPreference({ theme: e.target.value as 'LIGHT' | 'DARK' })}
              row
            >
              <FormControlLabel
                value="LIGHT"
                control={<Radio />}
                label="Light"
              />
              <FormControlLabel
                value="DARK"
                control={<Radio />}
                label="Dark"
              />
            </RadioGroup>
          </Box>

          <Divider />

          {/* Layout Preference */}
          <Box>
            <Typography variant="subtitle1" className="mb-2">
              Layout
            </Typography>
            <RadioGroup
              value={preferences.layout}
              onChange={(e) => setPreference({ layout: e.target.value as 'GRID' | 'LIST' })}
              row
            >
              <FormControlLabel
                value="GRID"
                control={<Radio />}
                label="Grid"
              />
              <FormControlLabel
                value="LIST"
                control={<Radio />}
                label="List"
              />
            </RadioGroup>
          </Box>

          <Divider />

          {/* Default Workspace */}
          <Box>
            <Typography variant="subtitle1" className="mb-2">
              Default Workspace
            </Typography>
            <Typography variant="body2" color="textSecondary" className="mb-2">
              Select your preferred workspace to open by default
            </Typography>
            {/* Add workspace selector here */}
          </Box>

          <Divider />

          {/* Reset Button */}
          <Box className="flex justify-end">
            <Button
              variant="outlined"
              color="secondary"
              onClick={resetPreferences}
            >
              Reset to Default
            </Button>
          </Box>
        </Box>
      </CardContent>
    </Card>
  );
} 