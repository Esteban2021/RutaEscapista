"use client";

import Link from "next/link";
import Image from "next/image";
import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  ArrowLeft, CalendarDays, Clock, Users, StickyNote,
  UserCheck, UserMinus, AlertCircle, ChevronDown, ChevronUp, UserCircle, Pencil,
} from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPartida, joinPartida, leavePartida, updateEstadoPartida } from "@/lib/partidas";
import { getPerfil } from "@/lib/usuarios";
import type { Partida, Usuario } from "@/types";

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
  confirmada: ["cancelada"],
};

// Solo admins pueden forzar manualmente el paso a "jugada" (corrección)
const ADMIN_TRANSITIONS: Partial<Record<Partida["estado"], Partida["estado"][]>> = {
  confirmada: ["jugada"],
};

export function PartidaDetailScreen({ salaId, partidaId }: { salaId: string; partidaId: string }) {
  const { user, perfil } = useAuthStore();
  const qc = useQueryClient();
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [expandedJugadores, setExpandedJugadores] = useState(false);

  const { data: partida, isLoading } = useQuery({
    queryKey: ["partida", salaId, partidaId],
    queryFn: () => getPartida(salaId, partidaId),
  });

  const { data: perfilesConfirmados, isLoading: loadingPerfiles } = useQuery<Usuario[]>({
    queryKey: ["jugadores-perfiles", partida?.jugadoresConfirmados ?? []],
    queryFn: async () => {
      const profiles = await Promise.all(
        (partida?.jugadoresConfirmados ?? []).map((uid) => getPerfil(uid)),
      );
      return profiles.filter(Boolean) as Usuario[];
    },
    enabled: expandedJugadores && (partida?.jugadoresConfirmados?.length ?? 0) > 0,
  });

  // Transición automática a "jugada" cuando el tiempo ha expirado
  useEffect(() => {
    if (!partida || partida.estado !== "confirmada" || !partida.fechaHoraInicio) return;
    const duracion = partida.duracionMinutos > 0 ? partida.duracionMinutos : 90;
    const endMs = partida.fechaHoraInicio.toMillis() + duracion * 60 * 1000;
    if (Date.now() > endMs) {
      updateEstadoPartida(salaId, partidaId, "jugada").then(() => {
        qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
        qc.invalidateQueries({ queryKey: ["partidas", salaId] });
      });
    }
  }, [partida, salaId, partidaId, qc]);

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
  const isAdmin = perfil && ["admin", "superadmin"].includes(perfil.rol);
  const adminTransitions = isAdmin ? (ADMIN_TRANSITIONS[partida.estado] ?? []) : [];
  const allTransitions = [...transitions, ...adminTransitions];

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
          <div className="flex items-center gap-2">
            <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${ESTADO_COLORS[partida.estado]}`}>
              {ESTADO_LABELS[partida.estado]}
            </span>
            {canManage &&
              (isCreador || perfil.rol !== "gestor") &&
              partida.estado !== "cancelada" &&
              partida.estado !== "jugada" && (
                <Link
                  href={`/sala/${salaId}/partida/${partidaId}/editar`}
                  className="p-1.5 rounded-lg hover:bg-slate-50 text-slate-400 hover:text-[#0D9488] transition-colors"
                >
                  <Pencil className="w-4 h-4" />
                </Link>
              )}
          </div>
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
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <button
          onClick={() => setExpandedJugadores((v) => !v)}
          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 transition-colors"
        >
          <h2 className="font-semibold text-[#334155] flex items-center gap-2">
            <Users className="w-4 h-4 text-[#0D9488]" />
            Jugadores
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-sm text-slate-500">
              {plazasOcupadas}
              {partida.plazasMax > 0 && `/${partida.plazasMax}`} confirmados
            </span>
            {expandedJugadores
              ? <ChevronUp className="w-4 h-4 text-slate-400" />
              : <ChevronDown className="w-4 h-4 text-slate-400" />}
          </div>
        </button>

        {plazasLibres !== null && (
          <div className="px-5 pb-3">
            <div className="w-full bg-slate-100 rounded-full h-1.5">
              <div
                className="bg-[#0D9488] h-1.5 rounded-full transition-all"
                style={{ width: `${Math.min(100, (plazasOcupadas / partida.plazasMax) * 100)}%` }}
              />
            </div>
          </div>
        )}

        {expandedJugadores && (
          <div className="border-t border-slate-100 px-5 py-4 space-y-4">
            {loadingPerfiles ? (
              <div className="space-y-3">
                {Array.from({ length: plazasOcupadas || 1 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse shrink-0" />
                    <div className="h-4 bg-slate-100 rounded animate-pulse flex-1" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                {(perfilesConfirmados?.length ?? 0) > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Confirmados</p>
                    {perfilesConfirmados!.map((p) => (
                      <div key={p.uid} className="flex items-center gap-3">
                        {p.fotoUrl ? (
                          <Image
                            src={p.fotoUrl}
                            alt={p.nick}
                            width={32}
                            height={32}
                            className="rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <UserCircle className="w-5 h-5 text-teal-600" />
                          </div>
                        )}
                        <span className="text-sm text-[#334155] flex-1 min-w-0 truncate">
                          {p.nick || p.nombre || "Usuario"}
                        </span>
                        <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full shrink-0">
                          Confirmado
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {pendientesNombres.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sin cuenta</p>
                    {pendientesNombres.map((nombre, i) => (
                      <div key={i} className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                          <UserCircle className="w-5 h-5 text-slate-400" />
                        </div>
                        <span className="text-sm text-[#334155] flex-1 min-w-0 truncate">{nombre}</span>
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                          Pendiente
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {plazasOcupadas === 0 && pendientesNombres.length === 0 && (
                  <p className="text-sm text-slate-400 text-center py-2">Ningún jugador aún</p>
                )}
              </>
            )}
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
      {canManage && (isCreador || perfil.rol !== "gestor") && allTransitions.length > 0 && (
        <div className="bg-white rounded-xl shadow-sm p-5">
          <p className="text-sm font-medium text-[#334155] mb-3">Cambiar estado</p>
          <div className="flex gap-2 flex-wrap">
            {allTransitions.map((estado) => (
              <button
                key={estado}
                onClick={() => estado === "cancelada" ? setShowCancelDialog(true) : handleEstado(estado)}
                disabled={actionLoading}
                className={`px-4 py-2 rounded-xl text-sm font-medium border transition-colors disabled:opacity-50 ${ESTADO_COLORS[estado]} border-current`}
              >
                {estado === "cancelada" ? "Cancelar partida" : estado === "jugada" ? "Partida ya jugada" : ESTADO_LABELS[estado]}
              </button>
            ))}
          </div>

          {showCancelDialog && (
            <div className="mt-4 border border-red-200 rounded-xl bg-red-50 p-4 space-y-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-5 h-5 text-red-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-red-700">¿Cancelar esta partida?</p>
                  <p className="text-sm text-red-600 mt-1">
                    La partida quedará marcada como <strong>Cancelada</strong> y no podrá reactivarse.
                    Los jugadores confirmados perderán su plaza y deberán unirse de nuevo si se organiza
                    una nueva partida.
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowCancelDialog(false)}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium border border-slate-200 text-[#334155] hover:bg-white transition-colors disabled:opacity-50"
                >
                  Volver
                </button>
                <button
                  onClick={() => { setShowCancelDialog(false); handleEstado("cancelada"); }}
                  disabled={actionLoading}
                  className="px-4 py-2 rounded-xl text-sm font-medium bg-red-500 text-white hover:bg-red-600 transition-colors disabled:opacity-50"
                >
                  Confirmar cancelación
                </button>
              </div>
            </div>
          )}
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
