import { doc, getDoc, setDoc, updateDoc, serverTimestamp, collection, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "./firebase";
import type { Usuario } from "@/types";

export function normalizeNick(nick: string): string {
  return nick
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}

export async function getPerfil(uid: string): Promise<Usuario | null> {
  const snap = await getDoc(doc(db, "usuarios", uid));
  if (!snap.exists()) return null;
  return { uid, ...snap.data() } as Usuario;
}

export async function getOrCreatePerfil(uid: string): Promise<Usuario> {
  const existing = await getPerfil(uid);
  if (existing) {
    // Migracion lazy: usuarios creados antes del campo nickNormalizado
    if (existing.nick && !existing.nickNormalizado) {
      const nickNormalizado = normalizeNick(existing.nick);
      await updateDoc(doc(db, "usuarios", uid), { nickNormalizado });
      return { ...existing, nickNormalizado };
    }
    return existing;
  }

  const nuevo = {
    nick: "",
    nickNormalizado: "",
    rol: "usuario" as const,
    salasJugadas: 0,
    fechaCreacion: serverTimestamp(),
  };

  await setDoc(doc(db, "usuarios", uid), nuevo);
  return { uid, ...nuevo, fechaCreacion: null } as unknown as Usuario;
}

export async function buscarUsuariosPorNick(nick: string): Promise<Usuario[]> {
  if (nick.trim().length < 2) return [];
  const term = normalizeNick(nick);
  const q = query(
    collection(db, "usuarios"),
    where("nickNormalizado", ">=", term),
    where("nickNormalizado", "<=", term + ""),
    limit(8),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.data().nick)
    .map((d) => ({ uid: d.id, ...d.data() } as Usuario));
}

export async function updatePerfil(
  uid: string,
  data: Partial<Pick<Usuario, "nick" | "nombre" | "pais" | "provincia" | "fotoUrl" | "fotoOriginalUrl">>
): Promise<void> {
  const payload: Record<string, unknown> = { ...data };
  if (data.nick !== undefined) {
    payload.nickNormalizado = normalizeNick(data.nick);
  }
  await updateDoc(doc(db, "usuarios", uid), payload);
}