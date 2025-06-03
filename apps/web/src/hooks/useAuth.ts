import { useState, useEffect } from 'react';

interface AuthState {
  token: string | null;
  isAuthenticated: boolean;
  user: {
    id: string;
    email: string;
    name: string;
    role: 'user' | 'admin';
  } | null;
}

export function useAuth() {
  const [authState, setAuthState] = useState<AuthState>({
    token: null,
    isAuthenticated: false,
    user: null,
  });

  useEffect(() => {
    // Check for token in localStorage
    const token = localStorage.getItem('token');
    if (token) {
      // TODO: Validate token with backend
      // For now, we'll just set it
      setAuthState({
        token,
        isAuthenticated: true,
        user: {
          id: '1', // This should come from the backend
          email: 'user@example.com', // This should come from the backend
          name: 'User', // This should come from the backend
          role: 'user', // This should come from the backend
        },
      });
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      // TODO: Implement actual login API call
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      if (!response.ok) {
        throw new Error('Login failed');
      }

      const data = await response.json();
      localStorage.setItem('token', data.token);
      setAuthState({
        token: data.token,
        isAuthenticated: true,
        user: data.user,
      });
    } catch (error) {
      console.error('Login error:', error);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setAuthState({
      token: null,
      isAuthenticated: false,
      user: null,
    });
  };

  return {
    ...authState,
    login,
    logout,
  };
} 