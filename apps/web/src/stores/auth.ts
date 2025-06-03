import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import axios from 'axios';

interface User {
  id: string;
  email: string;
  name?: string;
  role: 'ADMIN' | 'USER';
  tenant: {
    id: string;
    name: string;
    slug: string;
  };
  org: {
    id: string;
    name: string;
    slug: string;
  };
}

interface AuthState {
  token: string | null;
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  updateUser: (user: User) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      token: null,
      user: null,
      login: async (email: string, password: string) => {
        const response = await axios.post('/api/auth/login', {
          email,
          password,
        });
        const { token, user } = response.data;
        set({ token, user });
        axios.defaults.headers.common['Authorization'] = `Bearer ${token}`;
      },
      logout: () => {
        set({ token: null, user: null });
        delete axios.defaults.headers.common['Authorization'];
      },
      updateUser: (user: User) => {
        set({ user });
      },
    }),
    {
      name: 'auth-storage',
    }
  )
); 