import React from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider
} from '@mui/material';
import {
  WorkOutline as WorkflowIcon,
  CheckCircle as SuccessIcon,
  Error as ErrorIcon,
  Schedule as PendingIcon
} from '@mui/icons-material';
import { Layout } from '../components/Layout';

interface StatCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  color: string;
}

function StatCard({ title, value, icon, color }: StatCardProps) {
  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box
            sx={{
              backgroundColor: `${color}15`,
              borderRadius: '50%',
              p: 1,
              mr: 2
            }}
          >
            {icon}
          </Box>
          <Typography variant="h6" component="div">
            {title}
          </Typography>
        </Box>
        <Typography variant="h4" component="div">
          {value}
        </Typography>
      </CardContent>
    </Card>
  );
}

interface ActivityItem {
  id: string;
  type: 'workflow' | 'success' | 'error' | 'pending';
  message: string;
  timestamp: string;
}

const recentActivity: ActivityItem[] = [
  {
    id: '1',
    type: 'workflow',
    message: 'New workflow "Content Processing" created',
    timestamp: '2 minutes ago'
  },
  {
    id: '2',
    type: 'success',
    message: 'Workflow "Video Encoding" completed successfully',
    timestamp: '5 minutes ago'
  },
  {
    id: '3',
    type: 'error',
    message: 'Workflow "Asset Distribution" failed',
    timestamp: '10 minutes ago'
  },
  {
    id: '4',
    type: 'pending',
    message: 'Workflow "Content Review" is waiting for approval',
    timestamp: '15 minutes ago'
  }
];

const getActivityIcon = (type: ActivityItem['type']) => {
  switch (type) {
    case 'workflow':
      return <WorkflowIcon color="primary" />;
    case 'success':
      return <SuccessIcon color="success" />;
    case 'error':
      return <ErrorIcon color="error" />;
    case 'pending':
      return <PendingIcon color="warning" />;
  }
};

export const Dashboard: React.FC = () => {
  return (
    <Layout>
      <Box sx={{ flexGrow: 1 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard
        </Typography>

        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Total Workflows"
              value={24}
              icon={<WorkflowIcon sx={{ color: 'primary.main' }} />}
              color="#1976d2"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Successful"
              value={18}
              icon={<SuccessIcon sx={{ color: 'success.main' }} />}
              color="#2e7d32"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Failed"
              value={3}
              icon={<ErrorIcon sx={{ color: 'error.main' }} />}
              color="#d32f2f"
            />
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <StatCard
              title="Pending"
              value={3}
              icon={<PendingIcon sx={{ color: 'warning.main' }} />}
              color="#ed6c02"
            />
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Recent Activity
              </Typography>
              <List>
                {recentActivity.map((activity, index) => (
                  <React.Fragment key={activity.id}>
                    <ListItem>
                      <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                      <ListItemText
                        primary={activity.message}
                        secondary={activity.timestamp}
                      />
                    </ListItem>
                    {index < recentActivity.length - 1 && <Divider />}
                  </React.Fragment>
                ))}
              </List>
            </Paper>
          </Grid>
          <Grid item xs={12} md={6}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              {/* Add quick action buttons here */}
            </Paper>
          </Grid>
        </Grid>
      </Box>
    </Layout>
  );
};

export default Dashboard; 