import React, { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  Typography,
  Grid,
  CircularProgress,
  Box
} from '@mui/material';
import axios from 'axios';

interface AIMetrics {
  totalPrompts: number;
  failedCalls: number;
  successRate: number;
  avgTokens: number;
}

export const AIMetrics: React.FC = () => {
  const [metrics, setMetrics] = useState<AIMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await axios.get<AIMetrics>('/api/metrics/ai');
        setMetrics(response.data);
      } catch (error) {
        setError('Failed to fetch metrics');
      } finally {
        setLoading(false);
      }
    };

    fetchMetrics();
    const interval = setInterval(fetchMetrics, 60000); // Refresh every minute

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" p={3}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Typography color="error" align="center">
        {error}
      </Typography>
    );
  }

  if (!metrics) return null;

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Total Prompts
            </Typography>
            <Typography variant="h4">{metrics.totalPrompts}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Failed Calls
            </Typography>
            <Typography variant="h4">{metrics.failedCalls}</Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Success Rate
            </Typography>
            <Typography variant="h4">
              {(metrics.successRate * 100).toFixed(1)}%
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      <Grid item xs={12} sm={6} md={3}>
        <Card>
          <CardContent>
            <Typography color="textSecondary" gutterBottom>
              Avg. Tokens
            </Typography>
            <Typography variant="h4">{metrics.avgTokens}</Typography>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}; 