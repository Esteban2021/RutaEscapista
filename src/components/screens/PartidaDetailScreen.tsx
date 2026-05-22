"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Clock, Users, StickyNote,
  UserCheck, UserMinus, AlertCircle,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPartida, joinPartida, leavePartida, updateEstadoPartida } from "@/lib/partidas";
import type { Partida } from "@/types";

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

const TRANSITIONS: Partial<Record<Partida["estado"], Partida["estado"][]>> = {
  borrador: ["confirmada", "cancelada"],
  confirmada: ["jugada", "cancelada"],
};

export function PartidaDetailScreen({ salaId, partidaId }: { salaId: string; partidaId: string }) {
  const { user, perfil } = useAuthStore();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);

  const { data: partida, isLoading } = useQuery({
    queryKey: ["partida", salaId, partidaId],
    queryFn: () => getPartida(salaId, partidaId),
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-40 bg-white rounded-xl animate-pulse" />
        <div className="h-24 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!partida) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔍</p>
        <p className="font-medium">Partida no encontrada</p>
        <Link href={`/sala/${salaId}`} className="text-[#0D9488] text-sm mt-2 block">
          Volver a la sala
        </Link>
      </div>
    );
  }

  const isConfirmado = user ? partida.jugadoresConfirmados.includes(user.uid) : false;
  const isCreador = user?.uid === partida.creadorId;
  const canManage = perfil && ["gestor", "admin", "superadmin"].includes(perfil.rol);
  const plazasOcupadas = partida.jugadoresConfirmados.length;
  const plazasLibres = partida.plazasMax > 0 ? partida.plazasMax - plazasOcupadas : null;
  const puedeUnirse =
    user &&
    !isConfirmado &&
    partida.estado === "confirmada" &&
    (plazasLibres === null || plazasLibres > 0);
  const puedeSalir = user && isConfirmado && !isCreador && partida.estado === "confirmada";

  const jugadoresPendientes = partida.jugadoresPendientes as Array<string | { nombre: string }>;
  const pendientesNombres = jugadoresPendientes.map((j) =>
    typeof j === "string" ? j : j.nombre,
  );

  async function handleJoin() {
    if (!user) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await joinPartida(salaId, partidaId, user.uid);
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      qc.invalidateQueries({ queryKey: ["partidas", salaId] });
    } catch {
      setActionError("Error al unirse. Inténtalo de nuevo.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleLeave() {
    if (!user) return;
    setActionLoading(true);
    setActionError(null);
    try {
      await leavePartida(salaId, partidaId, user.uid);
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      qc.invalidateQueries({ queryKey: ["partidas", salaId] });
    } catch {
      setActionError("Error al salir. Inténtalo de nuevo.");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleEstado(nuevoEstado: Partida["estado"]) {
    setActionLoading(true);
    setActionError(null);
    try {
      await updateEstadoPartida(salaId, partidaId, nuevoEstado);
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      qc.invalidateQueries({ queryKey: ["partidas", salaId] });
    } catch {
      setActionError("Error al cambiar el estado.");
    } finally {
      setActionLoading(false);
    }
  }

  const transitions = TRANSITIONS[partida.estado] ?? [];

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <Link
        href={`/sala/${salaId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488]"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la sala
      </Link>

      {/* Header */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
        <div className="flex items-start justify-between gap-2">
          <h1 className="text-xl font-bold text-[#334155] flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-[#0D9488]" />
            Partida
          </h1>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLORS[partida.estado]}`}>
            {ESTADO_LABELS[partida.estado]}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="flex items-center gap-2 text-slate-600">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            <span>{partida.fecha} · {partida.hora}</span>
          </div>
          {partida.duracionMinutos > 0 && (
            <div className="flex items-center gap-2 text-slate-600">
              <Clock className="w-4 h-4 text-slate-400" />
              <span>{partida.duracionMinutos} min</span>
            </div>
          )}
        </div>

        {partida.notas && (
          <div className="flex items-start gap-2 text-sm text-slate-600 bg-slate-50 rounded-lg p-3">
            <StickyNote className="w-4 h-4 text-slate-400 mt-0.5 shrink-0" />
            <p>{partida.notas}</p>
          </div>
        )}
      </div>

      {/* Jugadores */}
      <div className="bg-white rounded-xl shadow-sm p-5 space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-[#334155] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0D9488]" />
            Jugadores
          </h2>
          <span className="text-sm text-slate-500">
            {plazasOcupadas}
            {partida.plazasMax > 0 && `/${partida.plazasMax}`} confirmados
          </span>
        </div>

        {plazasLibres !== null && (
          <div className="w-full bg-slate-100 rounded-full h-1.5">
            <div
              className="bg-[#0D9488] h-1.5 rounded-full transition-all"
              style={{ width: `${Math.min(100, (plazasOcupadas / partida.plazasMax) * 100)}%` }}
            />
          </div>
        )}

        {pendientesNombres.length > 0 && (
          <div>
            <p className="text-xs text-slate-400 mb-1.5">Pendientes de registro</p>
            <div className="flex flex-wrap gap-1.5">
              {pendientesNombres.map((nombre, i) => (
                <span key={i} className="text-xs bg-amber-50 text-amber-700 px-2.5 py-1 rounded-full">
                  {nombre}
                </span>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Acciones */}
      {actionError && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {actionError}
        </div>
      )}

      {(puedeUnirse || puedeSalir) && (
        <div className="flex gap-3">
          {puedeUnirse && (
            <button
              onClick={handleJoin}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              <UserCheck className="w-4 h-4" />
              Unirme a la partida
            </button>
          )}
          {puedeSalir && (
            <button
              onClick={handleLeave}
              disabled={actionLoading}
              className="flex-1 flex items-center justify-center gap-2 border border-red-200 text-red-500 py-2.5 rounded-xl font-medium hover:bg-red-50 transition-colors disabled:opacity-50"
            >
              <UserMinus className="w-4 h-4" />
              Salir de la partida
            </button>
          )}
        </div>
      )}

      {/* Gestión de estado (gestor+) */}
      {canManage && (isCreador || perfil.rol !== "gestor") && transitions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-[#334155] mb-3">Cambiar estado</p>
          <div className="flex gap-2 flex-wrap">
            {transitions.map((estado) => (
              <button
                key={estado}
                onClick={() => handleEstado(estado)}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${ESTADO_COLORS[estado]} border-current`}
              >
                → {ESTADO_LABELS[estado]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Login prompt */}
      {!user && partida.estado === "confirmada" && (
        <div className="text-center py-4 text-sm text-slate-400">
          <Link href="/login" className="text-[#0D9488] font-medium hover:underline">
            Inicia sesión
          </Link>{" "}
          para unirte a esta partida
        </div>
      )}
    </div>
  );
}
