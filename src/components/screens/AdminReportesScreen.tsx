"use client";

import Link from "next/link";
import { ArrowLeft, ImageOff } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

export function AdminReportesScreen() {
  const { perfil } = useAuthStore();
  const isAdmin = perfil && ["admin", "superadmin"].includes(perfil.rol);

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Acceso restringido</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-slate-400 hover:text-[#0D9488] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#334155]">Reportes de fotos</h1>
      </div>

      <div className="text-center py-16 text-slate-400">
        <ImageOff className="w-10 h-10 mx-auto mb-3 opacity-40" />
        <p className="text-sm font-medium">Disponible cuando se implemente el módulo de fotos</p>
      </div>
    </div>
  );
}
