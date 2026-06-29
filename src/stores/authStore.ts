"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { AuthServiceError, loginWithDemoCredentials } from "@/services/authService";
import type { AuthUser } from "@/types/auth";

interface AuthState {
  user: AuthUser | null;
  isLoggingIn: boolean;
  loginWithCredentials: (username: string, password: string) => Promise<string | null>;
  logout: () => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoggingIn: false,

      loginWithCredentials: async (username, password) => {
        set({ isLoggingIn: true });
        try {
          const user = await loginWithDemoCredentials(username, password);
          set({ user, isLoggingIn: false });
          return null;
        } catch (error) {
          set({ isLoggingIn: false });
          if (error instanceof AuthServiceError) return error.message;
          return "로그인에 실패했습니다.";
        }
      },

      logout: () => set({ user: null, isLoggingIn: false }),
    }),
    {
      name: "odre-auth-store",
      partialize: (state) => ({ user: state.user }),
    },
  ),
);
