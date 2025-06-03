import { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  BarChart, Bar
} from 'recharts';
import { 
  CheckCircleOutlined, 
  CloseCircleOutlined, 
  ClockCircleOutlined,
  ArrowUpOutlined,
  ArrowDownOutlined
} from '@ant-design/icons';
import { logger } from '../../utils/logger';

// Sample data for charts
const executionData = [
  { name: 'Mon', executions: 12 },
  { name: 'Tue', executions: 19 },
  { name: 'Wed', executions: 15 },
  { name: 'Thu', executions: 22 },
  { name: 'Fri', executions: 18 },
  { name: 'Sat', executions: 8 },
  { name: 'Sun', executions: 5 },
];

const performanceData = [
  { name: 'Mon', success: 95, failure: 5 },
  { name: 'Tue', success: 88, failure: 12 },
  { name: 'Wed', success: 92, failure: 8 },
  { name: 'Thu', success: 90, failure: 10 },
  { name: 'Fri', success: 85, failure: 15 },
  { name: 'Sat', success: 98, failure: 2 },
  { name: 'Sun', success: 96, failure: 4 },
];

const recentExecutions = [
  {
    id: '1',
    name: 'Lead Capture',
    status: 'success',
    time: '2 min ago',
    duration: '45s',
  },
  {
    id: '2',
    name: 'Email Campaign',
    status: 'failed',
    time: '15 min ago',
    duration: '1m 20s',
  },
  {
    id: '3',
    name: 'Data Sync',
    status: 'running',
    time: 'Just now',
    duration: '30s',
  },
];

const Dashboard = () => {
  const [timeRange, setTimeRange] = useState('week');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success':
        return 'text-green-500';
      case 'failed':
        return 'text-red-500';
      case 'running':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success':
        return <CheckCircleOutlined />;
      case 'failed':
        return <CloseCircleOutlined />;
      case 'running':
        return <ClockCircleOutlined />;
      default:
        return null;
    }
  };

  return (
    <div className="relative min-h-[600px] bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 shadow-soft overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-24 w-48 h-48 bg-primary-200 rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary-200 rounded-full opacity-20"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <div className="relative">
        {/* Summary cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white rounded-xl p-6 shadow-soft"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Total Executions</h3>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"
              >
                <span className="text-primary-600 text-xl">📊</span>
              </motion.div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">1,234</span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-green-500 flex items-center gap-1"
              >
                <ArrowUpOutlined />
                12%
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white rounded-xl p-6 shadow-soft"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Success Rate</h3>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center"
              >
                <span className="text-success-600 text-xl">✅</span>
              </motion.div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">98.5%</span>
              <motion.span
                animate={{ y: [0, -5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-green-500 flex items-center gap-1"
              >
                <ArrowUpOutlined />
                2.3%
              </motion.span>
            </div>
          </motion.div>

          <motion.div
            whileHover={{ scale: 1.02, y: -5 }}
            className="bg-white rounded-xl p-6 shadow-soft"
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-medium text-gray-900">Avg. Duration</h3>
              <motion.div
                whileHover={{ rotate: 360 }}
                transition={{ duration: 0.5 }}
                className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center"
              >
                <span className="text-secondary-600 text-xl">⏱️</span>
              </motion.div>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-gray-900">45s</span>
              <motion.span
                animate={{ y: [0, 5, 0] }}
                transition={{ duration: 1, repeat: Infinity }}
                className="text-red-500 flex items-center gap-1"
              >
                <ArrowDownOutlined />
                5.2%
              </motion.span>
            </div>
          </motion.div>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl p-6 shadow-soft"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Execution History</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={executionData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar
                    dataKey="executions"
                    fill="#3b82f6"
                    radius={[4, 4, 0, 0]}
                    animationDuration={2000}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-xl p-6 shadow-soft"
          >
            <h3 className="text-lg font-medium text-gray-900 mb-4">Performance Trend</h3>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={performanceData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Line
                    type="monotone"
                    dataKey="success"
                    stroke="#10b981"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    animationDuration={2000}
                  />
                  <Line
                    type="monotone"
                    dataKey="failure"
                    stroke="#ef4444"
                    strokeWidth={2}
                    dot={{ r: 4 }}
                    animationDuration={2000}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>
        </div>

        {/* Recent executions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl p-6 shadow-soft"
        >
          <h3 className="text-lg font-medium text-gray-900 mb-4">Recent Executions</h3>
          <div className="space-y-4">
            {recentExecutions.map((execution) => (
              <motion.div
                key={execution.id}
                whileHover={{ scale: 1.02, x: 5 }}
                className="flex items-center justify-between p-4 bg-gray-50 rounded-lg"
              >
                <div className="flex items-center gap-4">
                  <motion.div
                    whileHover={{ rotate: 360 }}
                    transition={{ duration: 0.5 }}
                    className={`w-8 h-8 rounded-full flex items-center justify-center ${getStatusColor(
                      execution.status
                    )}`}
                  >
                    {getStatusIcon(execution.status)}
                  </motion.div>
                  <div>
                    <h4 className="font-medium text-gray-900">{execution.name}</h4>
                    <p className="text-sm text-gray-500">{execution.time}</p>
                  </div>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-sm text-gray-500">{execution.duration}</span>
                  <motion.div
                    whileHover={{ scale: 1.2 }}
                    className={`w-2 h-2 rounded-full ${getStatusColor(execution.status)}`}
                  />
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default Dashboard; 