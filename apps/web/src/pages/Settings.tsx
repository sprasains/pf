import React, { useState } from 'react';
import {
  Box,
  Paper,
  Typography,
  Tabs,
  Tab,
  TextField,
  Button,
  Switch,
  FormControlLabel,
  Divider,
  Alert
} from '@mui/material';
import { useAuth } from '../contexts/AuthContext';
import { Layout } from '../components/Layout';
import { useSnackbar } from 'notistack';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

function TabPanel(props: TabPanelProps) {
  const { children, value, index, ...other } = props;

  return (
    <div
      role="tabpanel"
      hidden={value !== index}
      id={`settings-tabpanel-${index}`}
      aria-labelledby={`settings-tab-${index}`}
      {...other}
    >
      {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
    </div>
  );
}

export const Settings: React.FC = () => {
  const { user, org } = useAuth();
  const { enqueueSnackbar } = useSnackbar();
  const [tabValue, setTabValue] = useState(0);
  const [notifications, setNotifications] = useState({
    email: true,
    push: false,
    workflowUpdates: true
  });
  const [theme, setTheme] = useState({
    darkMode: false,
    compactView: false
  });

  const handleTabChange = (_: React.SyntheticEvent, newValue: number) => {
    setTabValue(newValue);
  };

  const handleNotificationChange = (setting: keyof typeof notifications) => {
    setNotifications((prev) => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleThemeChange = (setting: keyof typeof theme) => {
    setTheme((prev) => ({
      ...prev,
      [setting]: !prev[setting]
    }));
  };

  const handleSavePreferences = () => {
    // TODO: Implement saving preferences
    enqueueSnackbar('Preferences saved successfully', { variant: 'success' });
  };

  return (
    <Layout>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>
          Settings
        </Typography>

        <Paper sx={{ width: '100%' }}>
          <Tabs
            value={tabValue}
            onChange={handleTabChange}
            aria-label="settings tabs"
          >
            <Tab label="Profile" />
            <Tab label="Preferences" />
            <Tab label="Organization" />
          </Tabs>

          <TabPanel value={tabValue} index={0}>
            <Box component="form" sx={{ maxWidth: 600 }}>
              <TextField
                fullWidth
                label="Email"
                value={user?.email || ''}
                disabled
                margin="normal"
              />
              <TextField
                fullWidth
                label="Name"
                defaultValue={user?.name || ''}
                margin="normal"
              />
              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 2 }}
                onClick={handleSavePreferences}
              >
                Save Changes
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={1}>
            <Box sx={{ maxWidth: 600 }}>
              <Typography variant="h6" gutterBottom>
                Notifications
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.email}
                    onChange={() => handleNotificationChange('email')}
                  />
                }
                label="Email Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.push}
                    onChange={() => handleNotificationChange('push')}
                  />
                }
                label="Push Notifications"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={notifications.workflowUpdates}
                    onChange={() => handleNotificationChange('workflowUpdates')}
                  />
                }
                label="Workflow Updates"
              />

              <Divider sx={{ my: 3 }} />

              <Typography variant="h6" gutterBottom>
                Theme
              </Typography>
              <FormControlLabel
                control={
                  <Switch
                    checked={theme.darkMode}
                    onChange={() => handleThemeChange('darkMode')}
                  />
                }
                label="Dark Mode"
              />
              <FormControlLabel
                control={
                  <Switch
                    checked={theme.compactView}
                    onChange={() => handleThemeChange('compactView')}
                  />
                }
                label="Compact View"
              />

              <Button
                variant="contained"
                color="primary"
                sx={{ mt: 3 }}
                onClick={handleSavePreferences}
              >
                Save Preferences
              </Button>
            </Box>
          </TabPanel>

          <TabPanel value={tabValue} index={2}>
            <Box sx={{ maxWidth: 600 }}>
              <Alert severity="info" sx={{ mb: 3 }}>
                Organization settings can only be modified by administrators.
              </Alert>
              <TextField
                fullWidth
                label="Organization Name"
                value={org?.name || ''}
                disabled
                margin="normal"
              />
              <TextField
                fullWidth
                label="Organization ID"
                value={org?.id || ''}
                disabled
                margin="normal"
              />
            </Box>
          </TabPanel>
        </Paper>
      </Box>
    </Layout>
  );
};

export default Settings; 