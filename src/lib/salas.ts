import { collection, doc, getDoc, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Sala, Partida } from "@/types";

export async function getSalas(): Promise<Sala[]> {
  const snap = await getDocs(collection(db, "salas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado !== "archivada")
    .map((d) => ({ id: d.id, ...d.data() } as Sala));
}

export async function getSala(id: string): Promise<Sala | null> {
  const snap = await getDoc(doc(db, "salas", id));
  if (!snap.exists() || snap.id === "_schema") return null;
  return { id: snap.id, ...snap.data() } as Sala;
}

export async function getPartidasDeSala(salaId: string): Promise<Partida[]> {
  const snap = await getDocs(collection(db, "salas", salaId, "partidas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado !== "cancelada")
    .map((d) => ({ id: d.id, ...d.data() } as Partida))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
