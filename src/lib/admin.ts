import {
  collection, collectionGroup, doc, addDoc, updateDoc, getDoc, getDocs,
  query, where, orderBy, serverTimestamp, writeBatch,
} from "firebase/firestore";
import { db } from "./firebase";
import type { PeticionGestor, Rol, Usuario } from "@/types";

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

export async function getUsuarios(): Promise<Usuario[]> {
  const snap = await getDocs(collection(db, "usuarios"));
  return snap.docs
    .filter((d) => d.id !== "_schema")
    .map((d) => ({ uid: d.id, ...d.data() } as Usuario))
    .sort((a, b) => (a.nick ?? "").localeCompare(b.nick ?? "", "es"));
}

export async function updateUserRol(uid: string, rol: Rol): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { rol });
}

export async function toggleUserBloqueo(uid: string, bloqueado: boolean): Promise<void> {
  await updateDoc(doc(db, "usuarios", uid), { bloqueado });
}

export async function getStats(): Promise<{
  totalUsuarios: number;
  totalSalas: number;
  totalPartidas: number;
  totalRutas: number;
}> {
  const [usuariosSnap, salasSnap, rutasSnap, partidasSnap] = await Promise.all([
    getDocs(collection(db, "usuarios")),
    getDocs(collection(db, "salas")),
    getDocs(collection(db, "rutas")),
    getDocs(collectionGroup(db, "partidas")),
  ]);
  return {
    totalUsuarios: usuariosSnap.docs.filter((d) => d.id !== "_schema").length,
    totalSalas: salasSnap.docs.filter((d) => d.id !== "_schema").length,
    totalPartidas: partidasSnap.docs.filter((d) => d.id !== "_schema").length,
    totalRutas: rutasSnap.docs.filter((d) => d.id !== "_schema").length,
  };
}
