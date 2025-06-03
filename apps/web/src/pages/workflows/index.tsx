import React from 'react';
import { Table, Button, Space, Tooltip } from 'antd';
import { EditOutlined, DeleteOutlined, PlayCircleOutlined } from '@ant-design/icons';
import { useRouter } from 'next/router';
import { useQuery } from 'react-query';
import { ExportButton } from '@/components/ExportButton';
import api, { endpoints } from '@/utils/api';

interface Workflow {
  id: string;
  name: string;
  description: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export default function WorkflowList() {
  const router = useRouter();
  const { data: workflows, isLoading } = useQuery<Workflow[]>('workflows', async () => {
    const response = await api.get(endpoints.workflows.list);
    return response.data;
  });

  const columns = [
    {
      title: 'Name',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: 'Description',
      dataIndex: 'description',
      key: 'description',
    },
    {
      title: 'Status',
      dataIndex: 'status',
      key: 'status',
    },
    {
      title: 'Last Updated',
      dataIndex: 'updatedAt',
      key: 'updatedAt',
      render: (date: string) => new Date(date).toLocaleDateString(),
    },
    {
      title: 'Actions',
      key: 'actions',
      render: (_: any, record: Workflow) => (
        <Space>
          <Tooltip title="Edit Workflow">
            <Button
              icon={<EditOutlined />}
              onClick={() => router.push(`/workflows/${record.id}/edit`)}
            />
          </Tooltip>
          <Tooltip title="Run Workflow">
            <Button
              icon={<PlayCircleOutlined />}
              onClick={() => router.push(`/workflows/${record.id}/run`)}
            />
          </Tooltip>
          <Tooltip title="Export Workflow">
            <ExportButton
              type="workflow"
              workflowId={record.id}
              includeMetadata
            />
          </Tooltip>
          <Tooltip title="Delete Workflow">
            <Button
              danger
              icon={<DeleteOutlined />}
              onClick={() => handleDelete(record.id)}
            />
          </Tooltip>
        </Space>
      ),
    },
  ];

  const handleDelete = async (id: string) => {
    try {
      await api.delete(`${endpoints.workflows.delete}/${id}`);
      // Refresh the list
      router.reload();
    } catch (error) {
      console.error('Error deleting workflow:', error);
    }
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Workflows</h1>
        <Button
          type="primary"
          onClick={() => router.push('/workflows/new')}
        >
          Create Workflow
        </Button>
      </div>

      <Table
        columns={columns}
        dataSource={workflows}
        loading={isLoading}
        rowKey="id"
      />
    </div>
  );
} 