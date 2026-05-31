"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { CalendarDays, Clock, Users, MapPin } from "lucide-react";
import { getMisPartidas } from "@/lib/partidas";
import { getSala } from "@/lib/salas";
import { useAuthStore } from "@/store/authStore";
import type { Partida, Sala } from "@/types";

const ESTADO_LABELS: Record<Partida["estado"], string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  jugada: "Jugada",
  cancelada: "Cancelada",
};

const ESTADO_COLORS: Record<Partida["estado"], string> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-teal-50 text-teal-700",
  jugada: "bg-purple-50 text-purple-700",
  cancelada: "bg-red-50 text-red-500",
};

function PartidaCard({ partida, sala }: { partida: Partida; sala: Sala | null }) {
  return (
    <Link
      href={`/sala/${partida.salaId}/partida/${partida.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow p-4 space-y-2"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="font-semibold text-[#334155] truncate">
          {sala?.nombreSala ?? "Sala desconocida"}
        </p>
        <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[partida.estado]}`}>
          {ESTADO_LABELS[partida.estado]}
        </span>
      </div>

      {sala && (sala.direccion?.ciudad || sala.direccion?.provincia) && (
        <p className="flex items-center gap-1 text-xs text-slate-400">
          <MapPin className="w-3 h-3 shrink-0" />
          {[sala.direccion.ciudad, sala.direccion.provincia].filter(Boolean).join(", ")}
        </p>
      )}

      <div className="flex items-center gap-3 text-sm text-slate-500">
        <span className="flex items-center gap-1">
          <CalendarDays className="w-3.5 h-3.5" />
          {partida.fecha}
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" />
          {partida.hora}
        </span>
        <span className="flex items-center gap-1">
          <Users className="w-3.5 h-3.5" />
          {partida.jugadoresConfirmados.length}
          {partida.plazasMax > 0 && `/${partida.plazasMax}`}
        </span>
      </div>
    </Link>
  );
}

function PartidaCardSkeleton() {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 space-y-3 animate-pulse">
      <div className="flex items-start justify-between gap-2">
        <div className="h-4 bg-slate-200 rounded w-1/2" />
        <div className="h-5 bg-slate-200 rounded-full w-20 shrink-0" />
      </div>
      <div className="h-3 bg-slate-200 rounded w-1/3" />
      <div className="flex gap-4">
        <div className="h-3 bg-slate-200 rounded w-24" />
        <div className="h-3 bg-slate-200 rounded w-16" />
        <div className="h-3 bg-slate-200 rounded w-10" />
      </div>
    </div>
  );
}

export function MisPartidasScreen() {
  const { user, loading: authLoading } = useAuthStore();

  const { data: partidas = [], isLoading: queryLoading } = useQuery({
    queryKey: ["mis-partidas", user?.uid],
    queryFn: () => getMisPartidas(user!.uid),
    enabled: !!user,
  });

  const isLoading = authLoading || queryLoading;

  const salaIds = Array.from(new Set(partidas.map((p) => p.salaId)));

  const { data: salasMap = {} } = useQuery({
    queryKey: ["salas-map", salaIds],
    queryFn: async () => {
      const entries = await Promise.all(
        salaIds.map(async (id) => [id, await getSala(id)] as [string, Sala | null]),
      );
      return Object.fromEntries(entries);
    },
    enabled: salaIds.length > 0,
  });

  const hoy = new Date().toISOString().split("T")[0];
  const proximas = partidas.filter(
    (p) => p.fecha >= hoy && (p.estado === "borrador" || p.estado === "confirmada"),
  );
  const historial = partidas.filter(
    (p) => p.estado === "jugada" || p.estado === "cancelada" || p.fecha < hoy,
  );

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="flex items-center gap-3">
          <div className="h-7 bg-slate-200 rounded-lg w-40 animate-pulse" />
          <svg
            className="w-5 h-5 text-[#0D9488] animate-spin shrink-0"
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
        </div>
        <div className="space-y-3">
          {[...Array(3)].map((_, i) => <PartidaCardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
      <h1 className="text-2xl font-bold text-[#334155]">Mis partidas</h1>

      {partidas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🎮</p>
          <p className="font-medium">Todavía no tienes partidas</p>
          <p className="text-sm mt-1">Únete a una partida desde la ficha de cualquier sala</p>
          <Link href="/salas" className="text-[#0D9488] text-sm mt-3 block hover:underline">
            Ver salas
          </Link>
        </div>
      ) : (
        <>
          {proximas.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Próximas ({proximas.length})
              </h2>
              {proximas.map((p) => (
                <PartidaCard key={p.id} partida={p} sala={salasMap[p.salaId] ?? null} />
              ))}
            </section>
          )}

          {historial.length > 0 && (
            <section className="space-y-3">
              <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide">
                Historial ({historial.length})
              </h2>
              {historial.map((p) => (
                <PartidaCard key={p.id} partida={p} sala={salasMap[p.salaId] ?? null} />
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
