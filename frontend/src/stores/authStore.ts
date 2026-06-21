import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { User, Session } from '@supabase/supabase-js';

interface AuthState {
  user: User | null;
  session: Session | null;
  isAuthenticated: boolean;
  setAuth: (user: User | null, session: Session | null) => void;
  clearAuth: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      session: null,
      isAuthenticated: false,
      setAuth: (user, session) => 
        set({ 
          user, 
          session, 
          isAuthenticated: !!user 
        }),
      clearAuth: () => 
        set({ 
          user: null, 
          session: null, 
          isAuthenticated: false 
        }),
    }),
    {
      name: 'travelmate-auth',
    }
  )
);
