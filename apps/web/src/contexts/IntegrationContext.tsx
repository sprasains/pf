import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useSnackbar } from 'notistack';
import { integrationProviders } from '@pumpflix/api/config/integrations';

interface Credential {
  id: string;
  provider: string;
  label: string;
  credentials: any;
  createdAt: string;
  updatedAt: string;
  scopes?: string[];
  expiresAt?: string;
}

interface IntegrationContextType {
  credentials: Record<string, Credential[]>;
  loading: boolean;
  error: string | null;
  refreshCredentials: () => Promise<void>;
  getCredentialsByProvider: (providerId: string) => Credential[];
  isCredentialExpired: (credential: Credential) => boolean;
}

const IntegrationContext = createContext<IntegrationContextType | undefined>(undefined);

export const IntegrationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [credentials, setCredentials] = useState<Record<string, Credential[]>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { enqueueSnackbar } = useSnackbar();

  const fetchCredentials = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/integrations/credentials');
      if (!response.ok) throw new Error('Failed to fetch credentials');
      const data: Credential[] = await response.json();
      
      // Group credentials by provider
      const groupedCredentials = data.reduce((acc, credential) => {
        if (!acc[credential.provider]) {
          acc[credential.provider] = [];
        }
        acc[credential.provider].push(credential);
        return acc;
      }, {} as Record<string, Credential[]>);

      setCredentials(groupedCredentials);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      enqueueSnackbar('Failed to fetch credentials', { variant: 'error' });
    } finally {
      setLoading(false);
    }
  }, [enqueueSnackbar]);

  useEffect(() => {
    fetchCredentials();
  }, [fetchCredentials]);

  const getCredentialsByProvider = useCallback((providerId: string) => {
    return credentials[providerId] || [];
  }, [credentials]);

  const isCredentialExpired = useCallback((credential: Credential) => {
    if (!credential.expiresAt) return false;
    return new Date(credential.expiresAt) < new Date();
  }, []);

  const value = {
    credentials,
    loading,
    error,
    refreshCredentials: fetchCredentials,
    getCredentialsByProvider,
    isCredentialExpired
  };

  return (
    <IntegrationContext.Provider value={value}>
      {children}
    </IntegrationContext.Provider>
  );
};

export const useIntegration = (providerId?: string) => {
  const context = useContext(IntegrationContext);
  if (!context) {
    throw new Error('useIntegration must be used within an IntegrationProvider');
  }

  if (providerId) {
    return {
      ...context,
      credentials: context.getCredentialsByProvider(providerId)
    };
  }

  return context;
}; 