import React from 'react';
import { Card, Row, Col, Statistic, Table, DatePicker, Alert, Spin } from 'antd';
import { useQuery } from 'react-query';
import { Line } from '@ant-design/charts';
import { formatCurrency } from '@/utils/format';

const { RangePicker } = DatePicker;

export default function MetricsDashboard() {
  const [dateRange, setDateRange] = React.useState<[Date, Date]>([
    new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
    new Date(),
  ]);

  const { data: metrics, isLoading, error } = useQuery(
    ['metrics', dateRange],
    async () => {
      const [start, end] = dateRange;
      const response = await fetch(
        `/api/admin/metrics?start=${start.toISOString()}&end=${end.toISOString()}`
      );
      if (!response.ok) {
        throw new Error('Failed to fetch metrics');
      }
      return response.json();
    }
  );

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex justify-center items-center h-64">
          <Spin size="large" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Alert
          message="Error Loading Metrics"
          description="There was a problem loading the metrics data. Please try again later."
          type="error"
          showIcon
        />
      </div>
    );
  }

  const executionData = metrics?.executionsByDay.map((item: any) => ({
    date: new Date(item.date).toLocaleDateString(),
    executions: item.count,
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

  return (
    <div className="p-6">
      <div className="mb-6">
        <RangePicker
          value={dateRange}
          onChange={(dates) => dates && setDateRange(dates)}
        />
      </div>

      <Row gutter={[16, 16]}>
        <Col span={6}>
          <Card>
            <Statistic
              title="Total Revenue"
              value={metrics?.totalRevenue}
              formatter={(value) => formatCurrency(value)}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Active Subscriptions"
              value={metrics?.activeSubscriptions}
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Trial Conversion Rate"
              value={metrics?.trialConversionRate}
              suffix="%"
            />
          </Card>
        </Col>
        <Col span={6}>
          <Card>
            <Statistic
              title="Churn Rate"
              value={metrics?.churnRate}
              suffix="%"
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={16}>
          <Card title="Daily Executions">
            <Line {...config} />
          </Card>
        </Col>
        <Col span={8}>
          <Card title="Plan Distribution">
            <Table
              dataSource={metrics?.planDistribution}
              columns={[
                {
                  title: 'Plan',
                  dataIndex: 'name',
                },
                {
                  title: 'Count',
                  dataIndex: 'count',
                },
                {
                  title: 'Revenue',
                  dataIndex: 'revenue',
                  render: (value) => formatCurrency(value),
                },
              ]}
              pagination={false}
            />
          </Card>
        </Col>
      </Row>

      <Row gutter={[16, 16]} className="mt-6">
        <Col span={24}>
          <Card title="Top Usage Violators">
            <Table
              dataSource={metrics?.usageViolators}
              columns={[
                {
                  title: 'Organization',
                  dataIndex: 'name',
                },
                {
                  title: 'Plan',
                  dataIndex: 'plan',
                },
                {
                  title: 'Usage',
                  dataIndex: 'usage',
                  render: (value, record) =>
                    `${value}/${record.limit} executions`,
                },
                {
                  title: 'Overage',
                  dataIndex: 'overage',
                  render: (value) => `${value}%`,
                },
              ]}
            />
          </Card>
        </Col>
      </Row>
    </div>
  );
} 