"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { MapPin, Plus, Route } from "lucide-react";
import { getRutas } from "@/lib/rutas";
import { useAuthStore } from "@/store/authStore";
import type { Ruta } from "@/types";

const ESTADO_COLORS: Record<string, string> = {
  borrador: "bg-slate-100 text-slate-600",
  confirmada: "bg-teal-50 text-teal-700",
  archivada: "bg-slate-50 text-slate-400",
};

function RutaCard({ ruta }: { ruta: Ruta }) {
  return (
    <Link
      href={`/ruta/${ruta.id}`}
      className="block bg-white rounded-xl shadow-sm hover:shadow-md transition-shadow overflow-hidden"
    >
      <div className="h-28 bg-gradient-to-br from-indigo-100 to-indigo-200 flex items-center justify-center">
        <Route className="w-10 h-10 text-indigo-400" />
      </div>
      <div className="p-4 space-y-2">
        <h3 className="font-semibold text-[#334155] truncate">{ruta.nombre}</h3>
        {ruta.descripcion && (
          <p className="text-xs text-slate-400 line-clamp-2">{ruta.descripcion}</p>
        )}
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-1 text-xs text-slate-500">
            <MapPin className="w-3 h-3" />
            {ruta.partidas.length} sala{ruta.partidas.length !== 1 ? "s" : ""}
          </span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ESTADO_COLORS[ruta.estado] ?? ESTADO_COLORS.borrador}`}>
            {ruta.estado === "borrador" ? "Borrador" : ruta.estado === "confirmada" ? "Confirmada" : ruta.estado}
          </span>
        </div>
      </div>
    </Link>
  );
}

export function RutasScreen() {
  const { perfil } = useAuthStore();
  const canCreate = perfil && ["gestor", "admin", "superadmin"].includes(perfil.rol);

  const { data: rutas = [], isLoading } = useQuery({
    queryKey: ["rutas"],
    queryFn: getRutas,
  });

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-[#334155]">Rutas de escape</h1>
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

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-white rounded-xl shadow-sm h-44 animate-pulse" />
          ))}
        </div>
      ) : rutas.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <p className="text-4xl mb-3">🗺️</p>
          <p className="font-medium">No hay rutas todavía</p>
          {canCreate && (
            <Link href="/ruta/nueva" className="text-[#0D9488] text-sm mt-2 block hover:underline">
              Crear la primera ruta
            </Link>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rutas.map((r) => (
            <RutaCard key={r.id} ruta={r} />
          ))}
        </div>
      )}
    </div>
  );
}
