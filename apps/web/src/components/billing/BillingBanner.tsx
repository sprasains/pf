import React from 'react';
import { Alert, Button, Card, Typography, Spin } from 'antd';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/router';

const { Title, Text } = Typography;

export const BillingBanner: React.FC = () => {
  const { subscription, isLoading, error } = useSubscription();
  const router = useRouter();

  if (isLoading) {
    return (
      <Card>
        <div className="flex justify-center items-center p-4">
          <Spin />
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert
        message="Error Loading Subscription"
        description="There was a problem loading your subscription details. Please try again later."
        type="error"
        action={
          <Button type="primary" onClick={() => window.location.reload()}>
            Retry
          </Button>
        }
      />
    );
  }

  if (!subscription) {
    return (
      <Alert
        message="No Active Subscription"
        description="Start your free trial to unlock all features"
        type="warning"
        action={
          <Button type="primary" onClick={() => router.push('/billing')}>
            Start Trial
          </Button>
        }
      />
    );
  }

  const isTrial = subscription.status === 'trialing';
  const daysLeft = isTrial
    ? Math.ceil(
        (new Date(subscription.trialEndsAt).getTime() - Date.now()) /
          (1000 * 60 * 60 * 24)
      )
    : 0;

  return (
    <Card>
      <div className="flex justify-between items-center">
        <div>
          <Title level={4}>{subscription.plan.name}</Title>
          <Text type="secondary">
            {isTrial
              ? `Trial ends in ${daysLeft} days`
              : `Billing cycle: ${new Date(
                  subscription.startedAt
                ).toLocaleDateString()}`}
          </Text>
        </div>
        <Button
          type="primary"
          onClick={() => router.push('/billing/portal')}
        >
          Manage Subscription
        </Button>
      </div>
    </Card>
  );
}; 