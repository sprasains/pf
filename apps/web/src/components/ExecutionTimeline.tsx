import React from 'react';
import {
  Timeline,
  TimelineItem,
  TimelineSeparator,
  TimelineConnector,
  TimelineContent,
  TimelineDot,
  TimelineOppositeContent
} from '@mui/lab';
import { Typography, Paper, Box } from '@mui/material';
import { useExecution } from '../contexts/ExecutionContext';
import { formatDistanceToNow } from 'date-fns';

const getStatusColor = (status: string) => {
  switch (status) {
    case 'SUCCESS':
      return 'success';
    case 'ERROR':
      return 'error';
    case 'RUNNING':
      return 'primary';
    default:
      return 'grey';
  }
};

export function ExecutionTimeline() {
  const { currentExecution, isLoading } = useExecution();

  if (isLoading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>Loading execution timeline...</Typography>
      </Box>
    );
  }

  if (!currentExecution) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <Typography>No execution selected</Typography>
      </Box>
    );
  }

  return (
    <Timeline>
      {currentExecution.states.map((state, index) => (
        <TimelineItem key={state.id}>
          <TimelineOppositeContent>
            <Typography variant="body2" color="textSecondary">
              {formatDistanceToNow(new Date(state.timestamp), { addSuffix: true })}
            </Typography>
          </TimelineOppositeContent>
          <TimelineSeparator>
            <TimelineDot color={getStatusColor(currentExecution.status)} />
            {index < currentExecution.states.length - 1 && <TimelineConnector />}
          </TimelineSeparator>
          <TimelineContent>
            <Paper elevation={3} sx={{ p: 2 }}>
              <Typography variant="h6" component="h3">
                {state.state.name}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                State ID: {state.state.id}
              </Typography>
            </Paper>
          </TimelineContent>
        </TimelineItem>
      ))}
    </Timeline>
  );
} 