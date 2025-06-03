import React from 'react';
import { Box, Container, Tab, Tabs, Typography } from '@mui/material';
import { UserPreferences } from '../components/UserPreferences';
import { ActivityLog } from '../components/ActivityLog';

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
      id={`user-experience-tabpanel-${index}`}
      aria-labelledby={`user-experience-tab-${index}`}
      {...other}
    >
      {value === index && (
        <Box className="py-4">
          {children}
        </Box>
      )}
    </div>
  );
}

export function UserExperiencePage() {
  const [value, setValue] = React.useState(0);

  const handleChange = (event: React.SyntheticEvent, newValue: number) => {
    setValue(newValue);
  };

  return (
    <Container maxWidth="lg" className="py-8">
      <Typography variant="h4" className="mb-6">
        User Experience
      </Typography>

      <Box className="mb-4">
        <Tabs
          value={value}
          onChange={handleChange}
          aria-label="user experience tabs"
        >
          <Tab label="Preferences" />
          <Tab label="Activity Log" />
        </Tabs>
      </Box>

      <TabPanel value={value} index={0}>
        <UserPreferences />
      </TabPanel>
      <TabPanel value={value} index={1}>
        <ActivityLog />
      </TabPanel>
    </Container>
  );
} 