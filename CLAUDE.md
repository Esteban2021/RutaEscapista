# CLAUDE.md — RutaEscapista

Documento de referencia para el desarrollo. Actualizar cuando cambie el stack, la arquitectura o las convenciones.

---

## Visión general

**RutaEscapista** es una plataforma web para registrar, organizar y valorar partidas de escape room.

- **Sala**: establecimiento físico de escape room (entidad base)
- **Partida**: sesión concreta en una sala (fecha, jugadores, estado)
- **Ruta**: itinerario de varias partidas en distintas salas, jugadas de forma consecutiva
- **Usuario**: jugador con perfil, historial y rol

Análisis funcional completo: [`docs/RutaEscapista_Analisis_Funcional.md`](docs/RutaEscapista_Analisis_Funcional.md)

> ⚠️ El análisis fue generado pensando en **Vue + GitHub Pages**. La implementación real usa **Next.js + Firebase Hosting**. Ignorar todas las referencias a Vue Router, el parche `404.html`, y el deploy en GitHub Pages.

---

## Stack técnico

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Lenguaje | TypeScript |
| Estilos | Tailwind CSS |
| Estado cliente | Zustand (auth) + React Query (`@tanstack/react-query`) |
| Formularios | react-hook-form + zod |
| Auth | Firebase Authentication (email+contraseña; Google login pendiente) |
| Base de datos | Firestore — project: `rutas-punt0defuga`, database: `punt0defuga` |
| Storage | Firebase Storage |
| Iconos | Lucide React (instalado) |
| Hosting objetivo | Firebase Hosting |

---

## Comandos esenciales

```bash
npm run dev        # Dev server (abre Chrome automáticamente en scripts/dev.js)
npm run build      # Build producción
npm run db:schema  # Inicializa colecciones en Firestore (ya ejecutado una vez)
npm run db:seed        # Seed de datos de prueba (actualmente comentado)
npm run rules:deploy   # Publica firestore.rules y storage.rules en Firebase
npm run rules:get      # Descarga y muestra las reglas actualmente desplegadas
```

---

## Roles y jerarquía

```
Superadmin > Admin > Gestor de Partidas > Usuario
```

Los roles superiores incluyen todos los permisos de los inferiores.

| Rol | Valor en `rol` | Cómo se asigna |
|---|---|---|
| Superadmin | `'superadmin'` | Manual en consola Firebase |
| Admin | `'admin'` | Manual o por superadmin |
| Gestor | `'gestor'` | Solicitud aprobada (`peticionesGestor`) |
| Usuario | `'usuario'` (o ausente) | Al registrarse |

**Campo en Firestore**: `usuarios/{uid}.rol` — string simple (`'usuario' | 'gestor' | 'admin' | 'superadmin'`).
Las reglas usan `get(...).data.rol in ['admin','superadmin']`.

