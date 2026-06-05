"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserCircle, Search, AlertCircle, ShieldOff, Shield } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getUsuarios, updateUserRol, toggleUserBloqueo } from "@/lib/admin";
import type { Rol, Usuario } from "@/types";

const ROL_LABELS: Record<Rol, string> = {
  usuario: "Usuario",
  gestor: "Gestor",
  admin: "Admin",
  superadmin: "Superadmin",
};

const ROL_COLORS: Record<Rol, string> = {
  usuario: "bg-slate-100 text-slate-600",
  gestor: "bg-teal-50 text-teal-700",
  admin: "bg-indigo-50 text-indigo-700",
  superadmin: "bg-amber-50 text-amber-700",
};

const ROLES_DISPONIBLES: Rol[] = ["usuario", "gestor", "admin", "superadmin"];

function UsuarioRow({
  usuario,
  isSuperadmin,
  selfUid,
  onRolChange,
  onToggleBloqueo,
}: {
  usuario: Usuario;
  isSuperadmin: boolean;
  selfUid: string;
  onRolChange: (uid: string, rol: Rol) => void;
  onToggleBloqueo: (uid: string, bloqueado: boolean) => void;
}) {
  const esSelf = usuario.uid === selfUid;
  const bloqueado = !!usuario.bloqueado;

  return (
    <div className={`flex items-center gap-3 px-5 py-3.5 ${bloqueado ? "opacity-60" : ""}`}>
      {/* Avatar */}
      <div className="shrink-0">
        {usuario.fotoUrl ? (
          <Image
            src={usuario.fotoUrl}
            alt={usuario.nick}
            width={36}
            height={36}
            className="rounded-full object-cover"
          />
        ) : (
          <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center">
            <UserCircle className="w-5 h-5 text-slate-400" />
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-[#334155] truncate">
          {usuario.nick || <span className="text-slate-400 italic">Sin nick</span>}
          {esSelf && <span className="ml-1.5 text-xs text-slate-400">(tú)</span>}
        </p>
        {usuario.email && (
          <p className="text-xs text-slate-400 truncate">{usuario.email}</p>
        )}
      </div>

      {/* Rol */}
      <div className="shrink-0">
        {isSuperadmin && !esSelf ? (
          <select
            value={usuario.rol}
            onChange={(e) => onRolChange(usuario.uid, e.target.value as Rol)}
            className="text-xs border border-slate-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-teal-300"
          >
            {ROLES_DISPONIBLES.map((r) => (
              <option key={r} value={r}>{ROL_LABELS[r]}</option>
            ))}
          </select>
        ) : (
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ROL_COLORS[usuario.rol]}`}>
            {ROL_LABELS[usuario.rol]}
          </span>
        )}
      </div>

      {/* Bloquear / desbloquear */}
      {isSuperadmin && !esSelf && (
        <button
          onClick={() => onToggleBloqueo(usuario.uid, !bloqueado)}
          title={bloqueado ? "Desbloquear usuario" : "Bloquear usuario"}
          className={`shrink-0 p-1.5 rounded-lg transition-colors ${
            bloqueado
              ? "text-red-500 bg-red-50 hover:bg-red-100"
              : "text-slate-400 hover:text-red-500 hover:bg-red-50"
          }`}
        >
          {bloqueado ? <ShieldOff className="w-4 h-4" /> : <Shield className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
}

export function AdminUsuariosScreen() {
  const { user, perfil } = useAuthStore();
  const qc = useQueryClient();
  const isSuperadmin = perfil?.rol === "superadmin";
  const isAdmin = perfil && ["admin", "superadmin"].includes(perfil.rol);
  const [busqueda, setBusqueda] = useState("");
  const [error, setError] = useState<string | null>(null);

  const { data: usuarios = [], isLoading } = useQuery({
    queryKey: ["admin-usuarios"],
    queryFn: getUsuarios,
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

  const filtrados = usuarios.filter((u) => {
    const q = busqueda.toLowerCase();
    return (
      u.nick?.toLowerCase().includes(q) ||
      u.email?.toLowerCase().includes(q) ||
      u.nombre?.toLowerCase().includes(q)
    );
  });

  async function handleRolChange(uid: string, rol: Rol) {
    setError(null);
    try {
      await updateUserRol(uid, rol);
      qc.setQueryData<Usuario[]>(["admin-usuarios"], (prev) =>
        prev?.map((u) => (u.uid === uid ? { ...u, rol } : u)) ?? []
      );
    } catch {
      setError("Error al cambiar el rol. Inténtalo de nuevo.");
    }
  }

  async function handleToggleBloqueo(uid: string, bloqueado: boolean) {
    setError(null);
    try {
      await toggleUserBloqueo(uid, bloqueado);
      qc.setQueryData<Usuario[]>(["admin-usuarios"], (prev) =>
        prev?.map((u) => (u.uid === uid ? { ...u, bloqueado } : u)) ?? []
      );
    } catch {
      setError("Error al actualizar el bloqueo. Inténtalo de nuevo.");
    }
  }

  const bloqueadosCount = usuarios.filter((u) => u.bloqueado).length;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">
      <div className="flex items-center gap-2">
        <Link
          href="/admin"
          className="inline-flex items-center gap-1 text-sm text-slate-500 hover:text-[#0D9488]"
        >
          <ArrowLeft className="w-4 h-4" />
          Administración
        </Link>
      </div>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-[#334155]">Usuarios</h1>
          <p className="text-sm text-slate-400 mt-0.5">
            {usuarios.length} registrados
            {bloqueadosCount > 0 && ` · ${bloqueadosCount} bloqueado${bloqueadosCount > 1 ? "s" : ""}`}
          </p>
        </div>
      </div>

      {/* Buscador */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Buscar por nick o email…"
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          className="w-full pl-9 pr-4 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-300 bg-white"
        />
      </div>

      {error && (
        <div className="flex items-center gap-2 text-sm text-red-500 bg-red-50 px-4 py-3 rounded-xl">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {/* Lista */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="space-y-1 p-4">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 py-2">
                <div className="w-9 h-9 rounded-full bg-slate-100 animate-pulse shrink-0" />
                <div className="flex-1 space-y-1.5">
                  <div className="h-3.5 bg-slate-100 rounded animate-pulse w-32" />
                  <div className="h-3 bg-slate-100 rounded animate-pulse w-48" />
                </div>
              </div>
            ))}
          </div>
        ) : filtrados.length === 0 ? (
          <p className="text-sm text-slate-400 text-center py-10">
            {busqueda ? "Sin resultados para esa búsqueda." : "No hay usuarios."}
          </p>
        ) : (
          <div className="divide-y divide-slate-50">
            {filtrados.map((u) => (
              <UsuarioRow
                key={u.uid}
                usuario={u}
                isSuperadmin={isSuperadmin}
                selfUid={user?.uid ?? ""}
                onRolChange={handleRolChange}
                onToggleBloqueo={handleToggleBloqueo}
              />
            ))}
          </div>
        )}
      </div>

      {!isSuperadmin && (
        <p className="text-xs text-slate-400 text-center">
          Solo el superadmin puede modificar roles y bloquear usuarios.
        </p>
      )}
    </div>
  );
}
