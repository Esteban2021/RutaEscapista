import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";
import type { Usuario } from "@/types";

export async function getPerfil(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Usuario;
}

export async function getOrCreatePerfil(uid: string): Promise<Usuario> {
  const existing = await getPerfil(uid);
  if (existing) return existing;

  const nuevo = {
    nick: "",
    rol: "usuario" as const,
    salasJugadas: 0,
    fechaCreacion: serverTimestamp(),
  };

  await setDoc(doc(db, "usuarios", uid), nuevo);
  return { uid, ...nuevo, fechaCreacion: null } as unknown as Usuario;
}

export async function updatePerfil(
  uid: string,
  data: Partial<Pick<Usuario, "nick" | "nombre" | "pais" | "provincia" | "fotoUrl">>
): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), data);
}
