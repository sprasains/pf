import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { api } from '../lib/api';
import { useSnackbar } from 'notistack';

interface UserPreference {
  theme: 'LIGHT' | 'DARK';
  layout: 'GRID' | 'LIST';
  defaultWorkspaceId?: string;
}

interface UserActivity {
  id: string;
  actionType: string;
  context: any;
  timestamp: string;
}

interface UIConfig {
  preferences: UserPreference;
  recentWorkflows: any[];
}

interface UserExperienceContextType {
  preferences: UserPreference | null;
  isLoading: boolean;
  error: string | null;
  setPreference: (preference: Partial<UserPreference>) => Promise<void>;
  logActivity: (action: string, context: any) => Promise<void>;
  recentActivities: UserActivity[];
  fetchRecentActivities: (limit?: number) => Promise<void>;
  resetPreferences: () => Promise<void>;
}

const defaultPreferences: UserPreference = {
  theme: 'LIGHT',
  layout: 'GRID'
};

const UserExperienceContext = createContext<UserExperienceContextType | undefined>(undefined);

export function UserExperienceProvider({ children }: { children: React.ReactNode }) {
  const [preferences, setPreferences] = useState<UserPreference | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentActivities, setRecentActivities] = useState<UserActivity[]>([]);
  const { enqueueSnackbar } = useSnackbar();

  const fetchPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get('/api/user/preferences');
      setPreferences(data);
      // Sync with localStorage
      localStorage.setItem('userPreferences', JSON.stringify(data));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences');
      // Fallback to localStorage if available
      const stored = localStorage.getItem('userPreferences');
      if (stored) {
        setPreferences(JSON.parse(stored));
      }
    } finally {
      setIsLoading(false);
    }
  }, []);

  const setPreference = useCallback(async (preference: Partial<UserPreference>) => {
    try {
      setIsLoading(true);
      setError(null);
      const updatedPreferences = { ...preferences, ...preference };
      await api.post('/api/user/preferences', updatedPreferences);
      setPreferences(updatedPreferences);
      // Sync with localStorage
      localStorage.setItem('userPreferences', JSON.stringify(updatedPreferences));
      enqueueSnackbar('Preferences updated successfully', { variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update preferences');
      enqueueSnackbar('Failed to update preferences', { variant: 'error' });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [preferences, enqueueSnackbar]);

  const logActivity = useCallback(async (action: string, context: any) => {
    try {
      await api.post('/api/user/activity', { action, context });
    } catch (err) {
      console.error('Failed to log activity:', err);
    }
  }, []);

  const fetchRecentActivities = useCallback(async (limit: number = 10) => {
    try {
      setIsLoading(true);
      setError(null);
      const { data } = await api.get(`/api/user/activity?limit=${limit}`);
      setRecentActivities(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to fetch activities');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const resetPreferences = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      await api.post('/api/user/preferences', defaultPreferences);
      setPreferences(defaultPreferences);
      // Sync with localStorage
      localStorage.setItem('userPreferences', JSON.stringify(defaultPreferences));
      enqueueSnackbar('Preferences reset to default', { variant: 'success' });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reset preferences');
      enqueueSnackbar('Failed to reset preferences', { variant: 'error' });
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, [enqueueSnackbar]);

  // Load preferences on mount
  useEffect(() => {
    fetchPreferences();
  }, [fetchPreferences]);

  const value = {
    preferences,
    isLoading,
    error,
    setPreference,
    logActivity,
    recentActivities,
    fetchRecentActivities,
    resetPreferences
  };

  return (
    <UserExperienceContext.Provider value={value}>
      {children}
    </UserExperienceContext.Provider>
  );
}

export function useUserExperience() {
  const context = useContext(UserExperienceContext);
  if (context === undefined) {
    throw new Error('useUserExperience must be used within a UserExperienceProvider');
  }
  return context;
} 