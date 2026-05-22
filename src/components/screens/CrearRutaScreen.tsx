"use client";

import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, X, Plus, GripVertical } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useAuthStore } from "@/store/authStore";
import { crearRuta } from "@/lib/rutas";
import { getSalas } from "@/lib/salas";

const schema = z.object({
  nombre: z.string().min(2, "Mínimo 2 caracteres").max(100, "Máximo 100 caracteres").trim(),
  descripcion: z.string().max(500, "Máximo 500 caracteres").optional(),
});

type FormValues = z.infer<typeof schema>;

const inputCls =
  "w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-teal-500";

export function CrearRutaScreen() {
  const router = useRouter();
  const { user, perfil } = useAuthStore();
  const [salasSeleccionadas, setSalasSeleccionadas] = useState<string[]>([]);
  const [salaSearch, setSalaSearch] = useState("");
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const { data: todasSalas = [] } = useQuery({
    queryKey: ["salas"],
    queryFn: getSalas,
  });

  if (!perfil || !["gestor", "admin", "superadmin"].includes(perfil.rol)) {
    return (
      <div className="max-w-lg mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Solo los gestores pueden crear rutas</p>
        <Link href="/rutas" className="text-[#0D9488] text-sm mt-2 block">
          Volver al listado
        </Link>
      </div>
    );
  }

  const salasFiltradas = todasSalas.filter(
    (s) =>
      !salasSeleccionadas.includes(s.id) &&
      s.nombreSala.toLowerCase().includes(salaSearch.toLowerCase()),
  );

  function addSala(id: string) {
    setSalasSeleccionadas((prev) => [...prev, id]);
    setSalaSearch("");
  }

  function removeSala(id: string) {
    setSalasSeleccionadas((prev) => prev.filter((s) => s !== id));
  }

  async function onSubmit(data: FormValues) {
    if (salasSeleccionadas.length < 2) {
      setSubmitError("Añade al menos 2 salas para crear una ruta.");
      return;
    }
    if (!user) return;
    setSubmitError(null);
    try {
      const id = await crearRuta({
        nombre: data.nombre,
        descripcion: data.descripcion,
        salaIds: salasSeleccionadas,
        creadorId: user.uid,
      });
      router.push(`/ruta/${id}`);
    } catch {
      setSubmitError("Error al guardar la ruta. Inténtalo de nuevo.");
    }
  }

  const salasOrdenadas = salasSeleccionadas
    .map((id) => todasSalas.find((s) => s.id === id))
    .filter(Boolean);

  return (
    <div className="max-w-2xl mx-auto px-4 py-6">
      <Link href="/rutas" className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488] mb-4">
        <ArrowLeft className="w-4 h-4" />
        Rutas
      </Link>

      <div className="bg-white rounded-xl shadow-sm p-6">
        <h1 className="text-xl font-bold text-[#334155] mb-6">Nueva ruta</h1>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {/* Nombre */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">
              Nombre <span className="text-red-500">*</span>
            </label>
            <input {...register("nombre")} placeholder="Ej: Ruta de terror madrileño" className={inputCls} />
            {errors.nombre && <p className="text-xs text-red-500 mt-1">{errors.nombre.message}</p>}
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">Descripción</label>
            <textarea
              {...register("descripcion")}
              rows={3}
              placeholder="Describe la ruta..."
              className={`${inputCls} resize-none`}
            />
            {errors.descripcion && <p className="text-xs text-red-500 mt-1">{errors.descripcion.message}</p>}
          </div>

          {/* Salas */}
          <div>
            <label className="block text-sm font-medium text-[#334155] mb-1">
              Salas <span className="text-red-500">*</span>
              <span className="text-xs text-slate-400 font-normal ml-1">(mínimo 2)</span>
            </label>

            {/* Salas seleccionadas */}
            {salasOrdenadas.length > 0 && (
              <ol className="space-y-1.5 mb-3">
                {salasOrdenadas.map((sala, i) => sala && (
                  <li
                    key={sala.id}
                    className="flex items-center gap-2 bg-slate-50 rounded-xl px-3 py-2"
                  >
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0" />
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center shrink-0">
                      {i + 1}
                    </span>
                    <span className="flex-1 text-sm text-[#334155] truncate">{sala.nombreSala}</span>
                    <button
                      type="button"
                      onClick={() => removeSala(sala.id)}
                      className="text-slate-400 hover:text-red-400 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ol>
            )}

            {/* Buscador de salas */}
            <div className="relative">
              <input
                value={salaSearch}
                onChange={(e) => setSalaSearch(e.target.value)}
                placeholder="Buscar sala para añadir..."
                className={inputCls}
              />
              {salaSearch && salasFiltradas.length > 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-md max-h-48 overflow-y-auto">
                  {salasFiltradas.map((sala) => (
                    <button
                      key={sala.id}
                      type="button"
                      onClick={() => addSala(sala.id)}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-left hover:bg-slate-50 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5 text-[#0D9488] shrink-0" />
                      <span className="truncate">{sala.nombreSala}</span>
                      {sala.direccion?.ciudad && (
                        <span className="text-xs text-slate-400 ml-auto shrink-0">
                          {sala.direccion.ciudad}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}
              {salaSearch && salasFiltradas.length === 0 && (
                <div className="absolute z-10 w-full mt-1 bg-white border border-slate-200 rounded-xl shadow-md px-4 py-3 text-sm text-slate-400">
                  No hay salas que coincidan
                </div>
              )}
            </div>
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
              disabled={isSubmitting || salasSeleccionadas.length < 2}
              className="flex-1 bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Crear ruta"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
