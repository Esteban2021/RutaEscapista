"use client";

import Link from "next/link";
import { useAuthStore } from "@/store/authStore";
import { MapPin, Route, CalendarDays, Trophy } from "lucide-react";

const QUICK_LINKS = [
  { href: "/salas", label: "Salas", desc: "Explora el catálogo", icon: MapPin, color: "bg-teal-50 text-[#0D9488]" },
  { href: "/rutas", label: "Rutas", desc: "Itinerarios de salas", icon: Route, color: "bg-violet-50 text-violet-600" },
  { href: "/mis-partidas", label: "Mis partidas", desc: "Tu historial", icon: CalendarDays, color: "bg-amber-50 text-amber-600" },
  { href: "/mis-rutas", label: "Mis rutas", desc: "Rutas creadas", icon: Trophy, color: "bg-emerald-50 text-emerald-600" },
];

export function DashboardScreen() {
  const { perfil } = useAuthStore();

  return (
    <main className="max-w-5xl mx-auto px-4 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-[#334155]">
          Hola, {perfil?.nick || "escapista"} 👋
        </h1>
        <p className="text-slate-500 text-sm mt-1">¿Listo para tu próxima aventura?</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {QUICK_LINKS.map(({ href, label, desc, icon: Icon, color }) => (
          <Link
            key={href}
            href={href}
            className="bg-white rounded-xl shadow-sm p-4 hover:shadow-md transition-shadow"
          >
            <div className={`w-10 h-10 rounded-xl ${color} flex items-center justify-center mb-3`}>
              <Icon className="w-5 h-5" />
            </div>
            <p className="font-semibold text-[#334155] text-sm">{label}</p>
            <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
          </Link>
        ))}
      </div>

      <div className="mt-6 bg-white rounded-xl shadow-sm p-5">
        <h2 className="font-semibold text-[#334155] mb-3">Actividad reciente</h2>
        <p className="text-sm text-slate-400 text-center py-6">
          Aún no hay actividad. ¡Empieza explorando las{" "}
          <Link href="/salas" className="text-[#0D9488] hover:underline">
            salas disponibles
          </Link>
          !
        </p>
      </div>
    </main>
  );
}
