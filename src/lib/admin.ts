import {
  collection, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PeticionGestor } from "@/types";

export async function crearPeticionGestor(uid: string, nick: string, fotoUrl?: string): Promise<void> {
  await addDoc(collection(db, "peticionesGestor"), {
    uid,
    nick,
    fotoUrl: fotoUrl ?? null,
    estado: "pendiente",
    fechaCreacion: serverTimestamp(),
    fechaResolucion: null,
    resueltoPor: null,
  });
}

export async function getMiPeticionGestor(uid: string): Promise<PeticionGestor | null> {
  const q = query(
    collection(db, "peticionesGestor"),
    where("uid", "==", uid),
    where("estado", "==", "pendiente"),
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as PeticionGestor;
}

export async function getPeticionesGestor(
  estado?: "pendiente" | "aprobada" | "rechazada",
): Promise<PeticionGestor[]> {
  const constraints = estado
    ? [where("estado", "==", estado), orderBy("fechaCreacion", "desc")]
    : [orderBy("fechaCreacion", "desc")];
  const q = query(collection(db, "peticionesGestor"), ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() } as PeticionGestor));
}

export async function aprobarPeticion(petId: string, uid: string, adminUid: string): Promise<void> {
  const batch = writeBatch(db);
  batch.update(doc(db, "peticionesGestor", petId), {
    estado: "aprobada",
    fechaResolucion: serverTimestamp(),
    resueltoPor: adminUid,
  });
  batch.update(doc(db, "usuarios", uid), { rol: "gestor" });
  await batch.commit();
}

export async function rechazarPeticion(petId: string, adminUid: string): Promise<void> {
  await updateDoc(doc(db, "peticionesGestor", petId), {
    estado: "rechazada",
    fechaResolucion: serverTimestamp(),
    resueltoPor: adminUid,
  });
}

export async function getStats(): Promise<{
  totalUsuarios: number;
  totalSalas: number;
  totalPartidas: number;
  totalRutas: number;
}> {
  const snap = await getDoc(doc(db, "estadisticas", "general"));
  if (!snap.exists()) return { totalUsuarios: 0, totalSalas: 0, totalPartidas: 0, totalRutas: 0 };
  const d = snap.data();
  return {
    totalUsuarios: d.totalUsuarios ?? 0,
    totalSalas: d.totalSalas ?? 0,
    totalPartidas: d.totalPartidas ?? 0,
    totalRutas: d.totalRutas ?? 0,
  };
}
