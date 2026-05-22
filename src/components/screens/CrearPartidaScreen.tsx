"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Plus } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { crearPartida } from "@/lib/partidas";

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

  const [jugadoresPendientes, setJugadoresPendientes] = useState<string[]>([]);
  const [nuevoJugador, setNuevoJugador] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: { estado: "confirmada" },
  });

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
  }

  function removeJugador(nombre: string) {
    setJugadoresPendientes((prev) => prev.filter((j) => j !== nombre));
  }

  async function onSubmit(data: FormValues) {
    if (!user) return;
    setSubmitError(null);
    try {
      const id = await crearPartida({
        salaId,
        fecha: data.fecha,
        hora: data.hora,
        plazasMax: parseInt(data.plazasMax, 10),
        notas: data.notas,
        jugadoresPendientes,
        estado: data.estado,
        creadorId: user.uid,
      });
      router.push(`/sala/${salaId}/partida/${id}`);
    } catch {
      setSubmitError("Error al guardar la partida. Inténtalo de nuevo.");
    }
  }

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
            <Field label="Plazas máximas" required error={errors.plazasMax?.message}>
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

          {/* Jugadores pendientes (externos, sin cuenta) */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">
              Jugadores pendientes
              <span className="text-xs text-slate-400 font-normal ml-1">(sin cuenta en la app)</span>
            </label>
            <div className="flex gap-2 mb-2">
              <input
                value={nuevoJugador}
                onChange={(e) => setNuevoJugador(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addJugador())}
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
            {jugadoresPendientes.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {jugadoresPendientes.map((nombre) => (
                  <span
                    key={nombre}
                    className="inline-flex items-center gap-1 bg-teal-50 text-teal-700 text-xs px-2.5 py-1 rounded-full"
                  >
                    {nombre}
                    <button
                      type="button"
                      onClick={() => removeJugador(nombre)}
                      className="hover:text-teal-900"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
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
