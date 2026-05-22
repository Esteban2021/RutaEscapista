"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, MapPin, Route, ExternalLink, Users } from "lucide-react";
import { getRuta } from "@/lib/rutas";
import { getSala } from "@/lib/salas";
import { useAuthStore } from "@/store/authStore";
import type { Sala } from "@/types";

const MAPS_MAX_WAYPOINTS = 9;

function buildGoogleMapsRouteUrl(salas: (Sala | null)[]): string | null {
  const withCoords = salas.filter((s): s is Sala => !!s?.coordenadas);
  if (withCoords.length < 2) return null;

  // Google Maps admite origin + hasta 8 waypoints + destination = 10 puntos max
  const points = withCoords.slice(0, MAPS_MAX_WAYPOINTS + 1);
  const origin = `${points[0].coordenadas.lat},${points[0].coordenadas.lng}`;
  const destination = `${points[points.length - 1].coordenadas.lat},${points[points.length - 1].coordenadas.lng}`;
  const waypoints = points
    .slice(1, -1)
    .map((s) => `${s.coordenadas.lat},${s.coordenadas.lng}`)
    .join("|");

  const base = "https://www.google.com/maps/dir/";
  const params = new URLSearchParams({ api: "1", origin, destination });
  if (waypoints) params.set("waypoints", waypoints);
  return `${base}?${params.toString()}`;
}

export function RutaDetailScreen({ rutaId }: { rutaId: string }) {
  const { perfil } = useAuthStore();

  const { data: ruta, isLoading } = useQuery({
    queryKey: ["ruta", rutaId],
    queryFn: () => getRuta(rutaId),
  });

  const salaIds = ruta?.partidas ?? [];

  const { data: salas = [] } = useQuery({
    queryKey: ["ruta-salas", salaIds],
    queryFn: () => Promise.all(salaIds.map((id) => getSala(id))),
    enabled: salaIds.length > 0,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-40 bg-white rounded-xl animate-pulse" />
        <div className="h-24 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!ruta) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">Ruta no encontrada</p>
        <Link href="/rutas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  const canEdit = perfil && (
    perfil.rol === ruta.creadorId ||
    ["admin", "superadmin"].includes(perfil.rol)
  );
  const mapsUrl = buildGoogleMapsRouteUrl(salas);
  const hasMoreSalas = salas.filter(Boolean).length > MAPS_MAX_WAYPOINTS + 1;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link href="/rutas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488]">
        <ArrowLeft className="w-4 h-4" />
        Rutas
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2">
            <Route className="w-5 h-5 text-[#6366F1] shrink-0" />
            <h1 className="text-xl font-bold text-[#334155]">{ruta.nombre}</h1>
          </div>
          {canEdit && (
            <Link
              href={`/ruta/${rutaId}/editar`}
              className="shrink-0 text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-[#334155] hover:bg-slate-50 transition-colors"
            >
              Editar
            </Link>
          )}
        </div>

        {ruta.descripcion && (
          <p className="text-sm text-slate-600 leading-relaxed">{ruta.descripcion}</p>
        )}

        <div className="flex items-center gap-3 text-sm text-slate-500 flex-wrap">
          <span className="flex items-center gap-1">
            <MapPin className="w-4 h-4" />
            {ruta.partidas.length} sala{ruta.partidas.length !== 1 ? "s" : ""}
          </span>
          <span className="flex items-center gap-1">
            <Users className="w-4 h-4" />
            {ruta.jugadores.length} jugador{ruta.jugadores.length !== 1 ? "es" : ""}
          </span>
        </div>

        {mapsUrl && (
          <div>
            <a
              href={mapsUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-sm text-[#0D9488] hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              Ver ruta en Google Maps
            </a>
            {hasMoreSalas && (
              <p className="text-xs text-slate-400 mt-1">
                Google Maps solo muestra las primeras {MAPS_MAX_WAYPOINTS + 1} salas
              </p>
            )}
          </div>
        )}
      </div>

      {/* Lista de salas */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-[#334155] mb-4">Salas de la ruta</h2>
        {salas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-4">Sin salas añadidas</p>
        ) : (
          <ol className="space-y-2">
            {salas.map((sala, i) => (
              <li key={salaIds[i]} className="flex items-center gap-3">
                <span className="w-6 h-6 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                  {i + 1}
                </span>
                {sala ? (
                  <Link
                    href={`/sala/${sala.id}`}
                    className="flex-1 min-w-0 group"
                  >
                    <p className="text-sm font-medium text-[#334155] group-hover:text-[#0D9488] truncate">
                      {sala.nombreSala}
                    </p>
                    {(sala.direccion?.ciudad || sala.direccion?.provincia) && (
                      <p className="text-xs text-slate-400 truncate">
                        {[sala.direccion.ciudad, sala.direccion.provincia].filter(Boolean).join(", ")}
                      </p>
                    )}
                  </Link>
                ) : (
                  <span className="text-sm text-slate-400 italic">Sala no disponible</span>
                )}
              </li>
            ))}
          </ol>
        )}
      </div>
    </div>
  );
}
