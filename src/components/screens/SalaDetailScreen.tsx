"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Clock, ExternalLink, Star, ArrowLeft, CalendarDays, Users, Pencil } from "lucide-react";
import { getSala, getPartidasDeSala } from "@/lib/salas";
import { useAuthStore } from "@/store/authStore";
import type { Partida } from "@/types";

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const ESTADO_PARTIDA_LABELS: Record<string, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  jugada: "Jugada",
  cancelada: "Cancelada",
};

const ESTADO_PARTIDA_COLORS: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-teal-50 text-teal-700",
  jugada: "bg-purple-50 text-purple-700",
  cancelada: "bg-red-50 text-red-500",
};

function RatingRow({ label, value, total }: { label: string; value: number; total: number }) {
  if (total === 0) return null;
  return (
    <div className="flex items-center justify-between text-sm">
      <span className="text-slate-500 w-28">{label}</span>
      <div className="flex items-center gap-1.5">
        <div className="flex">
          {[1, 2, 3, 4, 5].map((i) => (
            <Star
              key={i}
              className={`w-3.5 h-3.5 ${i <= Math.round(value) ? "fill-amber-400 text-amber-400" : "text-slate-200"}`}
            />
          ))}
        </div>
        <span className="font-semibold text-[#334155] w-6 text-right">{value.toFixed(1)}</span>
        <span className="text-slate-400 text-xs">({total})</span>
      </div>
    </div>
  );
}

function PartidaRow({ partida, salaId }: { partida: Partida; salaId: string }) {
  return (
    <Link
      href={`/sala/${salaId}/partida/${partida.id}`}
      className="flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <div className="flex items-center gap-3">
        <CalendarDays className="w-4 h-4 text-[#0D9488] shrink-0" />
        <div>
          <p className="text-sm font-medium text-[#334155]">{partida.fecha} · {partida.hora}</p>
          {partida.notas && (
            <p className="text-xs text-slate-400 truncate max-w-48">{partida.notas}</p>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 text-xs text-slate-500">
          <Users className="w-3.5 h-3.5" />
          {partida.jugadoresConfirmados.length}
          {partida.plazasMax > 0 && `/${partida.plazasMax}`}
        </div>
        <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_PARTIDA_COLORS[partida.estado]}`}>
          {ESTADO_PARTIDA_LABELS[partida.estado]}
        </span>
      </div>
    </Link>
  );
}

export function SalaDetailScreen({ salaId }: { salaId: string }) {
  const { perfil } = useAuthStore();
  const canCreatePartida = perfil && ["gestor", "admin", "superadmin"].includes(perfil.rol);
  const canEdit = perfil && ["admin", "superadmin"].includes(perfil.rol);

  const { data: sala, isLoading: loadingSala } = useQuery({
    queryKey: ["sala", salaId],
    queryFn: () => getSala(salaId),
  });

  const { data: partidas = [] } = useQuery({
    queryKey: ["partidas", salaId],
    queryFn: () => getPartidasDeSala(salaId),
    enabled: !!sala,
  });

  if (loadingSala) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-48 bg-white rounded-xl animate-pulse" />
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!sala) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">Sala no encontrada</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  const v = sala.valoraciones;
  const tieneValoraciones = v && v.totalVotosGeneral > 0;
  const gmapsUrl = sala.coordenadas
    ? `https://www.google.com/maps/search/?api=1&query=${sala.coordenadas.lat},${sala.coordenadas.lng}`
    : null;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      {/* Back + Editar */}
      <div className="flex items-center justify-between">
        <Link href="/salas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488]">
          <ArrowLeft className="w-4 h-4" />
          Salas
        </Link>
        {canEdit && (
          <Link
            href={`/sala/${salaId}/editar`}
            className="inline-flex items-center gap-1.5 text-sm text-[#0D9488] hover:bg-teal-50 px-3 py-1.5 rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
            Editar sala
          </Link>
        )}
      </div>

      {/* Header card */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <div className="h-48 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center overflow-hidden">
          {sala.imagenUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={sala.imagenUrl} alt={sala.nombreSala} className="w-full h-full object-cover" />
          ) : (
            <span className="text-6xl">🔐</span>
          )}
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-start justify-between gap-2">
            <h1 className="text-xl font-bold text-[#334155]">{sala.nombreSala}</h1>
            <div className="flex gap-2 shrink-0">
              {sala.dificultad && (
                <span className="text-xs px-2 py-1 rounded-full font-medium bg-teal-50 text-teal-700">
                  {DIFICULTAD_LABELS[sala.dificultad] ?? sala.dificultad}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-3 text-sm text-slate-500">
            {(sala.direccion?.ciudad || sala.direccion?.provincia) && (
              <span className="flex items-center gap-1">
                <MapPin className="w-4 h-4" />
                {[sala.direccion.ciudad, sala.direccion.provincia].filter(Boolean).join(", ")}
              </span>
            )}
            {sala.duracionMinutos && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {sala.duracionMinutos} min
              </span>
            )}
          </div>

          {sala.descripcion && (
            <p className="text-sm text-slate-600 leading-relaxed">{sala.descripcion}</p>
          )}

          <div className="flex gap-2 pt-1">
            {gmapsUrl && (
              <a
                href={gmapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-[#0D9488] hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Ver en Google Maps
              </a>
            )}
            {sala.webOficial && (
              <a
                href={sala.webOficial}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-sm text-slate-500 hover:underline"
              >
                <ExternalLink className="w-4 h-4" />
                Web oficial
              </a>
            )}
          </div>
        </div>
      </div>

      {/* Valoraciones */}
      {tieneValoraciones && (
        <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
          <h2 className="font-semibold text-[#334155]">Valoraciones</h2>
          <RatingRow label="General ⭐" value={v.mediaGeneral} total={v.totalVotosGeneral} />
          <RatingRow label="Puzzles 🎲" value={v.mediaJuegos} total={v.totalVotosJuegos} />
          <RatingRow label="Ambientación 🎭" value={v.mediaAmbientacion} total={v.totalVotosAmbientacion} />
          <RatingRow label="Gamemaster 🙋" value={v.mediaGamemaster} total={v.totalVotosGamemaster} />
          <RatingRow label="Miedo 👻" value={v.mediaMiedo} total={v.totalVotosMiedo} />
        </div>
      )}

      {/* Partidas */}
      <div className="bg-white rounded-xl shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold text-[#334155]">Partidas</h2>
          {canCreatePartida && (
            <Link
              href={`/partida/nueva?salaId=${sala.id}`}
              className="text-sm bg-[#0D9488] text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
            >
              + Nueva partida
            </Link>
          )}
        </div>
        {partidas.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-6">
            No hay partidas registradas en esta sala todavía.
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {partidas.map((p) => (
              <PartidaRow key={p.id} partida={p} salaId={salaId} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
