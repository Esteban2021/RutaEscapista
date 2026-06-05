"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, Users, UserCircle, Check, HelpCircle, Building2 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPartida, reclamarJugadorPendiente, confirmarJugadorPorUid } from "@/lib/partidas";
import { getSala } from "@/lib/salas";
import { getPerfil } from "@/lib/usuarios";
import type { Usuario } from "@/types";

const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
function diaSemana(fecha: string) {
  const [y, m, d] = fecha.split("-").map(Number);
  return DIAS[new Date(y, m - 1, d).getDay()];
}

export function InvitacionScreen({
  salaId,
  partidaId,
  token,
}: {
  salaId: string;
  partidaId: string;
  token: string;
}) {
  const { user } = useAuthStore();
  const qc = useQueryClient();
  const [reclamando, setReclamando] = useState<string | null>(null);
  const [reclamadoOk, setReclamadoOk] = useState(false);
  const [confirmadoOk, setConfirmadoOk] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const { data: partida, isLoading: loadingPartida } = useQuery({
    queryKey: ["partida", salaId, partidaId],
    queryFn: () => getPartida(salaId, partidaId),
  });

  const { data: sala, isLoading: loadingSala } = useQuery({
    queryKey: ["sala", salaId],
    queryFn: () => getSala(salaId),
    enabled: !!partida,
  });

  const { data: creadorPerfil } = useQuery<Usuario | null>({
    queryKey: ["perfil", partida?.creadorId],
    queryFn: () => getPerfil(partida!.creadorId),
    enabled: !!partida?.creadorId,
  });

  const { data: perfilesConfirmados } = useQuery<Usuario[]>({
    queryKey: ["jugadores-inv-perfiles", partidaId],
    queryFn: async () => {
      const profiles = await Promise.all(
        (partida?.jugadoresConfirmados ?? []).map((uid) => getPerfil(uid)),
      );
      return profiles.filter(Boolean) as Usuario[];
    },
    enabled: !!partida && !!user,
  });

  if (loadingPartida || loadingSala) {
    return (
      <div className="max-w-lg mx-auto px-4 py-12 space-y-4">
        <div className="h-40 bg-white rounded-xl animate-pulse" />
        <div className="h-32 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!partida || partida.invitacionToken !== token) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔗</p>
        <p className="font-medium">Enlace de invitación no válido</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-3 block">
          Ver salas
        </Link>
      </div>
    );
  }

  if (partida.estado === "cancelada") {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">❌</p>
        <p className="font-medium">Esta partida ha sido cancelada</p>
      </div>
    );
  }

  const todosPendientes = (partida.jugadoresPendientes ?? []) as Array<{ nombre: string; uid?: string }>;
  const pendientesRegistrados = todosPendientes.filter((j) => j.uid);
  const pendientesNoRegistrados = todosPendientes.filter((j) => !j.uid);

  const yaConfirmado = user ? partida.jugadoresConfirmados.includes(user.uid) : false;
  const tieneInvitacionPendiente = user ? pendientesRegistrados.some((j) => j.uid === user.uid) : false;
  const yaResuelto = reclamadoOk || confirmadoOk || yaConfirmado;

  async function handleReclamar(nombre: string) {
    if (!user) return;
    setReclamando(nombre);
    setError(null);
    try {
      await reclamarJugadorPendiente(salaId, partidaId, nombre, user.uid);
      setReclamadoOk(true);
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      qc.invalidateQueries({ queryKey: ["jugadores-inv-perfiles", partidaId] });
    } catch {
      setError("No se pudo completar la acción. Inténtalo de nuevo.");
    } finally {
      setReclamando(null);
    }
  }

  async function handleConfirmar() {
    if (!user) return;
    setReclamando("__confirmar__");
    setError(null);
    try {
      await confirmarJugadorPorUid(salaId, partidaId, user.uid);
      setConfirmadoOk(true);
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      qc.invalidateQueries({ queryKey: ["jugadores-inv-perfiles", partidaId] });
    } catch {
      setError("No se pudo confirmar la asistencia. Inténtalo de nuevo.");
    } finally {
      setReclamando(null);
    }
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-lg mx-auto px-4 py-8 space-y-4">

        {/* Cabecera */}
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {sala?.imagenUrl && (
            <div className="relative w-full h-44">
              <Image
                src={sala.imagenUrl}
                alt={sala.nombreSala}
                fill
                className="object-cover"
              />
            </div>
          )}
          <div className="p-5 space-y-3">
          <div className="flex items-center gap-2 text-xs text-slate-400 font-medium uppercase tracking-wide">
            <Building2 className="w-3.5 h-3.5" />
            Invitación a partida de escape room
          </div>

          <h1 className="text-xl font-bold text-[#334155]">
            {sala?.nombreSala ?? "Sala de escape"}
          </h1>

          {sala?.direccion?.ciudad && (
            <p className="text-sm text-slate-500">{sala.direccion.ciudad}</p>
          )}

          <div className="flex flex-wrap gap-4 text-sm text-slate-600">
            <span className="flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-slate-400" />
              {partida.fecha} · {diaSemana(partida.fecha)}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-slate-400" />
              {partida.hora}
            </span>
            <span className="flex items-center gap-1.5">
              <Users className="w-4 h-4 text-slate-400" />
              {partida.jugadoresConfirmados.length}
              {partida.plazasMax > 0 && `/${partida.plazasMax}`} jugadores
            </span>
          </div>

          {creadorPerfil && (
            <p className="text-xs text-slate-400">
              Organizada por{" "}
              <span className="font-medium text-[#334155]">{creadorPerfil.nick}</span>
            </p>
          )}
          </div>
        </div>

        {/* Sin sesión: prompt para login/registro */}
        {!user && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <p className="text-sm text-slate-500 text-center">
              Inicia sesión o regístrate para ver la lista de jugadores y unirte a la partida.
            </p>
            <div className="flex gap-3">
              <Link
                href={`/login?redirect=/invitacion/${salaId}/${partidaId}/${token}`}
                className="flex-1 text-center bg-[#0D9488] text-white py-2.5 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
              >
                Iniciar sesión
              </Link>
              <Link
                href={`/registro?redirect=/invitacion/${salaId}/${partidaId}/${token}`}
                className="flex-1 text-center border border-slate-200 text-[#334155] py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors"
              >
                Registrarme
              </Link>
            </div>
          </div>
        )}

        {/* Con sesión: lista de jugadores */}
        {user && (
          <div className="bg-white rounded-xl shadow-sm p-5 space-y-4">
            <h2 className="text-sm font-semibold text-[#334155]">Jugadores</h2>

            {error && (
              <p className="text-xs text-red-500 bg-red-50 px-3 py-2 rounded-lg">{error}</p>
            )}

            {/* Confirmados */}
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
                    <span className="text-sm text-[#334155] flex-1 min-w-0 truncate">{p.nick}</span>
                    {p.uid === user.uid && (
                      <span className="text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full shrink-0">Tú</span>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Invitados registrados pendientes */}
            {pendientesRegistrados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Invitados pendientes</p>
                {pendientesRegistrados.map((j) => {
                  const esMio = j.uid === user.uid;
                  return (
                    <div key={j.uid} className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-amber-100 flex items-center justify-center shrink-0">
                        <UserCircle className="w-5 h-5 text-amber-500" />
                      </div>
                      <span className="text-sm text-[#334155] flex-1 min-w-0 truncate">{j.nombre}</span>
                      {esMio && !yaResuelto ? (
                        <button
                          onClick={handleConfirmar}
                          disabled={!!reclamando}
                          className="text-xs bg-[#0D9488] text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 shrink-0"
                        >
                          {reclamando === "__confirmar__" ? "…" : "Confirmar asistencia"}
                        </button>
                      ) : (
                        <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full shrink-0">
                          Pendiente
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Pendientes sin cuenta */}
            {pendientesNoRegistrados.length > 0 && (
              <div className="space-y-2">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pendientes de confirmar</p>
                {pendientesNoRegistrados.map((j, i) => (
                  <div key={i} className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0">
                      <UserCircle className="w-5 h-5 text-slate-400" />
                    </div>
                    <span className="text-sm text-[#334155] flex-1">{j.nombre}</span>
                    {!yaResuelto && (
                      <button
                        onClick={() => handleReclamar(j.nombre)}
                        disabled={!!reclamando}
                        className="text-xs bg-[#0D9488] text-white px-3 py-1.5 rounded-lg hover:bg-teal-700 transition-colors disabled:opacity-50 shrink-0"
                      >
                        {reclamando === j.nombre ? "…" : "Yo soy esta persona"}
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* No aparece en ninguna lista */}
            {!yaResuelto && !tieneInvitacionPendiente && pendientesNoRegistrados.length > 0 && (
              <div className="flex items-start gap-2 bg-slate-50 rounded-xl px-3 py-3">
                <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                <p className="text-xs text-slate-500">
                  ¿No apareces en la lista? Contacta con el organizador para que te añada.
                </p>
              </div>
            )}

            {/* Sin pendientes y no confirmado */}
            {!yaConfirmado && !confirmadoOk && !reclamadoOk && pendientesNoRegistrados.length === 0 && !tieneInvitacionPendiente && partida.estado === "confirmada" && (
              <p className="text-xs text-slate-400 text-center">
                El organizador tiene que añadirte a la partida para que aparezcas aquí.
              </p>
            )}

            {/* Feedback éxito */}
            {(reclamadoOk || confirmadoOk) && (
              <div className="flex items-center gap-2 bg-teal-50 text-teal-700 rounded-xl px-4 py-3 text-sm">
                <Check className="w-4 h-4 shrink-0" />
                ¡Ya estás confirmado en la partida!
              </div>
            )}

            <Link
              href={`/sala/${salaId}/partida/${partidaId}`}
              className="block text-center text-sm text-[#0D9488] hover:underline"
            >
              Ver ficha completa de la partida →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
