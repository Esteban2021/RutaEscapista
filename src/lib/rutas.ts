import {
  collection, doc, getDoc, getDocs, addDoc,
  updateDoc, serverTimestamp, query, where,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Ruta } from "@/types";

export interface CrearRutaInput {
  nombre: string;
  descripcion?: string;
  salaIds: string[];
  creadorId: string;
}

export async function crearRuta(input: CrearRutaInput): Promise<string> {
  const ref = await addDoc(collection(db, "rutas"), {
    nombre: input.nombre,
    descripcion: input.descripcion ?? "",
    creadorId: input.creadorId,
    partidas: input.salaIds,
    jugadores: [input.creadorId],
    estado: "borrador",
    imagenUrl: null,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });
  return ref.id;
}

export async function getRutas(): Promise<Ruta[]> {
  const snap = await getDocs(collection(db, "rutas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado !== "archivada")
    .map((d) => ({ id: d.id, ...d.data() } as Ruta));
}

export async function getRuta(id: string): Promise<Ruta | null> {
  const snap = await getDoc(doc(db, "rutas", id));
  if (!snap.exists() || snap.id === "_schema") return null;
  return { id: snap.id, ...snap.data() } as Ruta;
}

export async function getMisRutas(uid: string): Promise<Ruta[]> {
  const q = query(
    collection(db, "rutas"),
    where("jugadores", "array-contains", uid),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== "_schema")
    .map((d) => ({ id: d.id, ...d.data() } as Ruta));
}

export async function updateRuta(
  id: string,
  data: Partial<Pick<Ruta, "nombre" | "descripcion" | "estado" | "partidas">>,
): Promise<void> {
  await updateDoc(doc(db, "rutas", id), {
    ...data,
    fechaActualizacion: serverTimestamp(),
  });
}
