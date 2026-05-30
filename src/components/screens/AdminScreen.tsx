"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Users, Building2, CalendarDays, Map, ChevronRight, ShieldAlert, ClipboardList } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getStats, getPeticionesGestor } from "@/lib/admin";

function StatCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-lg bg-teal-50 flex items-center justify-center shrink-0">
        {icon}
      </div>
      <div>
        <p className="text-xl font-bold text-[#334155]">{value}</p>
        <p className="text-xs text-slate-400">{label}</p>
      </div>
    </div>
  );
}

export function AdminScreen() {
  const { perfil } = useAuthStore();

  const isAdmin = perfil && ["admin", "superadmin"].includes(perfil.rol);

  const { data: stats } = useQuery({
    queryKey: ["admin-stats"],
    queryFn: getStats,
    enabled: !!isAdmin,
  });

  const { data: pendientes } = useQuery({
    queryKey: ["peticiones-gestor", "pendiente"],
    queryFn: () => getPeticionesGestor("pendiente"),
    enabled: !!isAdmin,
  });

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Acceso restringido</p>
      </div>
    );
  }

  const pendientesCount = pendientes?.length ?? 0;

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-xl font-bold text-[#334155]">Administración</h1>
        <p className="text-sm text-slate-400 mt-0.5">Panel de control · {perfil.rol}</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-3">
        <StatCard
          icon={<Users className="w-5 h-5 text-teal-600" />}
          label="Usuarios"
          value={stats?.totalUsuarios ?? 0}
        />
        <StatCard
          icon={<Building2 className="w-5 h-5 text-teal-600" />}
          label="Salas"
          value={stats?.totalSalas ?? 0}
        />
        <StatCard
          icon={<CalendarDays className="w-5 h-5 text-teal-600" />}
          label="Partidas"
          value={stats?.totalPartidas ?? 0}
        />
        <StatCard
          icon={<Map className="w-5 h-5 text-teal-600" />}
          label="Rutas"
          value={stats?.totalRutas ?? 0}
        />
      </div>

      {/* Acciones */}
      <div className="space-y-2">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Gestión</p>

        <Link
          href="/admin/gestores"
          className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ClipboardList className="w-5 h-5 text-[#0D9488]" />
            <div>
              <p className="text-sm font-medium text-[#334155]">Solicitudes de Gestor</p>
              <p className="text-xs text-slate-400">Aprobar o rechazar ascensos</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {pendientesCount > 0 && (
              <span className="bg-teal-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {pendientesCount}
              </span>
            )}
            <ChevronRight className="w-4 h-4 text-slate-400" />
          </div>
        </Link>

        <Link
          href="/admin/reportes"
          className="flex items-center justify-between bg-white rounded-xl shadow-sm px-4 py-3.5 hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <ShieldAlert className="w-5 h-5 text-[#0D9488]" />
            <div>
              <p className="text-sm font-medium text-[#334155]">Reportes de fotos</p>
              <p className="text-xs text-slate-400">Revisar contenido reportado</p>
            </div>
          </div>
          <ChevronRight className="w-4 h-4 text-slate-400" />
        </Link>
      </div>
    </div>
  );
}
