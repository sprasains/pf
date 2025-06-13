import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { api } from '../lib/api';
import { message } from 'antd';

// Temporary flag for development to bypass authentication
const DEV_MODE_AUTO_LOGIN = true;

interface User {
  id: string;
  email: string;
  role: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

interface AuthState {
  user: User | null;
  org: Organization | null;
  token: string | null;
  isLoading: boolean;
  error: string | null;
}

interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  switchOrg: (orgId: string) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    org: null,
    token: localStorage.getItem('token'),
    isLoading: true,
    error: null
  });

  const router = useRouter();

  const setAuthState = useCallback((newState: Partial<AuthState>) => {
    setState(prev => ({ ...prev, ...newState }));
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      const { data } = await api.post('/api/auth/login', { email, password });
      
      localStorage.setItem('token', data.token);
      setAuthState({
        user: data.user,
        org: data.org,
        token: data.token,
        isLoading: false
      });

      message.success('Login successful');
      router.push('/dashboard');
    } catch (err) {
      setAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Login failed'
      });
      message.error('Login failed');
      throw err;
    }
  }, [setAuthState, router]);

  const logout = useCallback(() => {
    localStorage.removeItem('token');
    setAuthState({
      user: null,
      org: null,
      token: null,
      isLoading: false
    });
    if (!DEV_MODE_AUTO_LOGIN) {
      router.push('/login');
    }
  }, [setAuthState, router]);

  const switchOrg = useCallback(async (orgId: string) => {
    try {
      setAuthState({ isLoading: true, error: null });
      const { data } = await api.post('/api/auth/orgs/switch', { orgId });
      
      localStorage.setItem('token', data.token);
      setAuthState({
        org: data.org,
        token: data.token,
        isLoading: false
      });

      message.success('Organization switched');
    } catch (err) {
      setAuthState({
        isLoading: false,
        error: err instanceof Error ? err.message : 'Failed to switch organization'
      });
      message.error('Failed to switch organization');
      throw err;
    }
  }, [setAuthState]);

  const refreshUser = useCallback(async () => {
    if (!state.token) {
      if (DEV_MODE_AUTO_LOGIN) {
        setAuthState({
          user: {
            id: 'dev-user-id',
            email: 'dev@example.com',
            role: 'ADMIN',
          },
          org: {
            id: 'dev-org-id',
            name: 'Development Organization',
            slug: 'dev-org',
          },
          token: 'dev-token',
          isLoading: false,
        });
      } else {
        setAuthState({ isLoading: false });
      }
      return;
    }

    try {
      setAuthState({ isLoading: true, error: null });
      const { data } = await api.get('/api/auth/me');
      
      setAuthState({
        user: data.user,
        org: data.org,
        isLoading: false
      });
    } catch (err) {
      if (err instanceof Error && err.message.includes('401')) {
        logout();
      } else {
        setAuthState({
          isLoading: false,
          error: err instanceof Error ? err.message : 'Failed to refresh user'
        });
      }
    }
  }, [state.token, setAuthState, logout]);

  // Set up API interceptor for token
  useEffect(() => {
    const interceptor = api.interceptors.request.use(config => {
      if (state.token) {
        config.headers.Authorization = `Bearer ${state.token}`;
      }
      return config;
    });

    return () => {
      api.interceptors.request.eject(interceptor);
    };
  }, [state.token]);

  // Refresh user on mount
  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const value = {
    ...state,
    login,
    logout,
    switchOrg,
    refreshUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 