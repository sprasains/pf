import React from 'react';
import { Card, Progress, Typography, Alert, Spin } from 'antd';
import { useSubscription } from '@/hooks/useSubscription';

const { Text } = Typography;

export const UsageMeter: React.FC = () => {
  const { subscription, isLoading, error } = useSubscription();

  if (isLoading) {
    return (
      <Card title="Usage This Month">
        <div className="flex justify-center items-center p-4">
          <Spin />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card title="Usage This Month">
        <Alert
          message="Error Loading Usage"
          description="There was a problem loading your usage details. Please try again later."
          type="error"
        />
      </Card>
    );
  }

  if (!subscription) {
    return (
      <Card title="Usage This Month">
        <Alert
          message="No Subscription"
          description="Subscribe to track your usage"
          type="info"
        />
      </Card>
    );
  }

  const { currentExecutions, plan } = subscription;
  const { executionLimit } = plan;
  const percentage = (currentExecutions / executionLimit) * 100;

  const getStatus = () => {
    if (percentage >= 90) return 'exception';
    if (percentage >= 75) return 'warning';
    return 'normal';
  };

  return (
    <Card title="Usage This Month">
      <div className="space-y-4">
        <div>
          <Text strong>Workflow Executions</Text>
          <Progress
            percent={percentage}
            status={getStatus()}
            format={(percent) => `${currentExecutions}/${executionLimit}`}
          />
        </div>
        <Text type="secondary">
          {percentage >= 90
            ? 'You are approaching your execution limit'
            : percentage >= 75
            ? 'Consider upgrading for more executions'
            : 'Usage is within normal range'}
        </Text>
      </div>
    </Card>
  );
}; 