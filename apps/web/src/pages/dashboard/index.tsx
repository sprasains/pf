import * as React from 'react';
import { styled } from '@mui/material/styles';
import {
  Container,
  Grid,
  Paper,
  Typography,
  Box,
  CircularProgress,
  Alert
} from '@mui/material';

// Date picker imports
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import type { DateRange } from '@mui/x-date-pickers-pro/models';
import dayjs, { type Dayjs } from 'dayjs';

// Recharts imports
import { 
  Tooltip, 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Legend
} from 'recharts';

import { useUsageMetrics } from '../../hooks/useUsageMetrics';
import { logger } from '../../utils/logger';

// Styled components following MUI latest patterns
const MetricCard = styled(Paper)(({ theme }) => ({
  backgroundColor: (theme.vars ?? theme).palette.background.paper,
  ...theme.typography.body2,
  padding: theme.spacing(3),
  textAlign: 'left',
  color: (theme.vars ?? theme).palette.text.secondary,
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  justifyContent: 'center',
  transition: theme.transitions.create(['box-shadow', 'transform'], {
    duration: theme.transitions.duration.short,
  }),
  '&:hover': {
    boxShadow: theme.shadows[4],
    transform: 'translateY(-2px)',
  },
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

const ChartContainer = styled(Paper)(({ theme }) => ({
  backgroundColor: (theme.vars ?? theme).palette.background.paper,
  padding: theme.spacing(3),
  height: 400,
  display: 'flex',
  flexDirection: 'column',
  ...theme.applyStyles('dark', {
    backgroundColor: '#1A2027',
  }),
}));

const HeaderBox = styled(Box)(({ theme }) => ({
  marginBottom: theme.spacing(4),
}));

const LoadingContainer = styled(Box)(({ theme }) => ({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: 400,
}));

const PlaceholderBox = styled(Box)(({ theme }) => ({
  height: '80%',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backgroundColor: (theme.vars ?? theme).palette.grey[50],
  borderRadius: theme.shape.borderRadius,
  border: `2px dashed ${(theme.vars ?? theme).palette.grey[300]}`,
  ...theme.applyStyles('dark', {
    backgroundColor: (theme.vars ?? theme).palette.grey[900],
    borderColor: (theme.vars ?? theme).palette.grey[700],
  }),
}));

// Color constants
const CHART_COLORS = {
  success: '#4caf50',
  failed: '#f44336',
  pending: '#ff9800',
  cancelled: '#9e9e9e'
} as const;

// Metric card props interface
interface MetricCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
}

const MetricCardContent: React.FC<MetricCardProps> = ({ title, value, subtitle }) => (
  <>
    <Typography variant="subtitle2" color="text.secondary" gutterBottom>
      {title}
    </Typography>
    <Typography variant="h4" component="div" sx={{ fontWeight: 'bold', color: 'text.primary' }}>
      {value}
    </Typography>
    {subtitle && (
      <Typography variant="caption" color="text.secondary">
        {subtitle}
      </Typography>
    )}
  </>
);

export default function Dashboard() {
  // Date range state with proper typing
  const [dateRange, setDateRange] = React.useState<DateRange<Dayjs>>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // Format dates for API
  const startDate = dateRange[0]?.toISOString() || '';
  const endDate = dateRange[1]?.toISOString() || '';

  const { metrics, loading, error } = useUsageMetrics(startDate, endDate);

  // Handle date range changes
  const handleDateRangeChange = (newDateRange: DateRange<Dayjs>) => {
    setDateRange(newDateRange);
  };

  // Prepare chart data with proper typing
  const workflowStatusData = React.useMemo(() => 
    metrics?.workflowStats?.map(stat => ({
      name: stat.status,
      value: stat._count,
      color: CHART_COLORS[stat.status as keyof typeof CHART_COLORS] || '#757575'
    })) || [], [metrics?.workflowStats]
  );

  // Calculate metrics safely
  const totalSuccessful = workflowStatusData.find(stat => stat.name === 'success')?.value || 0;
  const totalFailed = workflowStatusData.find(stat => stat.name === 'failed')?.value || 0;
  const totalExecutions = workflowStatusData.reduce((sum, stat) => sum + stat.value, 0);
  
  const avgExecutionTime = React.useMemo(() => 
    metrics?.avgExecutionTime !== undefined && metrics.avgExecutionTime !== null
      ? `${(metrics.avgExecutionTime / 1000).toFixed(2)}s`
      : 'N/A',
    [metrics?.avgExecutionTime]
  );

  const successRate = React.useMemo(() => 
    totalExecutions > 0 
      ? `${((totalSuccessful / totalExecutions) * 100).toFixed(1)}%` 
      : 'N/A',
    [totalSuccessful, totalExecutions]
  );

  // Error handling
  if (error) {
    logger.error('Dashboard error', error);
    return (
      <Container maxWidth="lg" sx={{ py: 4 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          Error loading dashboard data. Please try refreshing the page.
        </Alert>
      </Container>
    );
  }

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}>
      <Container maxWidth="lg" sx={{ py: 4 }}>
        {/* Header Section */}
        <HeaderBox>
          <Typography variant="h3" component="h1" gutterBottom sx={{ fontWeight: 'bold' }}>
            Dashboard
          </Typography>
          <Typography variant="subtitle1" color="text.secondary" sx={{ mb: 3 }}>
            Monitor your application metrics and performance
          </Typography>
          
          {/* Date Range Picker */}
          <Box sx={{ mb: 2 }}>
            <DateRangePicker
              localeText={{ start: 'Start Date', end: 'End Date' }}
              value={dateRange}
              onChange={handleDateRangeChange}
              sx={{ minWidth: 280 }}
            />
          </Box>
        </HeaderBox>

        {/* Loading State */}
        {loading ? (
          <LoadingContainer>
            <CircularProgress size={60} />
          </LoadingContainer>
        ) : (
          <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={3}>
              {/* Active Users Metrics */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Daily Active Users" 
                    value={metrics?.activeUsers?.daily || 0}
                  />
                </MetricCard>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Weekly Active Users" 
                    value={metrics?.activeUsers?.weekly || 0}
                  />
                </MetricCard>
              </Grid>
              
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Monthly Active Users" 
                    value={metrics?.activeUsers?.monthly || 0}
                  />
                </MetricCard>
              </Grid>

              {/* Execution Metrics */}
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Total Executions" 
                    value={totalExecutions}
                    subtitle={`${totalSuccessful} successful, ${totalFailed} failed`}
                  />
                </MetricCard>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Success Rate" 
                    value={successRate}
                  />
                </MetricCard>
              </Grid>

              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                <MetricCard elevation={2}>
                  <MetricCardContent 
                    title="Avg. Execution Time" 
                    value={avgExecutionTime}
                  />
                </MetricCard>
              </Grid>

              {/* Workflow Status Distribution Chart */}
              <Grid size={{ xs: 12, md: 6 }}>
                <ChartContainer elevation={2}>
                  <Typography variant="h6" gutterBottom>
                    Workflow Status Distribution
                  </Typography>
                  {workflowStatusData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="90%">
                      <PieChart>
                        <Pie
                          data={workflowStatusData}
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          dataKey="value"
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        >
                          {workflowStatusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => [value, 'Count']} />
                        <Legend />
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <Box sx={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      height: '80%' 
                    }}>
                      <Typography variant="body2" color="text.secondary">
                        No workflow data available for selected date range
                      </Typography>
                    </Box>
                  )}
                </ChartContainer>
              </Grid>

              {/* Execution Trends Placeholder */}
              <Grid size={{ xs: 12, md: 6 }}>
                <ChartContainer elevation={2}>
                  <Typography variant="h6" gutterBottom>
                    Execution Trends
                  </Typography>
                  <PlaceholderBox>
                    <Box sx={{ textAlign: 'center' }}>
                      <Typography variant="h4" sx={{ mb: 1 }}>📊</Typography>
                      <Typography variant="body1" color="text.secondary">
                        Detailed execution trends will be available here
                      </Typography>
                      <Typography variant="caption" display="block" sx={{ mt: 1 }}>
                        Coming soon with time-series data
                      </Typography>
                    </Box>
                  </PlaceholderBox>
                </ChartContainer>
              </Grid>
            </Grid>
          </Box>
        )}
      </Container>
    </LocalizationProvider>
  );
}
