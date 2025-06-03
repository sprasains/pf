import React from 'react';
import { Button, Modal, message, DatePicker, Select, Space } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { exportWorkflow, exportAnalytics, exportBillingHistory, ExportOptions } from '@/utils/export';
import type { RangePickerProps } from 'antd/es/date-picker';
import dayjs from 'dayjs';

interface ExportButtonProps {
  type: 'workflow' | 'analytics' | 'billing';
  workflowId?: string;
  includeMetadata?: boolean;
  className?: string;
}

export const ExportButton: React.FC<ExportButtonProps> = ({
  type,
  workflowId,
  includeMetadata = false,
  className,
}) => {
  const [isModalVisible, setIsModalVisible] = React.useState(false);
  const [isLoading, setIsLoading] = React.useState(false);
  const [dateRange, setDateRange] = React.useState<[dayjs.Dayjs, dayjs.Dayjs]>([
    dayjs().subtract(30, 'days'),
    dayjs(),
  ]);
  const [format, setFormat] = React.useState<'csv' | 'json'>('csv');

  const handleDateRangeChange: RangePickerProps['onChange'] = (dates) => {
    if (dates && dates[0] && dates[1]) {
      setDateRange([dates[0], dates[1]]);
    }
  };

  const handleExport = async () => {
    try {
      setIsLoading(true);

      const options: ExportOptions = {
        format,
        dateRange: {
          from: dateRange[0].toDate(),
          to: dateRange[1].toDate(),
        },
      };

      switch (type) {
        case 'workflow':
          if (!workflowId) throw new Error('Workflow ID is required');
          await exportWorkflow(workflowId, includeMetadata);
          break;
        case 'analytics':
          await exportAnalytics(options);
          break;
        case 'billing':
          await exportBillingHistory(options);
          break;
      }

      message.success('Export completed successfully');
      setIsModalVisible(false);
    } catch (error) {
      console.error('Export error:', error);
      message.error('Failed to export data. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const showModal = () => {
    setIsModalVisible(true);
  };

  const handleCancel = () => {
    setIsModalVisible(false);
  };

  const getModalTitle = () => {
    switch (type) {
      case 'workflow':
        return 'Export Workflow';
      case 'analytics':
        return 'Export Analytics';
      case 'billing':
        return 'Export Billing History';
      default:
        return 'Export';
    }
  };

  const renderModalContent = () => {
    if (type === 'workflow') {
      return (
        <div className="space-y-4">
          <p>Export this workflow as a JSON file.</p>
          {includeMetadata && (
            <p className="text-sm text-gray-500">
              The export will include workflow metadata and thumbnail.
            </p>
          )}
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date Range
          </label>
          <DatePicker.RangePicker
            value={dateRange}
            onChange={handleDateRangeChange}
            className="w-full"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Format
          </label>
          <Select
            value={format}
            onChange={setFormat}
            className="w-full"
            options={[
              { label: 'CSV', value: 'csv' },
              { label: 'JSON', value: 'json' },
            ]}
          />
        </div>
      </div>
    );
  };

  return (
    <>
      <Button
        type="primary"
        icon={isLoading ? <LoadingOutlined /> : <DownloadOutlined />}
        onClick={showModal}
        className={className}
        loading={isLoading}
      >
        Export
      </Button>

      <Modal
        title={getModalTitle()}
        open={isModalVisible}
        onOk={handleExport}
        onCancel={handleCancel}
        confirmLoading={isLoading}
      >
        {renderModalContent()}
      </Modal>
    </>
  );
}; 