Ver tabla completa de permisos en [`docs/`](docs/RutaEscapista_Analisis_Funcional.md#2-roles-y-permisos) §2.

---

## Estructura de Firestore

```
usuarios/{uid}
salas/{salaId}
  └── partidas/{partidaId}          ← subcolección: no existe sin sala
        └── comentarios/{comentarioId}  ← subcolección: no existe sin partida
votos/{votoId}                      ← colección raíz (una por usuario por partida)
rutas/{rutaId}
invitaciones/{invId}
peticionesGestor/{petId}
notificaciones/{id}
reportes/{id}
estadisticas/general                ← documento único
```

`partidas` y `comentarios` son subcolecciones, no colecciones raíz. El seed ya las creó así.

**Inicializar Admin SDK siempre con el database ID explícito:**
```ts
getFirestore("punt0defuga")
```

---

## URLs del proyecto

```
/                              → Inicio (público)
/salas                         → Listado de salas
/sala/[salaId]                 → Ficha de sala
/rutas                         → Listado de rutas
/ruta/[rutaId]                 → Ficha de ruta
/ruta/nueva                    → Crear ruta (Gestor+)
/ruta/[rutaId]/editar          → Editar ruta
/sala/[salaId]/partida/[partidaId]        → Ficha de partida
/sala/[salaId]/partida/[partidaId]/editar → Editar partida (Gestor+)
/invitacion/[salaId]/[partidaId]/[token]  → Pantalla de invitación (público)
/mis-partidas                  → Mis partidas
/mis-rutas                     → Mis rutas
/crear-sala                    → Crear sala (Admin+)
/perfil                        → Mi perfil
/perfil/editar                 → Editar perfil
/faq                           → FAQ
/admin                         → Panel administración
/admin/gestores                → Solicitudes ascenso a Gestor
/admin/reportes                → Reportes de fotos
```

Rutas públicas (sin auth): `/`, `/salas`, `/sala/[salaId]`, `/rutas`, `/ruta/[rutaId]`, `/invitacion/...`

Actualizar `src/middleware.ts` al añadir rutas públicas.

---

## Diseño visual

**Paleta de colores (Tailwind custom tokens):**

| Token | Color | Hex |
|---|---|---|
| `primary` | Teal | `#0D9488` |
| `background` | Gris muy claro | `#F8FAFC` |
| `foreground` | Gris oscuro | `#334155` |
| `accent` | Violeta | `#6366F1` |

**Otros parámetros:**
- Border radius: `12px` (`rounded-xl` en Tailwind)
- Sombras: suaves estilo iOS (`shadow-sm` / `shadow-md`)
- Fuente: sistema (no cargar fuentes externas — eliminar las Geist actuales)
- Mobile-first

---

## Trabajar con Firebase

### Archivos de configuración

| Archivo | Propósito |
|---|---|
| `.firebaserc` | Alias del proyecto → `rutas-punt0defuga` |
| `firebase.json` | Apunta rules e indexes a sus archivos locales |
| `firestore.rules` | Reglas de seguridad de Firestore (raíz del proyecto) |
| `storage.rules` | Reglas de seguridad de Storage (raíz del proyecto) |

### Reglas de seguridad

Editar el archivo local y luego publicar — **no editar desde la consola web** (se sobreescribirán al siguiente deploy):

```bash
npm run rules:deploy   # publica firestore.rules + storage.rules
npm run rules:get      # descarga las reglas actualmente activas
```

Los scripts usan la Firebase Rules REST API (`firebaserules.googleapis.com`) con el token de la service account — mismo patrón que `scripts/db/deploy-rules.mjs`.

### Índices de Firestore

Actualmente no hay índices creados ni script para desplegarlos.

**Cómo crear un índice:** cuando Firestore lanza el error *"The query requires an index"* en la consola del navegador, el mensaje incluye un enlace directo a la consola de Firebase para crearlo con un clic. Es la forma más rápida y fiable.

Si en el futuro se necesita un script de deploy (para gestionar varios índices en equipo), el patrón sería usar la Firestore REST API con el mismo token de la service account que ya usan los otros scripts:
```
POST https://firestore.googleapis.com/v1/projects/{project}/databases/punt0defuga/collectionGroups/{col}/indexes
```

### Base de datos nombrada

El proyecto usa una base de datos **con nombre** (`punt0defuga`), no la predeterminada de Firebase.

- **SDK cliente** (`src/lib/firebase.ts`): `getFirestore(app, "punt0defuga")`
- **Admin SDK** (scripts en `scripts/db/`): `getFirestore("punt0defuga")`

No se necesita la Firebase CLI — todo el acceso a Firebase se hace mediante scripts Node con el Admin SDK.

### Credenciales de Admin SDK

> ⚠️ **NUNCA** subir a git los archivos `*.json` de service account. Están en `.gitignore`. Si se añaden por error, revocar la clave en la consola de Firebase inmediatamente.

Los scripts usan la clave en `scripts/db/rutas-punt0defuga-firebase-adminsdk-fbsvc-*.json`.

---

## Firebase Storage — estructura de carpetas

```
/avatars/{uid}/{filename}           ← foto de perfil (jpg/png/webp)
/salas/{salaId}/{filename}          ← imagen principal de sala
/fotosPartidas/{partidaId}/{usuarioId}/{fotoId}.jpg
/rutas/{rutaId}/{filename}
```

Solo JPG, PNG y WebP. Las fotos de perfil se redimensionan a 400×400 px.
El original se guarda en `fotoOriginalUrl`; el redimensionado en `fotoUrl`.

---

## Estado de implementación

### ✅ Completado

**Infraestructura**
- Firebase SDK cliente, Auth email+contraseña, login/logout con redirección
- Middleware de protección de rutas (`src/middleware.ts`)
- Zustand store para auth (`src/store/authStore.ts`)
- `@tanstack/react-query`, `react-hook-form`, `zod` instalados y en uso
- Schema Firestore inicializado; `firestore.rules` + `storage.rules` desplegadas
- Favicon: icono de puerta SVG (`src/app/icon.svg`)

**Auth + Perfil**
- Registro email+contraseña con creación de `usuarios/{uid}` en Firestore
- Página `/perfil` con nick, foto (Storage), ubicación
- Solicitud de ascenso a Gestor (`peticionesGestor`)

**Salas**
- `/salas` — listado con filtros
- `/sala/[salaId]` — ficha completa (info, valoraciones, fotos, comentarios placeholder)
- `/crear-sala` — formulario con geocoding desde URL Google Maps

**Partidas**
- Crear partida en una sala (Gestor+): jugadores confirmados (búsqueda por nick), jugadores pendientes (nombre libre), checkbox "el creador juega"
- `/sala/[salaId]/partida/[partidaId]` — ficha con card de jugadores desplegable (confirmados con avatar + pendientes sin cuenta)
- Unirse / abandonar partida
- Editar partida (`/sala/[salaId]/partida/[partidaId]/editar`): jugadores y notas; fecha/hora son de solo lectura con aviso
- Estados: `borrador → confirmada → cancelada`; transición automática a `jugada` cuando `fechaHoraInicio + duracion` expira (lazy client-side); admin puede forzar manualmente
- Flujo de invitación con token: `InvitacionScreen` + página pública `/invitacion/[salaId]/[partidaId]/[token]`; botón "Yo soy esta persona" llama a `reclamarJugadorPendiente`; botón de copiar enlace para gestores en la ficha de partida

**Rutas**
- `/rutas` — listado
- `/ruta/[rutaId]` — ficha
- Crear / editar ruta

**Admin + FAQ**
- Panel `/admin` con estadísticas globales
- `/admin/gestores` — aprobar/rechazar solicitudes de Gestor (`writeBatch`: peticion + rol de usuario)
- `/admin/reportes` — placeholder
- Página `/faq` pública con acordeón

### ❌ Pendiente

**Fase 1**
- [ ] Google Login

**Fase 4 — Contenido social**
- [ ] Votaciones (5 categorías: General, Juegos, Ambientación, Gamemaster, Miedo)
- [ ] Comentarios con soporte de spoilers
- [ ] Fotos (subida a Storage, galería, reporte, `/admin/reportes`)

**Fase 5 — Rutas (resto)**
- [ ] Copiar ruta
- [ ] Botones Google Maps (waypoints, máx 9 por URL — dividir si hay más)

**Fase 6 — Admin (resto)**
- [ ] Centro de notificaciones

**Fase 7 — Deploy + Cloud Functions**
- [ ] Cloud Functions: transición automática a `jugada` (server-side), recalcular valoraciones, notificaciones push
- [ ] Firebase Hosting: añadir sección `hosting` en `firebase.json` y configurar deploy de Next.js

---

## Convenciones de código

- Componentes de pantalla en `src/components/screens/` (patrón ya establecido)
- Hooks en `src/hooks/`
- Lógica de Firebase en `src/lib/`
- Stores Zustand en `src/store/`
- Tipos compartidos en `src/types/` (crear cuando haya al menos 2-3 tipos)
- Los Server Components de Next.js para páginas que solo leen datos públicos; Client Components para interactividad
- No mockear Firebase en tests — usar datos reales o emulador

---

## Notas de negocio importantes

- **Votos**: solo usuarios en `jugadoresConfirmados` de una partida en estado `jugada`; editables 7 días; nunca se borran (solo se anulan).
- **Fotos**: se pueden subir desde 15 min antes de la partida; máximo 3 por usuario por partida; aparecen también en la galería de la sala.
- **Partidas**: `fecha` y `hora` se guardan como strings separados (evita timezone issues); `fechaHoraInicio` es el timestamp calculado.
- **Salas**: requieren coordenadas obligatoriamente — si el geocoding falla, no se crea la sala.
- **Google Maps**: máximo 9 waypoints por URL; rutas con más salas se dividen en varios enlaces.
