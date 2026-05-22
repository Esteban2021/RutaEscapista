# Análisis Funcional — RutaEscapista
**URL del proyecto:** https://esteban2021.github.io/RutaEscapista/  
**Repositorio:** GitHub Pages (`esteban2021/RutaEscapista`)  
**Fecha de análisis:** Mayo 2026  
**Stack decidido:** Vue + Firebase (Auth, Firestore, Storage) + GitHub Pages

---

## Índice

1. [Visión general](#1-visión-general)
2. [Roles y permisos](#2-roles-y-permisos)
3. [Módulo: Salas](#3-módulo-salas)
4. [Módulo: Partidas](#4-módulo-partidas)
5. [Módulo: Rutas](#5-módulo-rutas)
6. [Módulo: Votaciones](#6-módulo-votaciones)
7. [Módulo: Fotos](#7-módulo-fotos)
8. [Módulo: Comentarios](#8-módulo-comentarios)
9. [Módulo: Usuarios y registro](#9-módulo-usuarios-y-registro)
10. [Módulo: Invitaciones y jugadores tentativos](#10-módulo-invitaciones-y-jugadores-tentativos)
11. [Módulo: Mapas y Google Maps](#11-módulo-mapas-y-google-maps)
12. [Módulo: Exportación offline](#12-módulo-exportación-offline)
13. [Navegación y estructura de URLs](#13-navegación-y-estructura-de-urls)
14. [Diseño visual](#14-diseño-visual)
15. [Estructura de datos Firestore](#15-estructura-de-datos-firestore)
16. [Reglas de seguridad Firestore](#16-reglas-de-seguridad-firestore)
17. [Firebase Storage](#17-firebase-storage)
18. [Cloud Functions recomendadas](#18-cloud-functions-recomendadas)
19. [Checklist de implementación](#19-checklist-de-implementación)

---

## 1. Visión general

RutaEscapista es una aplicación web para registrar, consultar y valorar salas de escape room. Permite organizar **partidas** (reservas concretas con fecha y jugadores) y agruparlas en **rutas** (itinerarios de varias salas). Cualquier persona puede ver las salas; las acciones sociales (votar, comentar, subir fotos) requieren haber jugado.

### Decisiones de infraestructura

| Elemento | Decisión |
|---|---|
| Hosting | GitHub Pages |
| Frontend | Vue + Vue Router (history mode + parche 404) |
| Backend / BD | Firebase Firestore |
| Autenticación | Firebase Auth (email+contraseña y Google) |
| Almacenamiento de fotos | Firebase Storage |
| Mapas | Enlaces a Google Maps (sin embed) |

---

## 2. Roles y permisos

### Jerarquía (de mayor a menor)

```
Superadmin > Admin > Gestor de Partidas > Usuario
```

Todos los roles superiores incluyen los permisos de los inferiores.

### Tabla de permisos

| Acción | Usuario | Gestor | Admin | Superadmin |
|---|---|---|---|---|
| Ver salas y partidas | ✅ | ✅ | ✅ | ✅ |
| Votar / comentar / subir fotos | ✅ (si jugó) | ✅ (si jugó) | ✅ | ✅ |
| Crear rutas | ❌ | ✅ | ✅ | ✅ |
| Crear partidas | ❌ | ✅ | ✅ | ✅ |
| Editar partida en borrador | ✅ (si es creador) | ✅ | ✅ | ✅ |
| Editar partida confirmada | ❌ | ✅ (limitado) | ✅ | ✅ |
| Borrar partida | Solo si creador | Solo si creador | ✅ | ✅ |
| Crear salas | ❌ | ❌ | ✅ | ✅ |
| Editar salas | ❌ | ❌ | ✅ | ✅ |
| Archivar salas | ❌ | ❌ | ✅ | ✅ |
| Borrar salas definitivamente | ❌ | ❌ | ❌ | ✅ |
| Aprobar solicitudes de Gestor | ❌ | ❌ | ✅ | ✅ |
| Borrar fotos ajenas | ❌ | ❌ (solo las suyas) | ✅ | ✅ |
| Borrar fotos ajenas (creador partida) | — | ✅ en su partida | ✅ | ✅ |

### Notas sobre roles

- **Registro:** Cualquiera puede registrarse. Al hacerlo, entra con rol `usuario`.
- **Ascenso a Gestor:** El usuario solicita el ascenso pulsando un botón en su perfil. Un admin o superadmin aprueba la petición.
- **El Gestor solo gestiona lo suyo:** sus rutas y sus partidas. No puede tocar las de otros gestores.
- **Admin:** puede gestionar cualquier partida o ruta, independientemente del creador.

---

## 3. Módulo: Salas

### Descripción

Una sala representa el establecimiento de escape room. Es la entidad principal del sistema. No puede borrarse permanentemente salvo por el superadmin.

### Campos del documento `sala`

| Campo | Tipo | Notas |
|---|---|---|
| `nombreSala` | string | Obligatorio. Permite emojis y caracteres especiales |
| `descripcion` | string | Opcional. Máximo 2000 caracteres |
| `webOficial` | string (URL) | Opcional |
| `direccion.calle` | string | Autorellenado desde Google Maps |
| `direccion.numero` | string | |
| `direccion.ciudad` | string | |
| `direccion.provincia` | string | |
| `direccion.cp` | string | |
| `direccion.pais` | string | Por defecto "ES" |
| `coordenadas.lat` | number | **Obligatorio.** Si geocoding falla, no se crea la sala |
| `coordenadas.lng` | number | **Obligatorio** |
| `duracionMinutos` | number \| null | Si null, las partidas usan 90 min por defecto |
| `dificultad` | "facil" \| "media" \| "dificil" \| null | Opcional |
| `estado` | "activa" \| "cerrada" \| "archivada" | |
| `fechaCierre` | timestamp \| null | Solo si estado = "cerrada" |
| `fechaCreacion` | timestamp | Automático |
| `creadorId` | string (uid) | |
| `fotosTotales` | number | Contador acumulado (optimización) |
| `valoraciones` | object | Ver detalle abajo |

### Objeto `valoraciones` (almacenado en el doc de sala)

```json
{
  "mediaGeneral": 4.3,       "totalVotosGeneral": 48,
  "mediaJuegos": 4.6,        "totalVotosJuegos": 45,
  "mediaAmbientacion": 4.7,  "totalVotosAmbientacion": 47,
  "mediaGamemaster": 4.8,    "totalVotosGamemaster": 48,
  "mediaMiedo": 2.1,         "totalVotosMiedo": 40
}
```

Se recalcula cada vez que un usuario vota o edita su voto.

### Estados de una sala

- **activa** → abierta y visible públicamente
- **cerrada** → el establecimiento ya no existe; la ficha se mantiene visible (los jugadores ya tienen historial)
- **archivada** → no aparece en buscadores ni listados; solo accesible por URL directa o por admins

### Reglas de borrado

- **Admin:** puede archivar. No puede borrar.
- **Superadmin:** único que puede borrar definitivamente.

### Subcolecciones de sala

- `salas/{salaId}/comentarios/{comentarioId}`
- `salas/{salaId}/fotos/{fotoId}` *(agregado desde partidas)*

---

## 4. Módulo: Partidas

### Descripción

Una partida es una reserva concreta de una sala: fecha, hora y lista de jugadores. Varias partidas de la misma sala representan grupos distintos que jugaron en distintos momentos.

### Campos del documento `partida`

| Campo | Tipo | Notas |
|---|---|---|
| `salaId` | string | Referencia a la sala |
| `fecha` | string "YYYY-MM-DD" | Fecha sin hora (evita problemas de zona horaria) |
| `hora` | string "HH:mm" | Hora local exacta |
| `fechaHoraInicio` | timestamp | Calculado automáticamente al crear |
| `duracionMinutos` | number | De la sala, o 90 min por defecto |
| `estado` | string | Ver estados abajo |
| `creadorId` | string (uid) | |
| `jugadoresConfirmados` | string[] (uids) | |
| `jugadoresPendientes` | array | Mezcla de uids y nombres temporales (texto libre) |
| `modoCombate` | boolean | Por definir en fases posteriores |
| `notas` | string \| null | |
| `fotosCount` | number | |
| `votosCount` | number | |
| `comentariosCount` | number | |
| `fechaCreacion` | timestamp | |
| `fechaActualizacion` | timestamp | |

### Estados de una partida

| Estado | Descripción |
|---|---|
| `borrador` | Creada pero no confirmada. Editable libremente |
| `confirmada` | Publicada. Fecha/hora bloqueadas (solo admin puede cambiarlas) |
| `jugada` | Pasa automáticamente cuando `fechaHoraInicio + duracion` ha expirado |
| `cancelada` | Cancelada manualmente. No se borra |

### Reglas de edición según estado

- **Borrador:** el creador (o Gestor) puede editar todo libremente.
- **Confirmada:** el Gestor puede editar campos menores (notas, jugadores). Fecha/hora solo admin.
- **Jugada:** solo admin/superadmin puede hacer correcciones.
- **Cancelada:** solo lectura.

### Reglas de borrado de partidas

Solo puede borrar una partida (bajo condiciones):
- Su creador
- Admin
- Superadmin

**Condiciones para borrar:**
- No ha sido jugada.
- No tiene jugadores confirmados ajenos al creador.
- O solo tiene tentativos / comentarios del propio creador.

### Gestión de fechas

- Se guardan `fecha` (string) y `hora` (string) por separado para evitar conversiones de zona horaria.
- `fechaHoraInicio` (timestamp) se genera automáticamente y se usa para cálculos y ordenaciones.
- `fechaFin = fechaHoraInicio + duracionMinutos`.
- Cuando se supera `fechaFin`, la partida pasa automáticamente a estado `jugada`.

---

## 5. Módulo: Rutas

### Descripción

Una ruta es un itinerario que agrupa varias partidas (en distintas salas) que se juegan de forma consecutiva, normalmente en el mismo día o fin de semana.

### Campos del documento `ruta`

| Campo | Tipo | Notas |
|---|---|---|
| `nombre` | string | |
| `descripcion` | string \| null | |
| `creadorId` | string (uid) | |
| `fechaCreacion` | timestamp | |
| `partidas` | string[] | IDs de partidas, en orden |
| `jugadores` | string[] | UIDs de todos los participantes |
| `estado` | "borrador" \| "confirmada" \| "archivada" | |
| `imagenUrl` | string \| null | |

### Estados de una ruta

| Estado | Descripción |
|---|---|
| `borrador` | En preparación. Todas las partidas son editables |
| `confirmada` | Publicada. Las partidas existentes se bloquean |
| `archivada` | Finalizada o retirada |

### Reglas al confirmar

- Se bloquean todas las partidas incluidas.
- Si se amplía la ruta (se añaden nuevas partidas), solo las nuevas nacen como borrador y hay que confirmarlas por separado con "Confirmar nuevas partidas".
- Las partidas antiguas ya confirmadas no se tocan.

### Copiar una ruta

Al copiar una ruta se genera:
- Una nueva ruta con el mismo orden y las mismas salas.
- Partidas completamente nuevas, todas en estado `borrador`.
- El creador de la ruta es el `creadorId` de cada partida copiada.
- No se copian fechas, jugadores, votos ni fotos.

### Permisos dentro de una ruta

| Rol | Puede hacer |
|---|---|
| Creador de la ruta | Crear partidas, borrar las suyas, cambiar orden, confirmar, ampliar, copiar |
| Gestor | Igual que creador, pero solo puede borrar partidas que haya creado él |
| Admin / Superadmin | Todo |

---

## 6. Módulo: Votaciones

### Quién puede votar

Solo usuarios que aparezcan como **jugadores confirmados** en una partida cuyo estado sea `jugada`.

- Un usuario puede votar una vez por partida (no por sala).
- Si repite la sala en otra partida, puede votar de nuevo.
- Votar es **opcional**: el usuario puede votar solo la categoría que quiera.

### Categorías e iconos

| Categoría | Icono | Escala |
|---|---|---|
| General | ⭐ (estrellas) | 1 – 5 |
| Juegos / Puzzles | 🎲 (dados) | 1 – 5 |
| Ambientación | 🎭 (máscara) | 1 – 5 |
| Gamemaster | 🙋 (persona) | 1 – 5 |
| Miedo | 👻 (fantasma) | 0 – 5 |

Los iconos se muestran semitransparentes y se van opacando según el valor votado.

### Lógica del voto general (100% en frontend)

- Empieza en `null`.
- Cuando el usuario vota cualquier categoría por primera vez → **General se autocompleta con ese valor** (solo si estaba en `null`).
- Una vez que General tiene un valor (por autocompletado o por voto manual), **no se modifica automáticamente** con los votos siguientes.
- El usuario puede cambiar General en cualquier momento de forma independiente.
- Mientras General esté en `null`, la UI muestra el último valor votado en cualquier categoría (solo visual, no se guarda).

**El backend no aplica ninguna lógica sobre General.** Se guarda el valor tal cual lo envía el cliente.

### Edición del voto

- Editable durante **7 días** desde la fecha de creación.
- Pasados 7 días → necesita autorización de admin/superadmin.
- Cada edición **no** extiende la ventana de 7 días.
- Los votos **no se borran**: un admin puede anular un voto marcando `anulado: true`.

### Estructura del documento `voto`

```json
{
  "salaId": "abc123",
  "partidaId": "xyz789",
  "usuarioId": "u001",
  "valorGeneral": 4,
  "valorJuegos": 5,
  "valorAmbientacion": null,
  "valorGamemaster": null,
  "valorMiedo": 2,
  "fechaCreacion": "timestamp",
  "fechaActualizacion": "timestamp",
  "editableHasta": "timestamp",
  "anulado": false,
  "anuladoPor": null,
  "fechaAnulacion": null
}
```

Cualquier campo de valor puede ser `null` si el usuario no votó esa categoría. La media de cada categoría se calcula solo sobre votos no nulos.

---

## 7. Módulo: Fotos

### Quién puede subir fotos

Cualquier jugador que aparezca en `jugadoresConfirmados` de una partida.

- **No** pueden subir fotos: jugadores pendientes / tentativos, ni usuarios sin partida.
- **Límite:** 3 fotos por usuario por partida.

### Cuándo se pueden subir

Desde **15 minutos antes** de la hora de la partida (para fotos del cartel o la entrada) y sin límite de tiempo posterior.

```
permitido si: now >= fechaHoraInicio - 15min
```

### Quién puede borrar fotos

| Rol | Puede borrar |
|---|---|
| El propio autor | Sus propias fotos |
| Creador de la partida | Cualquier foto de esa partida |
| Admin / Superadmin | Cualquier foto |

Los gestores que no sean creadores de la partida solo pueden borrar sus propias fotos.

### Fotos en la página de sala

Todas las fotos subidas en cualquier partida de una sala aparecen también en la galería de la sala, ordenadas por fecha.

### Formato

Solo se aceptan **JPG y PNG**. Las fotos de perfil se redimensionan a 400×400 px.

### Reportar una foto

Cualquier usuario puede reportar una foto pulsando "Reportar" en el visor:
- Aparece un campo de texto **opcional** para indicar el motivo.
- El reporte llega a admin/superadmin.
- El admin decide si borrar o no.

### Estructura del documento `foto` (en partida y en sala)

```json
{
  "fotoId": "...",
  "usuarioId": "...",
  "urlStorage": "...",
  "fechaSubida": "timestamp",
  "partidaId": "..."
}
```

Las URLs de Storage son **públicas** (sin autenticación requerida para verlas).

---

## 8. Módulo: Comentarios

- Puede comentar cualquier usuario con al menos una partida jugada.
- Sin límite de número de comentarios por usuario.
- Soporte de **marcado de spoiler** (mediante etiquetas especiales en el texto).
- Editable por el autor durante **1 semana** desde su creación.
- Pasada esa semana → solo admin/superadmin pueden editar, con verificación.
- No se borran permanentemente; un admin puede ocultarlos.

---

## 9. Módulo: Usuarios y registro

### Registro

- **Libre:** cualquiera puede registrarse (email+contraseña o Google Login).
- Al registrarse, el usuario entra con rol `usuario` (sin permisos para crear contenido).
- Las acciones sociales (votar, comentar, fotos) requieren haber jugado al menos una partida confirmada.

### Solicitud de ascenso a Gestor

1. El usuario pulsa "Quiero ser Gestor de Partidas" en su perfil.
2. Se genera una solicitud pendiente.
3. Un admin o superadmin la aprueba.
4. El usuario pasa a tener `gestorPartidas: true` en su documento de Firestore.

### Perfil del usuario

| Campo | Obligatorio | Visible |
|---|---|---|
| `nick` | Sí | Público. Permite emojis |
| `nombre` | No | Solo interno (invitaciones) |
| `fotoUrl` | No | Pública. JPG/PNG, 400×400 px |
| `roles` | — | Interno |
| `fechaCreacion` | — | Interno |
| `salasJugadas` | — | Estadística |

### Estructura del documento `usuario`

```json
{
  "nick": "Esteban",
  "nombre": "Esteban García",
  "fotoUrl": "https://...",
  "roles": {
    "superadmin": false,
    "admin": false,
    "gestorPartidas": false
  },
  "fechaCreacion": "timestamp",
  "salasJugadas": 0
}
```

---

## 10. Módulo: Invitaciones y jugadores tentativos

### Jugadores en una partida

Al crear una partida, el creador puede añadir jugadores de dos formas:
- **Usuarios registrados:** por uid o búsqueda de nick.
- **Nombres temporales (texto libre):** p. ej. "Ana", "Carlos hermano". Son jugadores tentativos.

### Flujo de invitación

Cada partida genera un **enlace de invitación** con token:

```
/invitacion/{partidaId}/{tokenGeneral}
```

**Si el destinatario NO está logueado**, ve:
```
Te han invitado a una partida de escape room
Sala: [Nombre]  |  Ubicación: [Provincia]  |  Organizada por: [Creador]
[ Iniciar sesión ]  [ Registrarme ]
```

**Si está logueado**, ve la lista completa de jugadores invitados. Los tentativos muestran el botón "Yo soy esta persona", que sustituye el nombre temporal por su usuario real (sin pasos extra).

### Caso "No estoy en la lista"

Si el usuario logueado no encuentra su nombre tentativo:
1. Pulsa "No estoy en la lista".
2. El sistema notifica al organizador.
3. El usuario **no** se añade automáticamente.
4. Cuando el organizador lo añada, el usuario recibirá acceso completo.

---

## 11. Módulo: Mapas y Google Maps

### Cómo se guarda la ubicación

El admin pega un enlace de Google Maps al crear la sala. El sistema extrae automáticamente latitud y longitud mediante geocoding. Si el geocoding falla, **la sala no se crea**.

### Dónde aparecen enlaces de mapa

| Contexto | Botón / Enlace |
|---|---|
| Página de sala | "Ver en Google Maps" |
| Página de partida | "Ir a la sala" |
| Página de ruta | "Ver todas en Google Maps" + "Cómo llegar desde la anterior" |

### Generación de URLs de ruta

```
https://www.google.com/maps/dir/?api=1
  &origin=LAT1,LNG1
  &destination=LAT2,LNG2
  &waypoints=LAT3,LNG3|LAT4,LNG4
```

- Google Maps soporta hasta **9 waypoints**. Si la ruta tiene más salas, se dividen en varios enlaces.
- En la página de ruta habrá dos botones: **"Ruta en orden"** y **"Ruta optimizada"** (Google optimiza el recorrido).

### Mapa personal (fase 2)

En una segunda fase se añadirá la sección "Mi mapa": lista de todas las salas jugadas por el usuario, agrupadas por provincia.

---

## 12. Módulo: Exportación offline

Una sala puede descargarse para uso sin conexión. Formato pendiente de decisión (PDF recomendado).

---

## 13. Navegación y estructura de URLs

### Tipo de navegación

**Menú lateral (hamburguesa)** — se despliega desde la izquierda. En escritorio se mostrará como sidebar fijo.

### Secciones del menú (con visibilidad por rol)

| Sección | URL | Visible para |
|---|---|---|
| A. Inicio | `/` | Todos |
| B. Salas | `/salas` | Todos |
| C. Rutas | `/rutas` | Todos |
| D. Mis partidas | `/mis-partidas` | Todos |
| E. Mis rutas | `/mis-rutas` | Todos |
| F. Crear ruta | `/ruta/nueva` | Gestor, Admin, Superadmin |
| G. Crear sala | `/crear-sala` | Admin, Superadmin |
| H. Perfil | `/perfil` | Todos |
| I. FAQ | `/faq` | Todos |
| J. Administración | `/admin` | Admin, Superadmin |

### Esquema completo de URLs

```
/                              → Inicio
/salas                         → Listado de salas
/sala/:salaId                  → Ficha de sala
/sala/:salaId/fotos            → Galería de sala (opcional)
/sala/:salaId/valoraciones     → Valoraciones de sala (opcional)

/rutas                         → Listado de rutas
/ruta/:rutaId                  → Ficha de ruta
/ruta/nueva                    → Crear ruta (Gestor+)
/ruta/:rutaId/editar           → Editar ruta
/ruta/:rutaId/añadir-partida   → Añadir partida a ruta

/partida/:partidaId            → Ficha de partida
/partida/:partidaId/editar     → Editar partida
/invitacion/:partidaId/:token  → Pantalla de invitación

/mis-partidas                  → Mis partidas
/mis-rutas                     → Mis rutas

/crear-sala                    → Crear sala (Admin+)
/crear-partida                 → Crear partida suelta (Gestor+)

/perfil                        → Mi perfil
/perfil/editar                 → Editar perfil

/faq                           → Preguntas frecuentes

/admin                         → Panel de administración
/admin/gestores                → Solicitudes de ascenso a Gestor
/admin/reportes                → Reportes de fotos
/admin/salas-cerradas          → Salas cerradas/archivadas
/admin/usuarios                → Gestión de usuarios (Superadmin)
```

### Configuración de Vue Router

- **Modo:** History (URLs limpias, sin `#`).
- **Solución GitHub Pages:** archivo `404.html` que redirige a `index.html` para que Vue Router gestione la ruta.
- **URLs:** con guiones (`mis-rutas`, `crear-sala`).

---

## 14. Diseño visual

### Paleta de colores

| Rol | Color | Hex |
|---|---|---|
| Primario | Verde azulado / Teal | `#0D9488` |
| Fondo claro | Gris muy claro | `#F8FAFC` |
| Texto principal | Gris oscuro | `#334155` |
| Acento / secundario | Violeta suave | `#6366F1` |
| Blanco | Blanco puro | `#FFFFFF` |

### Tipografía

Fuente del sistema operativo (sin cargar fuentes externas):
- iOS → San Francisco
- Android → Roboto
- Windows → Segoe UI

### Otros parámetros de diseño

| Elemento | Valor |
|---|---|
| Redondeado de bordes | 12 px |
| Sombras | Suaves estilo iOS |
| Pack de iconos | Material Design Icons (MDI) |
| Diseño | Mobile-first |

---

## 15. Estructura de datos Firestore

### Colección: `usuarios`
`usuarios/{uid}`

### Colección: `salas`
`salas/{salaId}`

Subcolecciones:
- `salas/{salaId}/partidas/{partidaId}`
- `salas/{salaId}/partidas/{partidaId}/comentarios/{comentarioId}`

### Colección: `votos`
`votos/{votoId}`

### Colección: `rutas`
`rutas/{rutaId}`

### Colección: `reportes`
`reportes/{id}`

```json
{
  "tipo": "bug | abuso | sugerencia",
  "descripcion": "string",
  "userId": "string",
  "fecha": "timestamp",
  "referencia": {
    "salaId": "string?",
    "partidaId": "string?",
    "rutaId": "string?"
  }
}
```

### Colección: `notificaciones`
`notificaciones/{id}`

```json
{
  "userId": "string",
  "tipo": "string",
  "mensaje": "string",
  "fecha": "timestamp",
  "leida": false
}
```

### Colección: `estadísticas`
`estadisticas/general`

```json
{
  "totalUsuarios": 0,
  "totalSalas": 0,
  "totalPartidas": 0,
  "totalRutas": 0
}
```

### Índices necesarios

```
salas:
  - estado ASC, dificultad ASC
  - creadorId ASC, fechaCreacion DESC

salas/{salaId}/partidas:
  - fecha DESC
  - estado ASC
  - creadorId ASC, fecha DESC

rutas:
  - estado ASC
  - creadorId ASC
```

---

## 16. Reglas de seguridad Firestore

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    function isLogged() {
      return request.auth != null;
    }

    function isOwner(uidField) {
      return request.auth.uid == resource.data[uidField];
    }

    function isAdmin() {
      return request.auth.token.admin == true;
    }

    // Usuarios
    match /usuarios/{uid} {
      allow read: if isLogged();
      allow write: if isOwner("uid") || isAdmin();
    }

    // Salas
    match /salas/{salaId} {
      allow read: if true;
      allow create: if isLogged();
      allow update, delete: if isOwner("creadorId") || isAdmin();

      // Partidas
      match /partidas/{partidaId} {
        allow read: if true;
        allow create: if isLogged();
        allow update, delete: if isOwner("creadorId") || isAdmin();

        // Comentarios
        match /comentarios/{comentarioId} {
          allow read: if true;
          allow create: if isLogged();
          allow delete: if isOwner("userId") || isAdmin();
        }
      }
    }

    // Rutas
    match /rutas/{rutaId} {
      allow read: if true;
      allow create: if isLogged();
      allow update, delete: if isOwner("creadorId") || isAdmin();
    }

    // Notificaciones
    match /notificaciones/{id} {
      allow read, write: if request.auth.uid == resource.data.userId;
    }

    // Reportes
    match /reportes/{id} {
      allow create: if isLogged();
      allow read: if isAdmin();
    }
  }
}
```

---

## 17. Firebase Storage

### Estructura de carpetas

```
/avatars/{uid}.jpg
/salas/{salaId}/main.jpg
/fotosPartidas/{partidaId}/{usuarioId}/{fotoId}.jpg
/rutas/{rutaId}/main.jpg
```

### Reglas de Storage

```
allow read: if true;         // Fotos públicas
allow write: if request.auth != null;
```

---

## 18. Cloud Functions recomendadas

| Trigger | Acción |
|---|---|
| `onCreate(usuario)` | Sumar a estadísticas globales |
| `onCreate(sala)` | Incrementar contador de salas |
| `onCreate(partida)` | Sumar contador de partidas |
| `onUpdate(partida)` | Recalcular media de jugadores; detectar si ha expirado → cambiar a `jugada` |
| `onCreate(comentario)` | Enviar notificación al creador de la partida |
| `onDelete(sala)` | Cleanup de partidas y Storage asociados |

---

## 19. Checklist de implementación

### Firebase

- [ ] Crear proyecto Firebase
- [ ] Configurar Authentication (email+contraseña, Google)
- [ ] Crear base de datos Firestore
- [ ] Pegar reglas de seguridad de Firestore
- [ ] Crear Storage
- [ ] Pegar reglas de Storage
- [ ] Crear índices (salas, partidas, rutas)
- [ ] Configurar Cloud Functions

### Frontend (Vue)

- [ ] Inicializar proyecto Vue
- [ ] Configurar Vue Router en modo history
- [ ] Crear archivo `404.html` para GitHub Pages
- [ ] Integrar Firebase SDK
- [ ] Módulo de autenticación (login, registro, Google)
- [ ] Gestión de roles (custom claims o documento usuario)
- [ ] Pantalla: Inicio / Home
- [ ] Pantalla: Listado de salas (filtros, buscador)
- [ ] Pantalla: Ficha de sala (info, fotos, valoraciones, comentarios)
- [ ] Pantalla: Crear / editar sala (Admin+)
- [ ] Pantalla: Listado de rutas
- [ ] Pantalla: Ficha de ruta (partidas, mapa, botones Google Maps)
- [ ] Pantalla: Crear / editar ruta (Gestor+)
- [ ] Pantalla: Ficha de partida
- [ ] Pantalla: Crear / editar partida
- [ ] Flujo de invitación (pantalla pública + lógica de jugadores tentativos)
- [ ] Módulo de votaciones (iconos, lógica general en frontend)
- [ ] Módulo de fotos (subida, galería, reporte)
- [ ] Módulo de comentarios (spoilers, edición)
- [ ] Perfil de usuario + solicitud de ascenso a Gestor
- [ ] Panel de administración (solicitudes, reportes, salas)
- [ ] FAQ
- [ ] Exportación offline de sala

### Mapas

- [ ] Lógica de extracción de coordenadas desde URL de Google Maps
- [ ] Generación de enlaces de dirección (sala a sala)
- [ ] Botones "Ruta en orden" y "Ruta optimizada" en ficha de ruta

### Deploy

- [ ] Deploy en GitHub Pages
- [ ] Verificar que el parche 404.html funciona con todas las rutas
- [ ] Deploy de Cloud Functions
- [ ] Configurar Firebase Hosting (alternativa a GitHub Pages si se decide migrar)

---

*Documento generado a partir del análisis funcional completo realizado en mayo de 2026.*
