"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Star, Clock, Plus } from "lucide-react";
import { getSalas } from "@/lib/salas";
import { useAuthStore } from "@/store/authStore";
import type { Sala } from "@/types";

const DIFICULTAD_LABELS: Record<string, string> = {
  facil: "Fácil",
  media: "Media",
  dificil: "Difícil",
};

const DIFICULTAD_COLORS: Record<string, string> = {
  facil: "bg-green-50 text-green-700",
  media: "bg-amber-50 text-amber-700",
  dificil: "bg-red-50 text-red-700",
};

const FILTROS = [
  { value: "", label: "Todas" },
  { value: "facil", label: "Fácil" },
  { value: "media", label: "Media" },
  { value: "dificil", label: "Difícil" },
];

function SalaCard({ sala }: { sala: Sala }) {
  const rating = sala.valoraciones?.mediaGeneral ?? 0;
  const totalVotos = sala.valoraciones?.totalVotosGeneral ?? 0;

  return (
    <Link
      href={`/sala/${sala.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="h-36 bg-gradient-to-br from-teal-100 to-teal-200 flex items-center justify-center overflow-hidden">
        {sala.imagenUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={sala.imagenUrl} alt={sala.nombreSala} className="w-full h-full object-cover" />
        ) : (
          <span className="text-4xl">🔐</span>
        )}
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-[#334155] truncate">{sala.nombreSala}</h3>
        <div className="flex items-center gap-1 text-sm text-slate-500">
          <MapPin className="w-3.5 h-3.5 shrink-0" />
          <span className="truncate">
            {[sala.direccion?.ciudad, sala.direccion?.provincia].filter(Boolean).join(", ") || "Sin ubicación"}
          </span>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1">
            {sala.dificultad && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFICULTAD_COLORS[sala.dificultad] ?? "bg-slate-100 text-slate-600"}`}>
                {DIFICULTAD_LABELS[sala.dificultad] ?? sala.dificultad}
              </span>
            )}
            {sala.duracionMinutos && (
              <span className="flex items-center gap-0.5 text-xs text-slate-400">
                <Clock className="w-3 h-3" />
                {sala.duracionMinutos}min
              </span>
            )}
          </div>
          {totalVotos > 0 && (
            <div className="flex items-center gap-0.5 text-sm">
              <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400" />
              <span className="font-medium text-[#334155]">{rating.toFixed(1)}</span>
              <span className="text-slate-400 text-xs">({totalVotos})</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}

export function SalasScreen() {
  const [filtro, setFiltro] = useState("");
  const { perfil } = useAuthStore();
  const canCreate = perfil && ["admin", "superadmin"].includes(perfil.rol);

  const { data: salas = [], isLoading } = useQuery({
    queryKey: ["salas"],
    queryFn: getSalas,
  });

  const salasFiltradas = filtro
    ? salas.filter((s) => s.dificultad === filtro)
    : salas;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#334155]">Salas de escape</h1>
        {canCreate && (
          <Link
            href="/crear-sala"
            className="flex items-center gap-1.5 bg-[#0D9488] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Añadir sala
          </Link>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {FILTROS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFiltro(f.value)}
            className={`shrink-0 px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              filtro === f.value
                ? "bg-[#0D9488] text-white"
                : "bg-white text-[#334155] border border-slate-200 hover:border-teal-300"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm h-52 animate-pulse" />
          ))}
        </div>
      ) : salasFiltradas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🔍</p>
          <p className="font-medium">No hay salas todavía</p>
          <p className="text-sm mt-1">Sé el primero en añadir una sala de escape</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {salasFiltradas.map((sala) => (
            <SalaCard key={sala.id} sala={sala} />
          ))}
        </div>
      )}
    </div>
  );
}
