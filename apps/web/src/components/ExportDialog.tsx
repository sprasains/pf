import React, { useState, useEffect } from 'react';
import { Modal, Form, Select, DatePicker, Switch, Button, Progress, message } from 'antd';
import { DownloadOutlined, LoadingOutlined } from '@ant-design/icons';
import { ExportFormat, ExportType, ExportOptions, ExportTemplate, getExportTemplates, scheduleExport, checkExportStatus } from '@/utils/export';
import dayjs from 'dayjs';

interface ExportDialogProps {
  visible: boolean;
  onClose: () => void;
  type: ExportType;
  onExport: (options: ExportOptions) => Promise<void>;
}

export const ExportDialog: React.FC<ExportDialogProps> = ({
  visible,
  onClose,
  type,
  onExport,
}) => {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [jobId, setJobId] = useState<string | null>(null);
  const [templates, setTemplates] = useState<ExportTemplate[]>([]);

  useEffect(() => {
    if (visible) {
      setTemplates(getExportTemplates(type));
    }
  }, [visible, type]);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (jobId) {
      interval = setInterval(async () => {
        try {
          const { status, fileUrl } = await checkExportStatus(jobId);
          if (status === 'completed' && fileUrl) {
            setProgress(100);
            message.success('Export completed!');
            window.open(fileUrl, '_blank');
            onClose();
          } else if (status === 'failed') {
            message.error('Export failed');
            setJobId(null);
          } else {
            setProgress(prev => Math.min(prev + 10, 90));
          }
        } catch (error) {
          console.error('Error checking export status:', error);
        }
      }, 2000);
    }
    return () => {
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [jobId, onClose]);

  const handleSubmit = async (values: any) => {
    try {
      setLoading(true);
      const options: ExportOptions = {
        format: values.format,
        type,
        dateRange: values.dateRange,
        includeMetadata: values.includeMetadata,
        templateId: values.templateId,
      };

      if (values.useTemplate) {
        const { jobId: newJobId } = await scheduleExport(options);
        setJobId(newJobId);
      } else {
        await onExport(options);
        onClose();
      }
    } catch (error) {
      message.error('Export failed');
      console.error('Export error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleTemplateSelect = (templateId: string) => {
    const template = templates.find(t => t.id === templateId);
    if (template) {
      form.setFieldsValue({
        format: template.format,
        fields: template.fields,
      });
    }
  };

  return (
    <Modal
      title="Export Data"
      open={visible}
      onCancel={onClose}
      footer={null}
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        onFinish={handleSubmit}
        initialValues={{
          format: 'csv',
          includeMetadata: true,
          useTemplate: false,
        }}
      >
        <Form.Item
          name="useTemplate"
          label="Use Template"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>

        {form.getFieldValue('useTemplate') ? (
          <Form.Item
            name="templateId"
            label="Select Template"
            rules={[{ required: true, message: 'Please select a template' }]}
          >
            <Select
              placeholder="Select a template"
              onChange={handleTemplateSelect}
              options={templates.map(template => ({
                label: template.name,
                value: template.id,
                description: template.description,
              }))}
            />
          </Form.Item>
        ) : (
          <>
            <Form.Item
              name="format"
              label="Format"
              rules={[{ required: true, message: 'Please select a format' }]}
            >
              <Select
                options={[
                  { label: 'CSV', value: 'csv' },
                  { label: 'JSON', value: 'json' },
                  { label: 'Excel', value: 'xlsx' },
                  { label: 'PDF', value: 'pdf' },
                ]}
              />
            </Form.Item>

            <Form.Item
              name="dateRange"
              label="Date Range"
              rules={[{ required: true, message: 'Please select a date range' }]}
            >
              <DatePicker.RangePicker />
            </Form.Item>

            <Form.Item
              name="includeMetadata"
              label="Include Metadata"
              valuePropName="checked"
            >
              <Switch />
            </Form.Item>
          </>
        )}

        {jobId && (
          <div className="mb-4">
            <Progress percent={progress} status="active" />
            <p className="text-center text-gray-500">
              {progress < 100 ? 'Preparing your export...' : 'Export complete!'}
            </p>
          </div>
        )}

        <Form.Item>
          <div className="flex justify-end gap-2">
            <Button onClick={onClose}>Cancel</Button>
            <Button
              type="primary"
              htmlType="submit"
              loading={loading}
              icon={loading ? <LoadingOutlined /> : <DownloadOutlined />}
            >
              Export
            </Button>
          </div>
        </Form.Item>
      </Form>
    </Modal>
  );
}; 