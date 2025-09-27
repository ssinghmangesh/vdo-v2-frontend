import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthState, User } from '@/types';
import { apiClient } from '@/lib/api';

interface AuthActions {
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  setUser: (user: User) => void;
  updateUser: (user: Partial<User>) => void;
  setLoading: (loading: boolean) => void;
  checkAuth: () => Promise<void>;
  updateProfile: (data: { name?: string; email?: string }) => Promise<boolean>;
  changePassword: (currentPassword: string, newPassword: string, confirmPassword: string) => Promise<boolean>;
}

export const useAuthStore = create<AuthState & AuthActions>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      login: async (email: string, password: string): Promise<boolean> => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.login({ email, password });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            // Convert API user format to frontend format
            const frontendUser: User = {
              id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            };
            
            set({
              user: frontendUser,
              token,
              isAuthenticated: true,
              isLoading: false
            });
            
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          console.error('Login failed:', error);
          set({ isLoading: false });
          return false;
        }
      },

      register: async (name: string, email: string, password: string): Promise<boolean> => {
        set({ isLoading: true });
        
        try {
          const response = await apiClient.register({ name, email, password });
          
          if (response.success && response.data) {
            const { user, token } = response.data;
            
            // Convert API user format to frontend format
            const frontendUser: User = {
              id: user._id,
              name: user.name,
              email: user.email,
              avatar: user.avatar,
            };
            
            set({
              user: frontendUser,
              token,
              isAuthenticated: true,
              isLoading: false
            });
            
            return true;
          } else {
            set({ isLoading: false });
            return false;
          }
        } catch (error) {
          console.error('Registration failed:', error);
          set({ isLoading: false });
          return false;
        }
      },

      logout: async () => {
        try {
          await apiClient.logout();
        } catch (error) {
          console.error('Logout API call failed:', error);
        } finally {
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      setUser: (user: User) => {
        set({ user, isAuthenticated: true });
      },

      updateUser: (updatedUser: Partial<User>) => {
        set((state) => ({
          user: state.user ? { ...state.user, ...updatedUser } : null,
        }));
      },

      setLoading: (loading: boolean) => {
        set({ isLoading: loading });
      },

      checkAuth: async () => {
        set({ isLoading: true });
        
        try {
          const token = get().token;
          
          if (token) {
            apiClient.setToken(token);
            const response = await apiClient.getProfile();
            
            if (response.success && response.data) {
              const frontendUser: User = {
                id: response.data._id,
                name: response.data.name,
                email: response.data.email,
                avatar: response.data.avatar,
              };
              
              set({
                user: frontendUser,
                token,
                isAuthenticated: true,
                isLoading: false
              });
            } else {
              // Token is invalid, clear it
              apiClient.clearToken();
              set({
                user: null,
                token: null,
                isAuthenticated: false,
                isLoading: false
              });
            }
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          apiClient.clearToken();
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false
          });
        }
      },

      updateProfile: async (data: { name?: string; email?: string }): Promise<boolean> => {
        try {
          const response = await apiClient.updateProfile(data);
          
          if (response.success && response.data) {
            const frontendUser: User = {
              id: response.data._id,
              name: response.data.name,
              email: response.data.email,
              avatar: response.data.avatar,
            };
            
            set({ user: frontendUser });
            return true;
          }
          
          return false;
        } catch (error) {
          console.error('Profile update failed:', error);
          return false;
        }
      },

      changePassword: async (currentPassword: string, newPassword: string, confirmPassword: string): Promise<boolean> => {
        try {
          const response = await apiClient.changePassword({
            currentPassword,
            newPassword,
            confirmPassword,
          });
          
          return response.success;
        } catch (error) {
          console.error('Password change failed:', error);
          return false;
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Set the token in apiClient when rehydrating from storage
        if (state?.token) {
          apiClient.setToken(state.token);
        }
      },
    }
  )
);
