import { useState, useEffect } from 'react';
import { getCredentialsForWorkflow, logCredentialUsage } from '../utils/api';
import { logger } from '../utils/logger';

interface Credential {
  id: string;
  name: string;
  type: string;
}

export const useUserCredentials = (workflowId: string) => {
  const [credentials, setCredentials] = useState<Credential[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    const fetchCredentials = async () => {
      try {
        setLoading(true);
        const data = await getCredentialsForWorkflow(workflowId);
        setCredentials(data);
        logger.info('Credentials fetched successfully', { workflowId });
      } catch (err) {
        setError(err instanceof Error ? err : new Error('Failed to fetch credentials'));
        logger.error('Error fetching credentials', { error: err });
      } finally {
        setLoading(false);
      }
    };

    if (workflowId) {
      fetchCredentials();
    }
  }, [workflowId]);

  const logUsage = async (credentialId: string, executionId: string) => {
    try {
      await logCredentialUsage({
        credential_id: credentialId,
        workflow_id: workflowId,
        execution_id: executionId,
      });
      logger.info('Credential usage logged successfully', {
        credentialId,
        workflowId,
        executionId,
      });
    } catch (err) {
      logger.error('Error logging credential usage', { error: err });
      throw err;
    }
  };

  return { credentials, loading, error, logUsage };
}; 