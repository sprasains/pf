import { useState } from 'react';
import { Card, Button, Menu, Dropdown, message } from 'antd';
import { MoreOutlined, CopyOutlined, DeleteOutlined, TemplateOutlined } from '@ant-design/icons';
import { motion } from 'framer-motion';
import { cloneWorkflow, archiveWorkflow, createTemplateFromWorkflow } from '../utils/api';
import { logger } from '../utils/logger';
import { useRouter } from 'next/router';

interface WorkflowCardProps {
  id: string;
  name: string;
  description: string;
  isTemplate?: boolean;
  isArchived?: boolean;
  onUpdate?: () => void;
}

export const WorkflowCard = ({
  id,
  name,
  description,
  isTemplate = false,
  isArchived = false,
  onUpdate,
}: WorkflowCardProps) => {
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleClone = async () => {
    try {
      setLoading(true);
      await cloneWorkflow(id);
      message.success('Workflow cloned successfully');
      logger.info('Workflow cloned', { workflowId: id });
      onUpdate?.();
    } catch (error) {
      message.error('Failed to clone workflow');
      logger.error('Error cloning workflow', { error, workflowId: id });
    } finally {
      setLoading(false);
    }
  };

  const handleArchive = async () => {
    try {
      setLoading(true);
      await archiveWorkflow(id);
      message.success('Workflow archived successfully');
      logger.info('Workflow archived', { workflowId: id });
      onUpdate?.();
    } catch (error) {
      message.error('Failed to archive workflow');
      logger.error('Error archiving workflow', { error, workflowId: id });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTemplate = async () => {
    try {
      setLoading(true);
      await createTemplateFromWorkflow(id);
      message.success('Template created successfully');
      logger.info('Template created from workflow', { workflowId: id });
      onUpdate?.();
    } catch (error) {
      message.error('Failed to create template');
      logger.error('Error creating template', { error, workflowId: id });
    } finally {
      setLoading(false);
    }
  };

  const menu = (
    <Menu>
      <Menu.Item key="clone" icon={<CopyOutlined />} onClick={handleClone}>
        Clone
      </Menu.Item>
      <Menu.Item key="archive" icon={<DeleteOutlined />} onClick={handleArchive}>
        {isArchived ? 'Unarchive' : 'Archive'}
      </Menu.Item>
      <Menu.Item key="template" icon={<TemplateOutlined />} onClick={handleCreateTemplate}>
        Create Template
      </Menu.Item>
    </Menu>
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      whileHover={{ scale: 1.02 }}
      transition={{ duration: 0.2 }}
    >
      <Card
        hoverable
        className="w-full h-full"
        actions={[
          <Button
            key="edit"
            type="link"
            onClick={() => router.push(`/workflows/${id}`)}
          >
            Edit
          </Button>,
          <Dropdown key="more" overlay={menu} trigger={['click']}>
            <Button type="text" icon={<MoreOutlined />} />
          </Dropdown>,
        ]}
      >
        <Card.Meta
          title={name}
          description={description}
          className="mb-4"
        />
        {isTemplate && (
          <div className="text-sm text-blue-500">Template</div>
        )}
        {isArchived && (
          <div className="text-sm text-gray-500">Archived</div>
        )}
      </Card>
    </motion.div>
  );
}; 