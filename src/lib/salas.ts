import {
  collection, doc, getDoc, getDocs,
  addDoc, serverTimestamp, GeoPoint,
} from "firebase/firestore";
import { db } from "./firebase";
import type { Sala, Partida } from "@/types";

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
