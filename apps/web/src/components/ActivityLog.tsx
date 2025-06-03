import React, { useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  WorkOutline as WorkIcon,
  Edit as EditIcon,
  Delete as DeleteIcon,
  Archive as ArchiveIcon,
  Refresh as RefreshIcon
} from '@mui/icons-material';
import { useUserExperience } from '../contexts/UserExperienceContext';

const getActivityIcon = (actionType: string) => {
  switch (actionType) {
    case 'CREATE':
      return <WorkIcon />;
    case 'UPDATE':
      return <EditIcon />;
    case 'DELETE':
      return <DeleteIcon />;
    case 'ARCHIVE':
      return <ArchiveIcon />;
    default:
      return <WorkIcon />;
  }
};

const formatTimestamp = (timestamp: string) => {
  return new Date(timestamp).toLocaleString();
};

export function ActivityLog() {
  const {
    recentActivities,
    isLoading,
    error,
    fetchRecentActivities
  } = useUserExperience();

  useEffect(() => {
    fetchRecentActivities();
  }, [fetchRecentActivities]);

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

  return (
    <Card className="max-w-4xl mx-auto">
      <CardContent>
        <Box className="flex justify-between items-center mb-4">
          <Typography variant="h5">
            Recent Activity
          </Typography>
          <Tooltip title="Refresh">
            <IconButton onClick={() => fetchRecentActivities()}>
              <RefreshIcon />
            </IconButton>
          </Tooltip>
        </Box>

        <List>
          {recentActivities.map((activity, index) => (
            <React.Fragment key={activity.id}>
              <ListItem>
                <ListItemIcon>
                  {getActivityIcon(activity.actionType)}
                </ListItemIcon>
                <ListItemText
                  primary={activity.actionType}
                  secondary={
                    <Box>
                      <Typography variant="body2" color="textSecondary">
                        {formatTimestamp(activity.timestamp)}
                      </Typography>
                      <Typography variant="body2">
                        {JSON.stringify(activity.context)}
                      </Typography>
                    </Box>
                  }
                />
              </ListItem>
              {index < recentActivities.length - 1 && <Divider />}
            </React.Fragment>
          ))}
        </List>

        {recentActivities.length === 0 && (
          <Box className="text-center py-8">
            <Typography color="textSecondary">
              No recent activity
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
} 