import React from 'react';
import { Card, Row, Col, Statistic, Table, Alert } from 'antd';
import { useQuery } from 'react-query';
import { Line, Heatmap, Funnel } from '@ant-design/charts';
import { formatNumber, formatCurrency } from '@/utils/format';
import api, { endpoints } from '@/utils/api';
import { DownloadOutlined } from '@ant-design/icons';
import { Button } from 'antd';

interface AdminMetrics {
  mrr: number;
  executionsByOrg: Array<{
    orgId: string;
    _count: number;
  }>;
  churnRate: number;
  topUsers: Array<{
    id: string;
    email: string;
    lastActiveAt: string;
    organization: {
      name: string;
    };
  }>;
  topTemplates: Array<{
    id: string;
    name: string;
    executionCount: number;
    organization: {
      name: string;
    };
  }>;
  executionsByHour: Array<{
    createdAt: string;
    _count: number;
  }>;
  conversionFunnel: {
    trials: number;
    active: number;
    paid: number;
  };
  planDistribution: Array<{
    plan: string;
    count: number;
  }>;
}

export default function AdminAnalytics() {
  const { data, isLoading, error } = useQuery<AdminMetrics>(
    'adminMetrics',
    () => api.get(endpoints.admin.metrics)
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
          message="Error Loading Analytics"
          description="There was a problem loading the analytics data. Please try again later."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const executionData = data?.executionsByOrg.map((item) => ({
    org: item.orgId,
    executions: item._count,
  }));

  const heatmapData = data?.executionsByHour.map((item) => ({
    hour: new Date(item.createdAt).getHours(),
    day: new Date(item.createdAt).getDay(),
    value: item._count,
  }));

  const funnelData = data?.conversionFunnel
    ? [
        { stage: 'Trials', value: data.conversionFunnel.trials },
        { stage: 'Active', value: data.conversionFunnel.active },
        { stage: 'Paid', value: data.conversionFunnel.paid },
      ]
    : [];

  const handleExport = () => {
    const csvContent = [
      ['Metric', 'Value'],
      ['MRR', formatCurrency(data?.mrr || 0)],
      ['Churn Rate', `${data?.churnRate.toFixed(2)}%`],
      ['Total Executions', formatNumber(data?.executionsByOrg.reduce((sum, org) => sum + org._count, 0) || 0)],
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `analytics-export-${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Admin Analytics</h1>
        <Button 
          type="primary" 
          icon={<DownloadOutlined />}
          onClick={handleExport}
        >
          Export Data
        </Button>
      </div>

      <Row gutter={[16, 16]}>
        <Col span={8}>
          <Card>
            <Statistic
              title="Monthly Recurring Revenue"
              value={data?.mrr}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Churn Rate"
              value={data?.churnRate}
              formatter={(value) => `${value.toFixed(2)}%`}
            />
          </Card>
        </Col>
        <Col span={8}>
          <Card>
            <Statistic
              title="Total Executions"
              value={data?.executionsByOrg.reduce((sum, org) => sum + org._count, 0)}
              formatter={(value) => formatNumber(value)}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={12}>
          <Card title="Execution Distribution">
            <Line
              data={executionData || []}
              xField="org"
              yField="executions"
              point={{
                size: 5,
                shape: 'diamond',
              }}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Conversion Funnel">
            <Funnel
              data={funnelData}
              xField="stage"
              yField="value"
              shape="funnel"
              conversionTag={{
                offsetX: 10,
                offsetY: 0,
                style: {
                  fill: '#666',
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={24}>
          <Card title="Execution Heatmap">
            <Heatmap
              data={heatmapData || []}
              xField="hour"
              yField="day"
              colorField="value"
              shape="square"
              color={['#BAE7FF', '#1890FF', '#0050B3']}
              label={{
                style: {
                  fill: '#fff',
                  shadowBlur: 2,
                  shadowColor: 'rgba(0,0,0,0.45)',
                },
              }}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={12}>
          <Card title="Top Active Users">
            <Table
              dataSource={data?.topUsers}
              columns={[
                {
                  title: 'User',
                  dataIndex: 'email',
                  key: 'email',
                },
                {
                  title: 'Organization',
                  dataIndex: ['organization', 'name'],
                  key: 'org',
                },
                {
                  title: 'Last Active',
                  dataIndex: 'lastActiveAt',
                  key: 'lastActive',
                  render: (date) => new Date(date).toLocaleDateString(),
                },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
        <Col span={12}>
          <Card title="Top Templates">
            <Table
              dataSource={data?.topTemplates}
              columns={[
                {
                  title: 'Template',
                  dataIndex: 'name',
                  key: 'name',
                },
                {
                  title: 'Organization',
                  dataIndex: ['organization', 'name'],
                  key: 'org',
                },
                {
                  title: 'Executions',
                  dataIndex: 'executionCount',
                  key: 'executions',
                  render: (value) => formatNumber(value),
                },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
} 