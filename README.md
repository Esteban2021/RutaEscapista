# RutaEscapista

Plataforma web para registrar, organizar y valorar partidas de escape room.

- **Salas** → establecimientos físicos de escape room
- **Partidas** → sesiones concretas en una sala (fecha, jugadores, estado)
- **Rutas** → itinerarios de varias partidas en distintas salas

Análisis funcional completo: [`docs/RutaEscapista_Analisis_Funcional.md`](docs/RutaEscapista_Analisis_Funcional.md)

---

## Stack

| Capa | Tecnología |
|---|---|
| Framework | Next.js 14 (App Router) |
| Estilos | Tailwind CSS |
| Estado | Zustand + React Query |
| Formularios | react-hook-form + zod |
| Backend | Firebase Auth + Firestore + Storage |
| Hosting | Firebase Hosting (pendiente) |

---

## Arrancar en local

```bash
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

Requiere un archivo `.env.local` con las credenciales de Firebase (ver `.env.local.example` si existe).

---

## Scripts disponibles

```bash
npm run dev            # Servidor de desarrollo (abre Chrome automáticamente)
npm run build          # Build de producción
npm run lint           # ESLint

npm run db:schema      # Inicializa colecciones en Firestore (ejecutar una vez)
npm run db:seed        # Seed de datos de prueba

npm run rules:deploy   # Publica firestore.rules y storage.rules en Firebase
npm run rules:get      # Consulta las reglas actualmente desplegadas
```

---

## Estructura del proyecto

```
src/
├── app/
│   ├── (auth)/login/          # Página de login
│   ├── (main)/                # Rutas protegidas (requieren auth)
│   │   ├── layout.tsx         # Nav + comprobación de onboarding
│   │   ├── dashboard/         # Inicio para usuarios autenticados
│   │   ├── perfil/            # Ver perfil
│   │   └── perfil/editar/     # Editar perfil (onboarding incluido)
│   ├── salas/                 # Listado de salas (público)
│   └── sala/[salaId]/         # Ficha de sala (público)
├── components/
│   ├── layout/AppNav.tsx      # Barra de navegación
│   ├── providers/             # QueryProvider
│   └── screens/               # Componentes de pantalla completa
├── hooks/useAuth.ts           # Listener de auth + carga de perfil Firestore
├── lib/
│   ├── firebase.ts            # Inicialización Firebase
│   ├── salas.ts               # Queries de salas y partidas
│   └── usuarios.ts            # CRUD de perfiles de usuario
├── store/authStore.ts         # Zustand: user + perfil + loading
├── types/index.ts             # Tipos del dominio (Sala, Partida, Ruta, etc.)
└── middleware.ts              # Protección de rutas
scripts/db/
├── seed-firestore.mjs         # Inicializa schema de colecciones
├── deploy-rules.mjs           # Despliega reglas de seguridad vía API
└── get-rules.mjs              # Consulta reglas desplegadas
firestore.rules                # Reglas de seguridad de Firestore
storage.rules                  # Reglas de seguridad de Storage
```

---

## Roles

```
Superadmin > Admin > Gestor de Partidas > Usuario
```

Almacenado en `usuarios/{uid}.rol` como string. Los admins/gestores tienen acceso a funciones de creación de contenido.

---

## Estado de implementación

### ✅ Hecho
- Auth (login/logout, protección de rutas, middleware)
- Perfil de usuario (onboarding, edición, roles)
- Listado de salas con filtros por dificultad
- Ficha de sala con valoraciones y lista de partidas
- Navegación (AppNav responsive con menú de usuario)
- Reglas de Firestore y Storage desplegadas

### 🚧 En desarrollo
- Crear / editar sala (Admin+)
- Crear / editar partida (Gestor+)
- Unirse a una partida
- Rutas (itinerarios)
- Comentarios y votaciones
- Fotos

### ⬜ Pendiente
- Panel de administración
- Notificaciones
- Cloud Functions
- Deploy en Firebase Hosting
- Google Login
- FAQ
