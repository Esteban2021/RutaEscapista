import {
  collection, doc, getDoc, getDocs,
  addDoc, updateDoc, serverTimestamp, GeoPoint,
  type DocumentData,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Sala, Partida } from "@/types";

function normalizeSala(id: string, data: DocumentData): Sala {
  const gp = data.coordenadas;
  return {
    id,
    ...data,
    coordenadas: {
      lat: gp?.latitude ?? gp?.lat ?? 0,
      lng: gp?.longitude ?? gp?.lng ?? 0,
    },
  } as Sala;
}

export interface EditarSalaInput {
  nombreSala?: string;
  descripcion?: string;
  webOficial?: string;
  ciudad?: string;
  provincia?: string;
  calle?: string;
  cp?: string;
  pais?: string;
  lat?: number;
  lng?: number;
  duracionMinutos?: number | null;
  dificultad?: "facil" | "media" | "dificil" | null;
  estado?: "activa" | "cerrada" | "archivada";
  imagenUrl?: string;
  imagenOriginalUrl?: string;
}

export interface CrearSalaInput {
  nombreSala: string;
  descripcion?: string;
  webOficial?: string;
  ciudad?: string;
  provincia?: string;
  calle?: string;
  cp?: string;
  pais: string;
  lat: number;
  lng: number;
  duracionMinutos?: number;
  dificultad?: "facil" | "media" | "dificil";
  creadorId: string;
}

export async function crearSala(input: CrearSalaInput): Promise<string> {
  const ref = await addDoc(collection(db, "salas"), {
    nombreSala: input.nombreSala,
    descripcion: input.descripcion ?? "",
    webOficial: input.webOficial ?? "",
    direccion: {
      calle: input.calle ?? "",
      ciudad: input.ciudad ?? "",
      provincia: input.provincia ?? "",
      cp: input.cp ?? "",
      pais: input.pais,
    },
    coordenadas: new GeoPoint(input.lat, input.lng),
    duracionMinutos: input.duracionMinutos ?? null,
    dificultad: input.dificultad ?? null,
    estado: "activa",
    fechaCierre: null,
    fechaCreacion: serverTimestamp(),
    creadorId: input.creadorId,
    fotosTotales: 0,
    valoraciones: {
      mediaGeneral: 0,      totalVotosGeneral: 0,
      mediaJuegos: 0,       totalVotosJuegos: 0,
      mediaAmbientacion: 0, totalVotosAmbientacion: 0,
      mediaGamemaster: 0,   totalVotosGamemaster: 0,
      mediaMiedo: 0,        totalVotosMiedo: 0,
    },
  });
  return ref.id;
}

export async function getSalas(): Promise<Sala[]> {
  const snap = await getDocs(collection(db, "salas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado !== "archivada")
    .map((d) => normalizeSala(d.id, d.data()));
}

export async function getSala(id: string): Promise<Sala | null> {
  const snap = await getDoc(doc(db, "salas", id));
  if (!snap.exists() || snap.id === "_schema") return null;
  return normalizeSala(snap.id, snap.data()!);
}

export async function updateSala(id: string, input: EditarSalaInput): Promise<void> {
  const payload: Record<string, unknown> = { fechaActualizacion: serverTimestamp() };
  if (input.nombreSala !== undefined) payload.nombreSala = input.nombreSala;
  if (input.descripcion !== undefined) payload.descripcion = input.descripcion;
  if (input.webOficial !== undefined) payload.webOficial = input.webOficial;
  if (input.duracionMinutos !== undefined) payload.duracionMinutos = input.duracionMinutos;
  if (input.dificultad !== undefined) payload.dificultad = input.dificultad;
  if (input.estado !== undefined) payload.estado = input.estado;
  if (input.lat !== undefined && input.lng !== undefined) {
    payload.coordenadas = new GeoPoint(input.lat, input.lng);
  }
  if (input.calle !== undefined) payload["direccion.calle"] = input.calle;
  if (input.ciudad !== undefined) payload["direccion.ciudad"] = input.ciudad;
  if (input.provincia !== undefined) payload["direccion.provincia"] = input.provincia;
  if (input.cp !== undefined) payload["direccion.cp"] = input.cp;
  if (input.pais !== undefined) payload["direccion.pais"] = input.pais;
  if (input.imagenUrl !== undefined) payload.imagenUrl = input.imagenUrl;
  if (input.imagenOriginalUrl !== undefined) payload.imagenOriginalUrl = input.imagenOriginalUrl;
  await updateDoc(doc(db, "salas", id), payload);
}

export async function getPartidasDeSala(salaId: string): Promise<Partida[]> {
  const snap = await getDocs(collection(db, "salas", salaId, "partidas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado !== "cancelada")
    .map((d) => ({ id: d.id, ...d.data() } as Partida))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}

export async function getPartidasCanceladasDeSala(salaId: string): Promise<Partida[]> {
  const snap = await getDocs(collection(db, "salas", salaId, "partidas"));
  return snap.docs
    .filter((d) => d.id !== "_schema" && d.data().estado === "cancelada")
    .map((d) => ({ id: d.id, ...d.data() } as Partida))
    .sort((a, b) => (a.fecha < b.fecha ? 1 : -1));
}
