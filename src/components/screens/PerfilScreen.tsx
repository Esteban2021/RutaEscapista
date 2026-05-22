"use client";

import Link from "next/link";
import Image from "next/image";
import { UserCircle, MapPin, Edit3 } from "lucide-react";
import { useAuthStore } from "@/store/authStore";

const ROL_LABELS: Record<string, string> = {
  usuario: "Usuario",
  gestor: "Gestor de Partidas",
  admin: "Admin",
  superadmin: "Superadmin",
};

export function PerfilScreen() {
  const { perfil, user } = useAuthStore();

  if (!perfil) return null;

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <div className="max-w-lg mx-auto px-4 py-8">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-6">
          <div className="flex items-center gap-4">
            {perfil.fotoUrl ? (
              <Image
                src={perfil.fotoUrl}
                alt={perfil.nick}
                width={80}
                height={80}
                className="w-20 h-20 rounded-full object-cover"
              />
            ) : (
              <div className="w-20 h-20 rounded-full bg-teal-100 flex items-center justify-center">
                <UserCircle className="w-12 h-12 text-teal-600" />
              </div>
            )}
            <div>
              <h1 className="text-xl font-bold text-[#334155]">{perfil.nick}</h1>
              {perfil.nombre && (
                <p className="text-sm text-slate-500">{perfil.nombre}</p>
              )}
              <span className="inline-block mt-1 text-xs bg-teal-50 text-teal-700 px-2 py-0.5 rounded-full font-medium">
                {ROL_LABELS[perfil.rol] ?? perfil.rol}
              </span>
            </div>
          </div>

          <div className="space-y-2">
            {(perfil.pais || perfil.provincia) && (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <MapPin className="w-4 h-4 shrink-0" />
                <span>{[perfil.provincia, perfil.pais].filter(Boolean).join(", ")}</span>
              </div>
            )}
            <p className="text-xs text-slate-400">{user?.email}</p>
          </div>

          <div className="border-t pt-4">
            <p className="text-sm text-slate-500">
              Salas jugadas:{" "}
              <span className="font-semibold text-[#334155]">{perfil.salasJugadas}</span>
            </p>
          </div>

          <Link
            href="/perfil/editar"
            className="flex items-center justify-center gap-2 w-full bg-[#0D9488] text-white py-2.5 rounded-xl font-medium hover:bg-teal-700 transition-colors"
          >
            <Edit3 className="w-4 h-4" />
            Editar perfil
          </Link>
        </div>
      </div>
    </div>
  );
}
