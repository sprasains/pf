import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { Card, Button, message, Spin } from 'antd';
import { motion } from 'framer-motion';
import { useWebSocket } from '../../hooks/useWebSocket';
import { useUserCredentials } from '../../hooks/useUserCredentials';
import { logWorkflowExecution } from '../../utils/api';
import { logger } from '../../utils/logger';

export default function WorkflowPage() {
  const router = useRouter();
  const { id } = router.query;
  const [executionId, setExecutionId] = useState<string | null>(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const { credentials, loading: credentialsLoading } = useUserCredentials(id as string);

  const { socket, connected, messages } = useWebSocket({
    onConnect: () => {
      logger.info('WebSocket connected', { workflowId: id });
    },
    onDisconnect: () => {
      logger.info('WebSocket disconnected', { workflowId: id });
    },
    onMessage: (message) => {
      logger.info('WebSocket message received', { message });
    },
  });

  useEffect(() => {
    if (id && connected) {
      socket?.send(JSON.stringify({
        type: 'subscribe',
        workflowId: id,
      }));
    }
  }, [id, connected, socket]);

  const handleExecute = async () => {
    try {
      setIsExecuting(true);
      const result = await logWorkflowExecution(id as string, {
        status: 'running',
        input_data: {},
        output_data: {},
      });
      setExecutionId(result.id);
      message.success('Workflow execution started');
      logger.info('Workflow execution started', { workflowId: id, executionId: result.id });
    } catch (error) {
      message.error('Failed to start workflow execution');
      logger.error('Error starting workflow execution', { error, workflowId: id });
    } finally {
      setIsExecuting(false);
    }
  };

  if (!id) {
    return <div>Loading...</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="p-6"
    >
      <div className="mb-6 flex justify-between items-center">
        <h1 className="text-2xl font-bold">Workflow Editor</h1>
        <Button
          type="primary"
          onClick={handleExecute}
          loading={isExecuting}
        >
          Execute
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card title="Workflow Details" className="md:col-span-2">
          {credentialsLoading ? (
            <Spin />
          ) : (
            <div>
              <h3 className="text-lg font-semibold mb-4">Available Credentials</h3>
              <ul className="space-y-2">
                {credentials.map((cred) => (
                  <li key={cred.id} className="flex items-center">
                    <span className="font-medium">{cred.name}</span>
                    <span className="ml-2 text-gray-500">({cred.type})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Card>

        <Card title="Execution Log" className="md:col-span-1">
          <div className="space-y-4">
            {messages.map((msg, index) => (
              <div
                key={index}
                className="p-2 bg-gray-50 rounded"
              >
                <pre className="text-sm">{JSON.stringify(msg, null, 2)}</pre>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </motion.div>
  );
} 