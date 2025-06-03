import React from 'react';
import { Card, Row, Col, Statistic, Progress, Alert } from 'antd';
import { useQuery } from 'react-query';
import { Line } from '@ant-design/charts';
import { formatNumber } from '@/utils/format';
import api, { endpoints } from '@/utils/api';

interface UsageData {
  executionsByDay: Array<{
    createdAt: string;
    _count: number;
  }>;
  totalWorkflows: number;
  activeUsers: number;
  subscription: {
    status: string;
    trialEndsAt?: string;
    plan: {
      name: string;
      executionLimit: number;
    };
    currentExecutions: number;
  } | null;
}

export default function UsageDashboard() {
  const { data, isLoading, error } = useQuery<UsageData>(
    'usage',
    () => api.get(endpoints.analytics.usage)
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Usage Data"
          description="There was a problem loading your usage data. Please try again later."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const executionData = data?.executionsByDay.map((item) => ({
    date: new Date(item.createdAt).toLocaleDateString(),
    executions: item._count,
  }));

  const config = {
    data: executionData || [],
    xField: 'date',
    yField: 'executions',
    point: {
      size: 5,
      shape: 'diamond',
    },
  };

  const usagePercentage = data?.subscription
    ? (data.subscription.currentExecutions / data.subscription.plan.executionLimit) * 100
    : 0;

  const getUsageStatus = () => {
    if (usagePercentage >= 90) return 'exception';
    if (usagePercentage >= 75) return 'warning';
    return 'normal';
  };

  return (
    <div className="p-6">
      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Workflows"
              value={data?.totalWorkflows}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Users"
              value={data?.activeUsers}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Current Plan"
              value={data?.subscription?.plan.name || 'No Plan'}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trial Status"
              value={data?.subscription?.status === 'trialing' ? 'Active' : 'N/A'}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={16}>
          <Card title="Execution Trend (Last 30 Days)">
            <Line {...config} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Usage This Month">
            <div className="space-y-4">
              <Progress
                type="dashboard"
                percent={usagePercentage}
                status={getUsageStatus()}
                format={(percent) => `${data?.subscription?.currentExecutions || 0}/${data?.subscription?.plan.executionLimit || 0}`}
              />
              {usagePercentage >= 90 && (
                <Alert
                  message="Approaching Limit"
                  description="You are approaching your execution limit. Consider upgrading your plan."
                  type="warning"
                  showIcon
                />
              )}
            </div>
          </Card>
        </Col>
      </Row>
    </div>
  );
} 