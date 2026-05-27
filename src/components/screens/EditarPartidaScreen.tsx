"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, X, Plus, Search, UserCircle, AlertTriangle, Info, CalendarDays, Clock } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPartida, updatePartida } from "@/lib/partidas";
import { getPerfil, buscarUsuariosPorNick } from "@/lib/usuarios";
import type { Usuario } from "@/types";

const schema = z.object({
  plazasMax: z
    .string()
    .min(1, "Campo obligatorio")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 20, {
      message: "Entre 1 y 20",
    }),
  notas: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export function EditarPartidaScreen({ salaId, partidaId }: { salaId: string; partidaId: string }) {
  const router = useRouter();
  const qc = useQueryClient();
  const { user, perfil } = useAuthStore();

  // Jugadores registrados
  const [jugadoresRegistrados, setJugadoresRegistrados] = useState<Usuario[]>([]);
  const [busquedaNick, setBusquedaNick] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Usuario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const busquedaRef = useRef<HTMLDivElement>(null);

  // Jugadores sin cuenta
  const [jugadoresPendientes, setJugadoresPendientes] = useState<string[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState("");
  const [pendingWarning, setPendingWarning] = useState(false);

  const [initialized, setInitialized] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const { register, handleSubmit, reset, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const { data: partida, isLoading: loadingPartida } = useQuery({
    queryKey: ["partida", salaId, partidaId],
    queryFn: () => getPartida(salaId, partidaId),
  });

  const { data: perfilesIniciales, isLoading: loadingPerfiles } = useQuery<Usuario[]>({
    queryKey: ["jugadores-editar-perfiles", salaId, partidaId],
    queryFn: async () => {
      const profiles = await Promise.all(
        (partida?.jugadoresConfirmados ?? []).map((uid) => getPerfil(uid)),
      );
      return profiles.filter(Boolean) as Usuario[];
    },
    enabled: !!partida && partida.jugadoresConfirmados.length > 0,
  });

  // Inicializar estado del formulario una sola vez
  useEffect(() => {
    if (!partida || initialized) return;
    const perfilesListos = partida.jugadoresConfirmados.length === 0 || perfilesIniciales;
    if (!perfilesListos) return;

    reset({
      plazasMax: String(partida.plazasMax),
      notas: partida.notas ?? "",
    });
    setJugadoresRegistrados(perfilesIniciales ?? []);
    const pendientes = (partida.jugadoresPendientes as Array<{ nombre: string }>)
      .filter((j) => j?.nombre)
      .map((j) => j.nombre);
    setJugadoresPendientes(pendientes);
    setInitialized(true);
  }, [partida, perfilesIniciales, initialized, reset]);

  // Búsqueda con debounce
  useEffect(() => {
    if (busquedaNick.trim().length < 2) {
      setResultadosBusqueda([]);
      return;
    }
    const timer = setTimeout(async () => {
      setBuscando(true);
      try {
        const results = await buscarUsuariosPorNick(busquedaNick.trim());
        const filtrados = results.filter(
          (u) => !jugadoresRegistrados.some((j) => j.uid === u.uid),
        );
        setResultadosBusqueda(filtrados);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [busquedaNick, jugadoresRegistrados]);

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (busquedaRef.current && !busquedaRef.current.contains(e.target as Node)) {
        setResultadosBusqueda([]);
        setBusquedaNick("");
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  if (loadingPartida || loadingPerfiles || !initialized) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
        <div className="h-10 w-32 bg-white rounded-xl animate-pulse" />
        <div className="h-64 bg-white rounded-xl animate-pulse" />
        <div className="h-48 bg-white rounded-xl animate-pulse" />
      </div>
    );
  }

  if (!partida) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="font-medium">Partida no encontrada</p>
        <Link href={`/sala/${salaId}`} className="text-[#0D9488] text-sm mt-2 block">
          Volver a la sala
        </Link>
      </div>
    );
  }

  const canEdit =
    perfil &&
    (["admin", "superadmin"].includes(perfil.rol) ||
      (["gestor"].includes(perfil.rol) && user?.uid === partida.creadorId)) &&
    partida.estado !== "cancelada" &&
    partida.estado !== "jugada";

  if (!canEdit) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">No tienes permiso para editar esta partida</p>
        <Link
          href={`/sala/${salaId}/partida/${partidaId}`}
          className="text-[#0D9488] text-sm mt-2 block"
        >
          Volver a la partida
        </Link>
      </div>
    );
  }

  function addRegistrado(u: Usuario) {
    setJugadoresRegistrados((prev) => [...prev, u]);
    setResultadosBusqueda([]);
    setBusquedaNick("");
  }

  function removeRegistrado(uid: string) {
    setJugadoresRegistrados((prev) => prev.filter((u) => u.uid !== uid));
  }

  function addJugador() {
    const nombre = nuevoJugador.trim();
    if (!nombre || jugadoresPendientes.includes(nombre)) return;
    setJugadoresPendientes((prev) => [...prev, nombre]);
    setNuevoJugador("");
    setPendingWarning(false);
  }

  function removeJugador(nombre: string) {
    setJugadoresPendientes((prev) => prev.filter((j) => j !== nombre));
  }

  async function onSubmit(data: FormValues) {
    setSubmitError(null);
    try {
      await updatePartida(salaId, partidaId, {
        jugadoresConfirmados: jugadoresRegistrados.map((u) => u.uid),
        jugadoresPendientes,
        plazasMax: parseInt(data.plazasMax, 10),
        notas: data.notas ?? "",
      });
      qc.invalidateQueries({ queryKey: ["partida", salaId, partidaId] });
      router.push(`/sala/${salaId}/partida/${partidaId}`);
    } catch {
      setSubmitError("Error al guardar. Inténtalo de nuevo.");
    }
  }

  const sinResultados =
    busquedaNick.trim().length >= 2 && !buscando && resultadosBusqueda.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        href={`/sala/${salaId}/partida/${partidaId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la partida
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        <h1 className="text-xl font-bold text-[#334155]">Editar partida</h1>

        {/* Aviso fecha/hora */}
        <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
          <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <p className="text-sm text-amber-700">
            Para cambiar la fecha u hora cancela esta partida y crea una nueva.
          </p>
        </div>

        {/* Fecha y hora (solo lectura) */}
        <div className="flex gap-4 text-sm text-slate-500">
          <span className="flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-slate-400" />
            {partida.fecha}
          </span>
          <span className="flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-slate-400" />
            {partida.hora}
          </span>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Número de jugadores */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">
              Número de jugadores <span className="text-red-500">*</span>
            </label>
            <input
              {...register("plazasMax")}
              type="number"
              min={1}
              max={20}
              className={inputCls}
            />
            {errors.plazasMax && (
              <p className="text-xs text-red-500 mt-1">{errors.plazasMax.message}</p>
            )}
          </div>

          {/* Jugadores */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-[#334155]">Jugadores</p>

            {/* Con cuenta */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Con cuenta</p>

              {jugadoresRegistrados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {jugadoresRegistrados.map((u) => (
                    <span
                      key={u.uid}
                      className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {u.fotoUrl ? (
                        <Image
                          src={u.fotoUrl}
                          alt={u.nick}
                          width={16}
                          height={16}
                          className="rounded-full object-cover"
                        />
                      ) : (
                        <UserCircle className="w-3.5 h-3.5" />
                      )}
                      {u.nick}
                      <button
                        type="button"
                        onClick={() => removeRegistrado(u.uid)}
                        className="hover:text-teal-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              <div className="relative" ref={busquedaRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    value={busquedaNick}
                    onChange={(e) => setBusquedaNick(e.target.value)}
                    placeholder="Buscar jugador por nick…"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                {(buscando || resultadosBusqueda.length > 0 || sinResultados) && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-md overflow-hidden">
                    {buscando && (
                      <div className="px-4 py-3 text-sm text-slate-400">Buscando…</div>
                    )}
                    {sinResultados && (
                      <div className="px-4 py-3 text-sm text-slate-400">Sin resultados</div>
                    )}
                    {resultadosBusqueda.map((u) => (
                      <button
                        key={u.uid}
                        type="button"
                        onClick={() => addRegistrado(u)}
                        className="w-full flex items-center gap-3 px-4 py-2.5 hover:bg-slate-50 transition-colors text-left"
                      >
                        {u.fotoUrl ? (
                          <Image
                            src={u.fotoUrl}
                            alt={u.nick}
                            width={28}
                            height={28}
                            className="rounded-full object-cover shrink-0"
                          />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                            <UserCircle className="w-4 h-4 text-teal-600" />
                          </div>
                        )}
                        <span className="text-sm text-[#334155]">{u.nick}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Sin cuenta */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Sin cuenta en la app</p>
              <div className="flex gap-2">
                <input
                  value={nuevoJugador}
                  onChange={(e) => { setNuevoJugador(e.target.value); setPendingWarning(false); }}
                  onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addJugador())}
                  onBlur={() => setPendingWarning(nuevoJugador.trim().length > 0)}
                  placeholder="Nombre del jugador"
                  className={`${inputCls} flex-1`}
                />
                <button
                  type="button"
                  onClick={addJugador}
                  className="px-3 py-2 rounded-xl border border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <Plus className="w-4 h-4 text-[#0D9488]" />
                </button>
              </div>
              {pendingWarning && (
                <div className="flex items-center gap-1.5 text-xs text-amber-600">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  Pulsa + o Enter para añadir este jugador a la lista
                </div>
              )}
              {jugadoresPendientes.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {jugadoresPendientes.map((nombre) => (
                    <span
                      key={nombre}
                      className="inline-flex items-center gap-1 bg-amber-50 text-amber-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {nombre}
                      <button
                        type="button"
                        onClick={() => removeJugador(nombre)}
                        className="hover:text-amber-900"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Notas */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">Notas</label>
            <textarea
              {...register("notas")}
              rows={3}
              placeholder="Punto de encuentro, recordatorios..."
              className={`${inputCls} resize-none`}
            />
            {errors.notas && (
              <p className="text-xs text-red-500 mt-1">{errors.notas.message}</p>
            )}
          </div>

          {submitError && <p className="text-sm text-red-500">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => router.back()}
              className="flex-1 border border-slate-200 text-[#334155] py-2.5 rounded-xl font-medium hover:bg-slate-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando…" : "Guardar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
