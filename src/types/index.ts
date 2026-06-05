import { Timestamp } from "firebase/firestore";

export type Rol = "usuario" | "gestor" | "admin" | "superadmin";

export interface Usuario {
  uid: string;
  nick: string;
  nickNormalizado?: string;
  nombre?: string;
  email?: string;
  fotoUrl?: string;
  fotoOriginalUrl?: string;
  rol: Rol;
  pais?: string;
  provincia?: string;
  fechaCreacion: Timestamp;
  salasJugadas: number;
  bloqueado?: boolean;
}

export interface Sala {
  id: string;
  nombreSala: string;
  descripcion?: string;
  webOficial?: string;
  direccion: {
    calle?: string;
    numero?: string;
    ciudad?: string;
    provincia?: string;
    cp?: string;
    pais: string;
  };
  coordenadas: { lat: number; lng: number };
  duracionMinutos?: number;
  dificultad?: "facil" | "media" | "dificil";
  estado: "activa" | "cerrada" | "archivada";
  fechaCierre?: Timestamp;
  fechaCreacion: Timestamp;
  creadorId: string;
  imagenUrl?: string;
  imagenOriginalUrl?: string;
  fotosTotales: number;
  valoraciones: {
    mediaGeneral: number;     totalVotosGeneral: number;
    mediaJuegos: number;      totalVotosJuegos: number;
    mediaAmbientacion: number; totalVotosAmbientacion: number;
    mediaGamemaster: number;  totalVotosGamemaster: number;
    mediaMiedo: number;       totalVotosMiedo: number;
  };
}

export interface Partida {
  id: string;
  salaId: string;
  fecha: string;
  hora: string;
  fechaHoraInicio: Timestamp;
  duracionMinutos: number;
  estado: "borrador" | "confirmada" | "jugada" | "cancelada";
  creadorId: string;
  jugadoresConfirmados: string[];
  jugadoresPendientes: Array<{ nombre: string; uid?: string }>;
  plazasMax: number;
  notas?: string;
  fotosCount: number;
  votosCount: number;
  comentariosCount: number;
  invitacionToken?: string;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
}

export interface Comentario {
  id: string;
  usuarioId: string;
  texto: string;
  spoiler: string[];
  fecha: Timestamp;
}

export interface Ruta {
  id: string;
  nombre: string;
  descripcion?: string;
  creadorId: string;
  fechaCreacion: Timestamp;
  partidas: string[];
  jugadores: string[];
  estado: "borrador" | "confirmada" | "archivada";
  imagenUrl?: string;
}

export interface PeticionGestor {
  id: string;
  uid: string;
  nick: string;
  fotoUrl?: string;
  estado: "pendiente" | "aprobada" | "rechazada";
  fechaCreacion: Timestamp;
  fechaResolucion?: Timestamp;
  resueltoPor?: string;
}

export interface Voto {
  id: string;
  salaId: string;
  partidaId: string;
  usuarioId: string;
  valorGeneral: number | null;
  valorJuegos: number | null;
  valorAmbientacion: number | null;
  valorGamemaster: number | null;
  valorMiedo: number | null;
  fechaCreacion: Timestamp;
  fechaActualizacion: Timestamp;
  editableHasta: Timestamp;
  anulado: boolean;
  anuladoPor: string | null;
  fechaAnulacion: Timestamp | null;
}
