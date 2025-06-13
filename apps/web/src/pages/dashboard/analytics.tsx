import React, { useEffect, useState } from 'react';
// Remove Ant Design imports
// import { Row, Col, Statistic, Table, Alert, Tabs, DatePicker, Switch, Select, Input } from 'antd';
// import type { CardProps } from 'antd';
// import { Card } from 'antd';
// import { Line, Heatmap, Funnel, Pie, Column } from '@ant-design/charts';
// import { DownloadOutlined, ReloadOutlined, SyncOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
// import { Button, Space } from 'antd';
// import type { RangePickerProps } from 'antd/es/date-picker';

// Import MUI components
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid';
import Paper from '@mui/material/Paper';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CircularProgress from '@mui/material/CircularProgress';
import Alert from '@mui/material/Alert';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Switch from '@mui/material/Switch';
import Select from '@mui/material/Select';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import FormControl from '@mui/material/FormControl';
import InputLabel from '@mui/material/InputLabel';
// import { Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material'; // Import MUI Table components (currently unused)

// Import MUI Date Picker components (from @mui/x-date-pickers)
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import type { DateRange } from '@mui/x-date-pickers/models';
import dayjs, { Dayjs } from 'dayjs';

// Import Recharts components for charts
import { Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
// Note: Recharts might not have direct equivalents for Heatmap, Funnel, Column charts like Ant Design Charts. Will need to find alternatives or different visualization approaches if necessary.

import { useQuery } from 'react-query';
import { formatNumber, formatCurrency, formatDuration } from '@/utils/format';
import api, { endpoints } from '@/utils/api';
// Keep these if needed, but try to replace with MUI icons
// import { DownloadOutlined, ReloadOutlined, SyncOutlined, SearchOutlined, ClearOutlined } from '@ant-design/icons';
// import { ExportButton } from '@/components/ExportButton'; // Keep if still used
// import { useSocketContext } from '@/contexts/SocketContext'; // Commented out as socket is unused

// Import DateRangePicker and DateRange from @mui/x-date-pickers-pro
import { DateRangePicker } from '@mui/x-date-pickers-pro/DateRangePicker';
import type { DateRange } from '@mui/x-date-pickers-pro/models';

// Keep interfaces for API data structure
interface EngagementMetrics {
  activeUsers: {
    daily: number;
    weekly: number;
    monthly: number;
  };
  workflowStats: Array<{
    status: string;
    _count: number;
  }>;
  avgExecutionTime: number;
  nodeUsage: Array<[string, number]>;
  loginDistribution: Record<number, number>;
  users: Array<{
    id: string;
    name: string;
  }>;
  workflows: Array<{
    id: string;
    name: string;
  }>;
}

interface AIMetrics {
  totalPrompts: number;
  successfulPrompts: number;
  promptSuccessRate: number;
  categories: Array<[string, number]>;
}

interface RevenueMetrics {
  ltv: number;
  conversionRate: number;
  revenuePerExecution: number;
  subscriptionHistory: Array<{
    plan: string;
    price: number;
    status: string;
    startDate: string;
    endDate: string | null;
  }>;
}

interface ApiResponse<T> {
  data: T;
  success: boolean;
}

interface FilterState {
  searchTerm: string;
  status: string[];
  category: string[];
  userId: string | null;
  workflowId: string | null;
  dateRange: [dayjs.Dayjs | null, dayjs.Dayjs | null]; // Use Dayjs and allow null for DateRangePicker
}

const DATE_PRESETS = [
  { label: 'Last 24 hours', value: [dayjs().subtract(24, 'hour'), dayjs()] },
  { label: 'Last 7 days', value: [dayjs().subtract(7, 'day'), dayjs()] },
  { label: 'Last 30 days', value: [dayjs().subtract(30, 'day'), dayjs()] },
  { label: 'Last 90 days', value: [dayjs().subtract(90, 'day'), dayjs()] },
  { label: 'This month', value: [dayjs().startOf('month'), dayjs()] },
  { label: 'Last month', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
];

export default function AnalyticsDashboard() {
  // Use Dayjs for date range state
  const [dateRange, setDateRange] = React.useState<DateRange<Dayjs>>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);

  // const { socket } = useSocketContext(); // Commented out as socket is unused
  const [realTimeUpdates, setRealTimeUpdates] = React.useState(false); // Keep state but remove effect
  const [filters, setFilters] = React.useState<FilterState>(() => {
    const savedFilters = sessionStorage.getItem('analyticsFilters');
    if (savedFilters) {
      const parsed = JSON.parse(savedFilters);
      return {
        ...parsed,
        dateRange: [parsed.dateRange[0] ? dayjs(parsed.dateRange[0]) : null, parsed.dateRange[1] ? dayjs(parsed.dateRange[1]) : null],
      };
    }
    return {
      searchTerm: '',
      status: [],
      category: [],
      userId: null,
      workflowId: null,
      dateRange: [dayjs().subtract(30, 'days'), dayjs()],
    };
  });

  // Save filters to sessionStorage
  useEffect(() => {
    sessionStorage.setItem('analyticsFilters', JSON.stringify({
      ...filters,
      dateRange: [filters.dateRange[0]?.toISOString(), filters.dateRange[1]?.toISOString()],
    }));
  }, [filters]);

  // Refetch data when filters change
  const { data: engagementData, isLoading: engagementLoading, refetch: refetchEngagement } = useQuery<ApiResponse<EngagementMetrics>>(
    ['engagementMetrics', filters],
    async () => {
      const response = await api.get<ApiResponse<EngagementMetrics>>(endpoints.analytics.engagement, {
        params: {
          fromDate: filters.dateRange[0]?.toISOString(),
          toDate: filters.dateRange[1]?.toISOString(),
          userId: filters.userId,
          workflowId: filters.workflowId,
          status: filters.status,
          category: filters.category,
        },
      });
      return response.data;
    }
  );

  const { data: aiData, isLoading: aiLoading, refetch: refetchAI } = useQuery<ApiResponse<AIMetrics>>(
    ['aiMetrics', dateRange], // Use dateRange as dependency for AI and Revenue metrics
    async () => {
      const response = await api.get<ApiResponse<AIMetrics>>(endpoints.analytics.ai, {
        params: {
          start: dateRange[0]?.toISOString(),
          end: dateRange[1]?.toISOString(),
        },
      });
      return response.data;
    }
  );

  const { data: revenueData, isLoading: revenueLoading, refetch: refetchRevenue } = useQuery<ApiResponse<RevenueMetrics>>(
    ['revenueMetrics', dateRange], // Use dateRange as dependency
    async () => {
      const response = await api.get<ApiResponse<RevenueMetrics>>(endpoints.analytics.revenue, {
        params: {
          start: dateRange[0]?.toISOString(),
          end: dateRange[1]?.toISOString(),
        },
      });
      return response.data;
    }
  );

  const isLoading = engagementLoading || aiLoading || revenueLoading;

  // Handle date range change from MUI DateRangePicker
  const handleDateRangeChange: (date: DateRange<Dayjs>) => void = (dates) => {
    setDateRange(dates);
    setFilters(prev => ({
      ...prev,
      dateRange: [dates[0], dates[1]],
    }));
  };

  const handleExport = () => {
    // Export logic - will need to adjust based on fetched data structure
    const csvContent = [
      ['Metric', 'Value'],
      ['Daily Active Users', engagementData?.data.activeUsers.daily || 0],
      ['Weekly Active Users', engagementData?.data.activeUsers.weekly || 0],
      ['Monthly Active Users', engagementData?.data.activeUsers.monthly || 0],
      ['Average Execution Time', formatDuration(engagementData?.data.avgExecutionTime || 0)],
      ['Total Prompts', aiData?.data.totalPrompts || 0],
      ['Prompt Success Rate', `${(aiData?.data.promptSuccessRate || 0).toFixed(2)}%`],
      ['LTV', formatCurrency(revenueData?.data.ltv || 0)],
      ['Conversion Rate', `${(revenueData?.data.conversionRate || 0).toFixed(2)}%`],
      ['Revenue per Execution', formatCurrency(revenueData?.data.revenuePerExecution || 0)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-export-${dateRange[0]?.format('YYYY-MM-DD')}-to-${dateRange[1]?.format('YYYY-MM-DD')}.csv`;
    link.click();
  };

  const handleRefresh = () => {
    refetchEngagement();
    refetchAI();
    refetchRevenue();
  };

  // Helper functions for formatting (keep and adapt)
  const formatStatisticValue = (value: number | undefined) => {
    if (value === undefined) return '0';
    return formatNumber(value);
  };

  const formatCurrencyValue = (value: number | undefined) => {
    if (value === undefined) return '$0.00';
    return formatCurrency(value);
  };

  const formatPercentageValue = (value: number | undefined) => {
    if (value === undefined) return '0%';
    return `${value.toFixed(2)}%`;
  };

  const formatTableValue = (value: number): string => {
    return formatNumber(value);
  };

  const formatTableDate = (date: string | null): string => {
    if (!date) return '';
    return dayjs(date).format('YYYY-MM-DD HH:mm');
  };

  const handleFilterChange = (key: keyof FilterState, value: any) => {
    setFilters(prev => ({
      ...prev,
      [key]: value,
    }));
  };

  const handleClearFilters = () => {
    setFilters({
      searchTerm: '',
      status: [],
      category: [],
      userId: null,
      workflowId: null,
      dateRange: [null, null], // Clear date range as well
    });
  };

  const [currentTab, setCurrentTab] = React.useState(0);

  const handleTabChange = (event: React.SyntheticEvent, newValue: number) => {
    setCurrentTab(newValue);
  };

  // Table columns (will need significant refactoring for MUI Table)
  // Example structure - need to adapt for specific data and MUI Table component
  const engagementTableColumns = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ];

  const aiTableColumns = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ];

  const revenueTableColumns = [
    { title: 'Metric', dataIndex: 'metric', key: 'metric' },
    { title: 'Value', dataIndex: 'value', key: 'value' },
  ];

  // Table data (will need mapping from fetched data to table row format)
  const engagementTableData = engagementData?.data ? [
    { metric: 'Daily Active Users', value: engagementData.data.activeUsers.daily },
    { metric: 'Weekly Active Users', value: engagementData.data.activeUsers.weekly },
    { metric: 'Monthly Active Users', value: engagementData.data.activeUsers.monthly },
    { metric: 'Average Execution Time', value: formatDuration(engagementData.data.avgExecutionTime || 0) },
  ] : [];

  const aiTableData = aiData?.data ? [
    { metric: 'Total Prompts', value: aiData.data.totalPrompts },
    { metric: 'Successful Prompts', value: aiData.data.successfulPrompts },
    { metric: 'Prompt Success Rate', value: formatPercentageValue(aiData.data.promptSuccessRate || 0) },
  ] : [];

  const revenueTableData = revenueData?.data ? [
    { metric: 'LTV', value: formatCurrencyValue(revenueData.data.ltv || 0) },
    { metric: 'Conversion Rate', value: formatPercentageValue(revenueData.data.conversionRate || 0) },
    { metric: 'Revenue per Execution', value: formatCurrencyValue(revenueData.data.revenuePerExecution || 0) },
  ] : [];

  // Placeholder chart data (replace with actual data mapping)
  const chartDataPlaceholder = [
    { name: 'Jan', value: 4000 },
    { name: 'Feb', value: 3000 },
    { name: 'Mar', value: 5000 },
  ];

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs}> {/* Wrap with LocalizationProvider */}
      <Container maxWidth="lg" className="py-6">
        <Box className="mb-6">
          <Typography variant="h4" component="h1" gutterBottom>
            Analytics Dashboard
          </Typography>
        </Box>

        {/* Filters and Controls */}
        <Paper elevation={1} sx={{ p: 2, mb: 3 }}>
          <Box sx={{ flexGrow: 1 }}>
            <Grid container spacing={2} alignItems="center">
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {/* Date Range Picker */}
                <DateRangePicker
                  localeText={{ start: 'Start Date', end: 'End Date' }}
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  sx={{ width: '100%' }}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                {/* Search Input */}
                <TextField
                  label="Search"
                  variant="outlined"
                  size="small"
                  fullWidth
                  value={filters.searchTerm}
                  onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                />
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                {/* Status Select */}
                <FormControl fullWidth size="small">
                  <InputLabel>Status</InputLabel>
                  <Select
                    multiple
                    value={filters.status}
                    onChange={(e) => handleFilterChange('status', e.target.value)}
                    label="Status"
                  >
                    <MenuItem value="success">Success</MenuItem>
                    <MenuItem value="failed">Failed</MenuItem>
                    {/* Add other statuses as needed */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, sm: 6, md: 2 }}>
                {/* Category Select */}
                <FormControl fullWidth size="small">
                  <InputLabel>Category</InputLabel>
                  <Select
                    multiple
                    value={filters.category}
                    onChange={(e) => handleFilterChange('category', e.target.value)}
                    label="Category"
                  >
                    <MenuItem value="ai">AI</MenuItem>
                    <MenuItem value="billing">Billing</MenuItem>
                    {/* Add other categories as needed */}
                  </Select>
                </FormControl>
              </Grid>
              <Grid size={{ xs: 12, md: 2 }}>
                <Stack direction="row" spacing={1}>
                  <Button variant="contained" onClick={handleRefresh} startIcon={<i className="fas fa-sync-alt"></i>}> {/* Replace with MUI Icon */}
                    Refresh
                  </Button>
                  <Button variant="outlined" onClick={handleClearFilters} startIcon={<i className="fas fa-times"></i>}> {/* Replace with MUI Icon */}
                    Clear
                  </Button>
                </Stack>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Real-time Updates Toggle */}
        <Box sx={{ mb: 3, display: 'flex', alignItems: "center" }}>
          <Switch
            checked={realTimeUpdates}
            onChange={(e) => setRealTimeUpdates(e.target.checked)}
            inputProps={{ 'aria-label': 'real time updates switch' }}
          />
          <Typography variant="body2" color="textSecondary">Enable Real-time Updates (via Socket.io)</Typography>
        </Box>

        {/* Loading State */}
        {isLoading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 400 }}>
            <CircularProgress size={60} />
          </Box>
        ) : (!engagementData?.success || !aiData?.success || !revenueData?.success ? (
          <Alert severity="error">Error loading analytics data. Please check the API.</Alert>
        ) : (
          <Box>
            {/* Tabs for different analytics sections */}
            <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
              <Tabs value={currentTab} onChange={handleTabChange} aria-label="analytics tabs">
                <Tab label="Engagement" />
                <Tab label="AI Metrics" />
                <Tab label="Revenue" />
              </Tabs>
            </Box>

            {/* Tab Panels */}
            <Box sx={{ p: 3 }}>
              {currentTab === 0 && (
                <Box> {/* Engagement Tab */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Grid container spacing={3}>
                      {/* Engagement Summary Metrics (replace with MetricCard) */}
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Daily Active Users</Typography>
                          <Typography variant="h5">{engagementData.data.activeUsers.daily}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Weekly Active Users</Typography>
                          <Typography variant="h5">{engagementData.data.activeUsers.weekly}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Monthly Active Users</Typography>
                          <Typography variant="h5">{engagementData.data.activeUsers.monthly}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Average Execution Time</Typography>
                          <Typography variant="h5">{formatDuration(engagementData.data.avgExecutionTime)}</Typography>
                        </Paper>
                      </Grid>

                      {/* Workflow Status Pie Chart (integrate Recharts PieChart) */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                          <Typography variant="h6" gutterBottom>Workflow Status Distribution</Typography>
                          <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                              <Pie
                                data={engagementData.data.workflowStats.map(s => ({ name: s.status, value: s._count }))}
                                dataKey="value" // Added dataKey prop
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                label
                              >
                                {engagementData.data.workflowStats.map((entry, index) => (
                                  <Cell key={`cell-engagement-${index}`} fill={['#4CAF50', '#F44366', '#FF9800'][index % 3]} /> // Corrected fill color string
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [value, 'Count']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </Paper>
                      </Grid>

                      {/* Node Usage Chart (e.g., Recharts BarChart or List) */}
                      <Grid size={{ xs: 12, md: 6 }}>
                        <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                          <Typography variant="h6" gutterBottom>Most Used Nodes</Typography>
                          {/* Example: Simple list for now, could be a table */}
                          <Box>
                            {engagementData.data.nodeUsage.map(([node, count]) => (
                              <Typography key={node}>{`${node}: ${count}`}</Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              )}

              {currentTab === 1 && (
                <Box> {/* AI Metrics Tab */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Grid container spacing={3}>
                      {/* AI Summary Metrics (replace with MetricCard) */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Total Prompts</Typography>
                          <Typography variant="h5">{aiData?.data.totalPrompts || 0}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Successful Prompts</Typography>
                          <Typography variant="h5">{aiData?.data.successfulPrompts || 0}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Prompt Success Rate</Typography>
                          <Typography variant="h5">{formatPercentageValue(aiData?.data.promptSuccessRate || 0)}</Typography>
                        </Paper>
                      </Grid>

                      {/* AI Category Distribution Chart (integrate Recharts PieChart) */}
                      <Grid size={{ xs: 12 }}>
                        <Paper elevation={1} sx={{ p: 2, height: 400 }}>
                          <Typography variant="h6" gutterBottom>AI Prompt Category Distribution</Typography>
                          <ResponsiveContainer width="100%" height="90%">
                            <PieChart>
                              <Pie
                                data={Object.entries(aiData?.data.categories || {}).map(([name, value]) => ({ name, value }))}
                                dataKey="value" // Added dataKey prop
                                cx="50%"
                                cy="50%"
                                outerRadius={100}
                                label
                              >
                                {Object.entries(aiData?.data.categories || {}).map((entry, index) => (
                                  <Cell key={`cell-ai-${index}`} fill={['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0'][index % 4]} /> // Example colors
                                ))}
                              </Pie>
                              <Tooltip formatter={(value) => [value, 'Count']} />
                              <Legend />
                            </PieChart>
                          </ResponsiveContainer>
                        </Paper>
                      </Grid>

                    </Grid>
                  </Box>
                </Box>
              )}

              {currentTab === 2 && (
                <Box> {/* Revenue Tab */}
                  <Box sx={{ flexGrow: 1 }}>
                    <Grid container spacing={3}>
                      {/* Revenue Summary Metrics (replace with MetricCard) */}
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Lifetime Value (LTV)</Typography>
                          <Typography variant="h5">{formatCurrencyValue(revenueData?.data.ltv || 0)}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Conversion Rate</Typography>
                          <Typography variant="h5">{formatPercentageValue(revenueData?.data.conversionRate || 0)}</Typography>
                        </Paper>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6, md: 4 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Revenue per Execution</Typography>
                          <Typography variant="h5">{formatCurrencyValue(revenueData?.data.revenuePerExecution || 0)}</Typography>
                        </Paper>
                      </Grid>

                      {/* Subscription History Table (integrate MUI Table) */}
                      <Grid size={{ xs: 12 }}>
                        <Paper elevation={1} sx={{ p: 2 }}>
                          <Typography variant="h6" gutterBottom>Subscription History</Typography>
                          {/* Example: Simple list for now, could be a table */}
                          <Box>
                            {revenueData?.data.subscriptionHistory.map((sub, index) => (
                              <Typography key={index}>
                                {`${sub.plan}: ${sub.status} - ${formatCurrencyValue(sub.price)} from ${formatTableDate(sub.startDate)} to ${formatTableDate(sub.endDate)}`}
                              </Typography>
                            ))}
                          </Box>
                        </Paper>
                      </Grid>
                    </Grid>
                  </Box>
                </Box>
              )}
            </Box>
          </Box>
        )}
      </Container>
    </LocalizationProvider>
  );
}
