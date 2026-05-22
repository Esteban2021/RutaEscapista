import {
  collection, collectionGroup, doc, getDoc, addDoc,
  updateDoc, arrayUnion, arrayRemove, query, where, getDocs,
  serverTimestamp, Timestamp,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Partida } from "@/types";

export interface CrearPartidaInput {
  salaId: string;
  fecha: string;
  hora: string;
  plazasMax: number;
  notas?: string;
  jugadoresPendientes?: string[];
  estado: "borrador" | "confirmada";
  creadorId: string;
}

export async function crearPartida(input: CrearPartidaInput): Promise<string> {
  const [y, m, d] = input.fecha.split("-").map(Number);
  const [h, min] = input.hora.split(":").map(Number);
  const fechaHoraInicio = Timestamp.fromDate(new Date(y, m - 1, d, h, min));

  const ref = await addDoc(collection(db, "salas", input.salaId, "partidas"), {
    salaId: input.salaId,
    fecha: input.fecha,
    hora: input.hora,
    fechaHoraInicio,
    duracionMinutos: 0,
    estado: input.estado,
    creadorId: input.creadorId,
    jugadoresConfirmados: [input.creadorId],
    jugadoresPendientes: (input.jugadoresPendientes ?? []).map((n) => ({ nombre: n })),
    plazasMax: input.plazasMax,
    notas: input.notas ?? "",
    fotosCount: 0,
    votosCount: 0,
    comentariosCount: 0,
    fechaCreacion: serverTimestamp(),
    fechaActualizacion: serverTimestamp(),
  });
  return ref.id;
}

export async function getPartida(salaId: string, partidaId: string): Promise<Partida | null> {
  const snap = await getDoc(doc(db, "salas", salaId, "partidas", partidaId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Partida;
}

export async function joinPartida(salaId: string, partidaId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "salas", salaId, "partidas", partidaId), {
    jugadoresConfirmados: arrayUnion(uid),
    fechaActualizacion: serverTimestamp(),
  });
}

export async function leavePartida(salaId: string, partidaId: string, uid: string): Promise<void> {
  await updateDoc(doc(db, "salas", salaId, "partidas", partidaId), {
    jugadoresConfirmados: arrayRemove(uid),
    fechaActualizacion: serverTimestamp(),
  });
}

export async function getMisPartidas(uid: string): Promise<Partida[]> {
  const q = query(
    collectionGroup(db, "partidas"),
    where("jugadoresConfirmados", "array-contains", uid),
  );
  const snap = await getDocs(q);
  return snap.docs
    .filter((d) => d.id !== "_schema")
    .map((d) => ({ id: d.id, ...d.data() } as Partida))
    .sort((a, b) => (a.fecha > b.fecha ? -1 : 1));
}

export async function updateEstadoPartida(
  salaId: string,
  partidaId: string,
  estado: Partida["estado"],
): Promise<void> {
  await updateDoc(doc(db, "salas", salaId, "partidas", partidaId), {
    estado,
    fechaActualizacion: serverTimestamp(),
  });
}
