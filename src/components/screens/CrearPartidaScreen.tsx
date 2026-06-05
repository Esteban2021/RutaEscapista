"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, X, Plus, Search, UserCircle, AlertTriangle } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { crearPartida } from "@/lib/partidas";
import { buscarUsuariosPorNick } from "@/lib/usuarios";
import type { Usuario } from "@/types";

const schema = z.object({
  fecha: z.string().min(1, "La fecha es obligatoria"),
  hora: z.string().min(1, "La hora es obligatoria"),
  plazasMax: z
    .string()
    .min(1, "Campo obligatorio")
    .refine((v) => !isNaN(Number(v)) && Number(v) >= 1 && Number(v) <= 20, {
      message: "Entre 1 y 20 plazas",
    }),
  estado: z.enum(["borrador", "confirmada"]),
  notas: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

function Field({
  label, error, required, children,
}: {
  label: string; error?: string; required?: boolean; children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-[#334155] mb-1">
        {label} {required && <span className="text-red-500">*</span>}
      </label>
      {children}
      {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
    </div>
  );
}

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export function CrearPartidaScreen() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const salaId = searchParams.get("salaId") ?? "";
  const { user, perfil } = useAuthStore();

  // Jugadores sin cuenta
  const [jugadoresPendientes, setJugadoresPendientes] = useState<string[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState("");
  const [pendingWarning, setPendingWarning] = useState(false);

  // Jugadores registrados
  const [creadorJuega, setCreadorJuega] = useState(true);
  const [jugadoresRegistrados, setJugadoresRegistrados] = useState<Usuario[]>([]);
  const [busquedaNick, setBusquedaNick] = useState("");
  const [resultadosBusqueda, setResultadosBusqueda] = useState<Usuario[]>([]);
  const [buscando, setBuscando] = useState(false);
  const busquedaRef = useRef<HTMLDivElement>(null);

  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: "confirmada", plazasMax: "2" },
  });

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
          (u) => u.uid !== user?.uid && !jugadoresRegistrados.some((j) => j.uid === u.uid),
        );
        setResultadosBusqueda(filtrados);
      } finally {
        setBuscando(false);
      }
    }, 350);
    return () => clearTimeout(timer);
  }, [busquedaNick, jugadoresRegistrados, user?.uid]);

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

  if (!perfil || !["gestor", "admin", "superadmin"].includes(perfil.rol)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Solo los gestores pueden crear partidas</p>
        {salaId && (
          <Link href={`/sala/${salaId}`} className="text-[#0D9488] text-sm mt-2 block">
            Volver a la sala
          </Link>
        )}
      </div>
    );
  }

  if (!salaId) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="font-medium">No se especificó ninguna sala</p>
        <Link href="/salas" className="text-[#0D9488] text-sm mt-2 block">
          Ir al listado de salas
        </Link>
      </div>
    );
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

  function addRegistrado(u: Usuario) {
    setJugadoresRegistrados((prev) => [...prev, u]);
    setResultadosBusqueda([]);
    setBusquedaNick("");
  }

  function removeRegistrado(uid: string) {
    setJugadoresRegistrados((prev) => prev.filter((u) => u.uid !== uid));
  }

  async function onSubmit(data: FormValues) {
    if (!user) return;
    setSubmitError(null);
    try {
      const jugadoresConfirmados = creadorJuega ? [user.uid] : [];
      const jugadoresInvitados = jugadoresRegistrados.map((u) => ({ uid: u.uid, nick: u.nick }));
      const id = await crearPartida({
        salaId,
        fecha: data.fecha,
        hora: data.hora,
        plazasMax: parseInt(data.plazasMax, 10),
        notas: data.notas,
        jugadoresConfirmados,
        jugadoresPendientes,
        jugadoresInvitados,
        estado: data.estado,
        creadorId: user.uid,
      });
      router.push(`/sala/${salaId}/partida/${id}`);
    } catch {
      setSubmitError("Error al guardar la partida. Inténtalo de nuevo.");
    }
  }

  const sinResultados =
    busquedaNick.trim().length >= 2 && !buscando && resultadosBusqueda.length === 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link
        href={`/sala/${salaId}`}
        className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Volver a la sala
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#334155] mb-6">Nueva partida</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Fecha y hora */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="Fecha" required error={errors.fecha?.message}>
              <input {...register("fecha")} type="date" className={inputCls} />
            </Field>
            <Field label="Hora" required error={errors.hora?.message}>
              <input {...register("hora")} type="time" className={inputCls} />
            </Field>
          </div>

          {/* Plazas y estado */}
          <div className="grid grid-cols-2 gap-3">
            <Field label="¿Cuantos jugadores van a jugar?" required error={errors.plazasMax?.message}>
              <input
                {...register("plazasMax")}
                type="number"
                min={1}
                max={20}
                placeholder="6"
                className={inputCls}
              />
            </Field>
            <Field label="Estado" error={errors.estado?.message}>
              <select {...register("estado")} className={inputCls}>
                <option value="confirmada">Confirmada</option>
                <option value="borrador">Borrador</option>
              </select>
            </Field>
          </div>

          {/* Jugadores */}
          <div className="border border-slate-200 rounded-xl p-4 space-y-4">
            <p className="text-sm font-medium text-[#334155]">Jugadores</p>

            {/* Registrados */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Con cuenta</p>

              {/* Creador */}
              <label className="flex items-center gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={creadorJuega}
                  onChange={(e) => setCreadorJuega(e.target.checked)}
                  className="rounded border-slate-300 text-teal-600 focus:ring-teal-500"
                />
                {perfil.fotoUrl ? (
                  <Image
                    src={perfil.fotoUrl}
                    alt={perfil.nick}
                    width={24}
                    height={24}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-teal-100 flex items-center justify-center">
                    <UserCircle className="w-4 h-4 text-teal-600" />
                  </div>
                )}
                <span className="text-sm text-[#334155]">{perfil.nick}</span>
                <span className="text-xs text-slate-400">(tú)</span>
              </label>

              {/* Búsqueda de usuarios */}
              <div className="relative" ref={busquedaRef}>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                  <input
                    value={busquedaNick}
                    onChange={(e) => setBusquedaNick(e.target.value)}
                    placeholder="Buscar más jugadores por nick…"
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

              {jugadoresRegistrados.length > 0 && (
                <p className="text-xs text-amber-600">
                  Deberán confirmar su asistencia en la ficha de la partida.
                </p>
              )}

              {jugadoresRegistrados.length > 0 && (
                <div className="flex flex-wrap gap-1.5">
                  {jugadoresRegistrados.map((u) => (
                    <span
                      key={u.uid}
                      className="inline-flex items-center gap-1.5 bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full"
                    >
                      {u.fotoUrl && (
                        <Image
                          src={u.fotoUrl}
                          alt={u.nick}
                          width={16}
                          height={16}
                          className="rounded-full object-cover"
                        />
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
            </div>

            {/* Sin cuenta */}
            <div className="space-y-2">
              <p className="text-xs font-medium text-blue-500 uppercase tracking-wide">Sin cuenta en la app</p>
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
          <Field label="Notas" error={errors.notas?.message}>
            <textarea
              {...register("notas")}
              rows={3}
              placeholder="Punto de encuentro, recordatorios..."
              className={`${inputCls} resize-none`}
            />
          </Field>

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
              {isSubmitting ? "Guardando..." : "Crear partida"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
