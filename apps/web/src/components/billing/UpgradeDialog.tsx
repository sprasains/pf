import React from 'react';
import { Modal, Button, List, Typography, Space } from 'antd';
import { useSubscription } from '@/hooks/useSubscription';
import { useRouter } from 'next/router';

const { Title, Text } = Typography;

interface UpgradeDialogProps {
  visible: boolean;
  onClose: () => void;
}

export const UpgradeDialog: React.FC<UpgradeDialogProps> = ({
  visible,
  onClose,
}) => {
  const { subscription, isLoading } = useSubscription();
  const router = useRouter();

  const handleUpgrade = (planId: string) => {
    router.push(`/billing/upgrade?plan=${planId}`);
    onClose();
  };

  return (
    <Modal
      title="Upgrade Your Plan"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <List
        itemLayout="horizontal"
        dataSource={[
          {
            name: 'Starter',
            price: '$29',
            executions: '1,000',
            features: ['Basic workflow templates', 'Email support'],
          },
          {
            name: 'Professional',
            price: '$99',
            executions: '5,000',
            features: [
              'Advanced workflow templates',
              'Priority support',
              'Custom integrations',
            ],
          },
          {
            name: 'Enterprise',
            price: '$299',
            executions: 'Unlimited',
            features: [
              'Custom workflow templates',
              '24/7 support',
              'Dedicated account manager',
              'SLA guarantee',
            ],
          },
        ]}
        renderItem={(item) => (
          <List.Item
            actions={[
              <Button
                type="primary"
                onClick={() => handleUpgrade(item.name.toLowerCase())}
                disabled={isLoading}
              >
                Select Plan
              </Button>,
            ]}
          >
            <List.Item.Meta
              title={
                <Space>
                  <Title level={4}>{item.name}</Title>
                  <Text type="secondary">{item.price}/month</Text>
                </Space>
              }
              description={
                <Space direction="vertical">
                  <Text strong>{item.executions} executions/month</Text>
                  <ul>
                    {item.features.map((feature, index) => (
                      <li key={index}>{feature}</li>
                    ))}
                  </ul>
                </Space>
              }
            />
          </List.Item>
        )}
      />
    </Modal>
  );
}; 