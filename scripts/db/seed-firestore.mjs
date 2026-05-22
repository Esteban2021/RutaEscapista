import { config } from "dotenv";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";

config({ path: ".env.local" });

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
    }),
  });
}

// Si tu base de datos NO se llama "(default)", añade a .env.local:
// FIREBASE_DATABASE_ID=nombre-de-tu-base-de-datos
const db = process.env.FIREBASE_DATABASE_ID
  ? getFirestore(process.env.FIREBASE_DATABASE_ID)
  : getFirestore();

// 1. USUARIOS
await db.collection("usuarios").doc("_schema").set({
  nick: "",
  avatarUrl: "",
  pais: "",
  provincia: "",
  fechaCreacion: admin.firestore.Timestamp.now(),
  ultConexion: admin.firestore.Timestamp.now(),
  tokensPush: [],
  partidasJugador: [],
  rutasJugador: [],
});
console.log("✅ usuarios");

// 2. SALAS
await db.collection("salas").doc("_schema").set({
  nombre: "",
  descripcion: "",
  imagenUrl: "",
  pais: "",
  provincia: "",
  direccion: { calle: "", ciudad: "", cp: "" },
  geolocalizacion: new admin.firestore.GeoPoint(0, 0),
  dificultad: "fácil",
  creadorId: "",
  fechaCreacion: admin.firestore.Timestamp.now(),
  estado: "activa",
  mediaJugadores: 0,
});
console.log("✅ salas");

// 2a. PARTIDAS (subcolección de salas)
await db.collection("salas").doc("_schema").collection("partidas").doc("_schema").set({
  fecha: admin.firestore.Timestamp.now(),
  titulo: "",
  privado: false,
  creadorId: "",
  estado: "activa",
  jugadoresConfirmados: [],
  jugadoresPendientes: [],
  plazasMax: 0,
  notas: "",
  tiempoCreacion: admin.firestore.Timestamp.now(),
});
console.log("✅ salas/_schema/partidas");

// 2b. COMENTARIOS (subcolección de partidas)
await db
  .collection("salas").doc("_schema")
  .collection("partidas").doc("_schema")
  .collection("comentarios").doc("_schema")
  .set({
    userId: "",
    texto: "",
    spoiler: [],
    fecha: admin.firestore.Timestamp.now(),
  });
console.log("✅ salas/_schema/partidas/_schema/comentarios");

// 3. RUTAS
await db.collection("rutas").doc("_schema").set({
  nombre: "",
  descripcion: "",
  creadorId: "",
  fechaCreacion: admin.firestore.Timestamp.now(),
  partidas: [],
  jugadores: [],
  dificultad: "",
  estado: "activa",
  imagenUrl: "",
});
console.log("✅ rutas");

// 4. REPORTES
await db.collection("reportes").doc("_schema").set({
  tipo: "bug",
  descripcion: "",
  userId: "",
  fecha: admin.firestore.Timestamp.now(),
  referencia: { tipo: "", id: "" },
});
console.log("✅ reportes");

// 5. NOTIFICACIONES
await db.collection("notificaciones").doc("_schema").set({
  userId: "",
  tipo: "",
  mensaje: "",
  fecha: admin.firestore.Timestamp.now(),
  leida: false,
});
console.log("✅ notificaciones");

// 6. ESTADÍSTICAS
await db.collection("estadisticas").doc("general").set({
  totalUsuarios: 0,
  totalSalas: 0,
  totalPartidas: 0,
  totalRutas: 0,
  actividadDiaria: {},
  dificultadPreferida: {},
});
console.log("✅ estadisticas/general");

console.log("\n🎉 Todas las colecciones creadas correctamente");
