import { useState, useCallback } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  addEdge,
  Connection,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion } from 'framer-motion';
import { MailOutlined, MessageOutlined, TableOutlined } from '@ant-design/icons';
import { logger } from '../../utils/logger';

// Custom node types with animations
const EmailNode = ({ data }: { data: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05, y: -5 }}
    className="bg-white rounded-xl p-4 shadow-soft border border-primary-100"
  >
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="w-10 h-10 bg-primary-100 rounded-lg flex items-center justify-center"
      >
        <MailOutlined className="text-primary-600 text-xl" />
      </motion.div>
      <div>
        <h3 className="font-medium text-gray-900">{data.label}</h3>
        <p className="text-sm text-gray-500">{data.description}</p>
      </div>
    </div>
  </motion.div>
);

const SlackNode = ({ data }: { data: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05, y: -5 }}
    className="bg-white rounded-xl p-4 shadow-soft border border-secondary-100"
  >
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="w-10 h-10 bg-secondary-100 rounded-lg flex items-center justify-center"
      >
        <MessageOutlined className="text-secondary-600 text-xl" />
      </motion.div>
      <div>
        <h3 className="font-medium text-gray-900">{data.label}</h3>
        <p className="text-sm text-gray-500">{data.description}</p>
      </div>
    </div>
  </motion.div>
);

const SheetsNode = ({ data }: { data: any }) => (
  <motion.div
    initial={{ opacity: 0, scale: 0.8 }}
    animate={{ opacity: 1, scale: 1 }}
    whileHover={{ scale: 1.05, y: -5 }}
    className="bg-white rounded-xl p-4 shadow-soft border border-success-100"
  >
    <div className="flex items-center gap-3">
      <motion.div
        whileHover={{ rotate: 360 }}
        transition={{ duration: 0.5 }}
        className="w-10 h-10 bg-success-100 rounded-lg flex items-center justify-center"
      >
        <TableOutlined className="text-success-600 text-xl" />
      </motion.div>
      <div>
        <h3 className="font-medium text-gray-900">{data.label}</h3>
        <p className="text-sm text-gray-500">{data.description}</p>
      </div>
    </div>
  </motion.div>
);

const nodeTypes = {
  email: EmailNode,
  slack: SlackNode,
  sheets: SheetsNode,
};

const initialNodes: Node[] = [
  {
    id: '1',
    type: 'email',
    position: { x: 100, y: 100 },
    data: {
      label: 'Email Trigger',
      description: 'When a new email arrives',
    },
  },
  {
    id: '2',
    type: 'slack',
    position: { x: 400, y: 100 },
    data: {
      label: 'Slack Notification',
      description: 'Send message to channel',
    },
  },
  {
    id: '3',
    type: 'sheets',
    position: { x: 700, y: 100 },
    data: {
      label: 'Google Sheets',
      description: 'Update spreadsheet',
    },
  },
];

const initialEdges: Edge[] = [
  {
    id: 'e1-2',
    source: '1',
    target: '2',
    animated: true,
    style: { stroke: '#3b82f6' },
  },
  {
    id: 'e2-3',
    source: '2',
    target: '3',
    animated: true,
    style: { stroke: '#3b82f6' },
  },
];

const WorkflowBuilder = () => {
  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  const onConnect = useCallback(
    (params: Connection) => {
      logger.info('New connection created', params);
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            animated: true,
            style: { stroke: '#3b82f6' },
          },
          eds
        )
      );
    },
    [setEdges]
  );

  return (
    <div className="h-[600px] bg-gradient-to-br from-primary-50 to-secondary-50 rounded-2xl p-6 shadow-soft relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <motion.div
          className="absolute -top-24 -left-24 w-48 h-48 bg-primary-200 rounded-full opacity-20"
          animate={{
            scale: [1, 1.2, 1],
            rotate: [0, 90, 0],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
        <motion.div
          className="absolute -bottom-24 -right-24 w-48 h-48 bg-secondary-200 rounded-full opacity-20"
          animate={{
            scale: [1.2, 1, 1.2],
            rotate: [90, 0, 90],
          }}
          transition={{
            duration: 8,
            repeat: Infinity,
            ease: "easeInOut"
          }}
        />
      </div>

      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        nodeTypes={nodeTypes}
        fitView
        className="bg-transparent"
      >
        <Background color="#94a3b8" gap={16} size={1} />
        <Controls className="bg-white rounded-lg shadow-soft" />
      </ReactFlow>
    </div>
  );
};

export default WorkflowBuilder; 