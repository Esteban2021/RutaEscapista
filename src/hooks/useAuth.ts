import { useEffect } from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { getOrCreatePerfil } from "@/lib/usuarios";

export function useAuth() {
  const { user, perfil, loading, setUser, setPerfil, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        const token = await firebaseUser.getIdToken();
        document.cookie = `firebase-token=${token}; path=/`;
        const perfil = await getOrCreatePerfil(firebaseUser.uid);
        setUser(firebaseUser);
        setPerfil(perfil);
      } else {
        document.cookie = "firebase-token=; path=/; max-age=0";
        setUser(null);
        setPerfil(null);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, [setUser, setPerfil, setLoading]);

  return { user, perfil, loading };
}
