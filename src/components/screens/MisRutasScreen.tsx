"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Plus, Route, MapPin } from "lucide-react";
import { getMisRutas } from "@/lib/rutas";
import { useAuthStore } from "@/store/authStore";
import type { Ruta } from "@/types";

const ESTADO_LABELS: Record<string, string> = {
  borrador: "Borrador",
  confirmada: "Confirmada",
  archivada: "Archivada",
};

const ESTADO_COLORS: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-teal-50 text-teal-700",
  archivada: "bg-slate-50 text-slate-400",
};

function RutaRow({ ruta }: { ruta: Ruta }) {
  return (
    <Link
      href={`/ruta/${ruta.id}`}
      className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 transition-colors"
    >
      <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
        <Route className="w-4 h-4 text-indigo-500" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#334155] truncate">{ruta.nombre}</p>
        <p className="text-xs text-slate-400 flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {ruta.partidas.length} sala{ruta.partidas.length !== 1 ? "s" : ""}
        </p>
      </div>
      <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[ruta.estado] ?? ESTADO_COLORS.borrador}`}>
        {ESTADO_LABELS[ruta.estado] ?? ruta.estado}
      </span>
    </Link>
  );
}

export function MisRutasScreen() {
  const { user, perfil } = useAuthStore();
  const canCreate = perfil && ["gestor", "admin", "superadmin"].includes(perfil.rol);

  const { data: rutas = [], isLoading } = useQuery({
    queryKey: ["mis-rutas", user?.uid],
    queryFn: () => getMisRutas(user!.uid),
    enabled: !!user,
  });

  if (isLoading) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-3">
        <div className="h-8 w-40 bg-white rounded-xl animate-pulse" />
        {[...Array(3)].map((_, i) => <div key={i} className="bg-white rounded-xl shadow-sm h-16 animate-pulse" />)}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#334155]">Mis rutas</h1>
        {canCreate && (
          <Link
            href="/ruta/nueva"
            className="flex items-center gap-1.5 bg-[#0D9488] text-white px-4 py-2 rounded-xl text-sm font-medium hover:bg-teal-700 transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nueva ruta
          </Link>
        )}
      </div>

      {rutas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-medium">Todavía no tienes rutas</p>
          {canCreate ? (
            <Link href="/ruta/nueva" className="text-[#0D9488] text-sm mt-2 block hover:underline">
              Crear una ruta
            </Link>
          ) : (
            <p className="text-sm mt-1">Las rutas las crean los gestores</p>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm divide-y divide-slate-50">
          {rutas.map((r) => <RutaRow key={r.id} ruta={r} />)}
        </div>
      )}
    </div>
  );
}
