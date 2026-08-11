"use client";

import { create } from "zustand";

export type AuthUser = {
  id: string;
  email: string;
};

type AuthState = {
  user: AuthUser | null;
  ready: boolean;
  setUser: (user: AuthUser | null) => void;
  setReady: (ready: boolean) => void;
};

export const useAuthStore = create<AuthState>()((set) => ({
  user: null,
  ready: false,
  setUser: (user) => set({ user }),
  setReady: (ready) => set({ ready }),
}));
