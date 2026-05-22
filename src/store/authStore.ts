import { create } from "zustand";
import { User } from "firebase/auth";
import type { Usuario } from "@/types";

interface AuthState {
  user: User | null;
  perfil: Usuario | null;
  loading: boolean;
  setUser: (user: User | null) => void;
  setPerfil: (perfil: Usuario | null) => void;
  setLoading: (loading: boolean) => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  perfil: null,
  loading: true,
  setUser: (user) => set({ user }),
  setPerfil: (perfil) => set({ perfil }),
  setLoading: (loading) => set({ loading }),
}));
