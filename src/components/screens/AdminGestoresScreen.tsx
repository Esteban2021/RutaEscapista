"use client";

import Link from "next/link";
import Image from "next/image";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, UserCircle, Check, X } from "lucide-react";
import { useAuthStore } from "@/store/authStore";
import { getPeticionesGestor, aprobarPeticion, rechazarPeticion } from "@/lib/admin";

type Tab = "pendiente" | "resuelta";

function formatFecha(ts: { toDate?: () => Date } | null | undefined): string {
  if (!ts?.toDate) return "—";
  return ts.toDate().toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" });
}

export function AdminGestoresScreen() {
  const { user, perfil } = useAuthStore();
  const qc = useQueryClient();
  const [tab, setTab] = useState<Tab>("pendiente");
  const [actionId, setActionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isAdmin = perfil && ["admin", "superadmin"].includes(perfil.rol);

  const { data: peticiones = [], isLoading } = useQuery({
    queryKey: ["peticiones-gestor", tab],
    queryFn: () => getPeticionesGestor(tab === "pendiente" ? "pendiente" : undefined),
    enabled: !!isAdmin,
  });

  const resueltas = tab === "resuelta"
    ? peticiones.filter((p) => p.estado !== "pendiente")
    : [];
  const lista = tab === "pendiente" ? peticiones : resueltas;

  if (!isAdmin) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center text-slate-400">
        <p className="text-4xl mb-3">🔒</p>
        <p className="font-medium">Acceso restringido</p>
      </div>
    );
  }

  async function handleAprobar(petId: string, uid: string) {
    if (!user) return;
    setActionId(petId);
    setError(null);
    try {
      await aprobarPeticion(petId, uid, user.uid);
      qc.invalidateQueries({ queryKey: ["peticiones-gestor"] });
    } catch {
      setError("Error al aprobar. Inténtalo de nuevo.");
    } finally {
      setActionId(null);
    }
  }

  async function handleRechazar(petId: string) {
    if (!user) return;
    setActionId(petId);
    setError(null);
    try {
      await rechazarPeticion(petId, user.uid);
      qc.invalidateQueries({ queryKey: ["peticiones-gestor"] });
    } catch {
      setError("Error al rechazar. Inténtalo de nuevo.");
    } finally {
      setActionId(null);
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">
      <div className="flex items-center gap-3">
        <Link href="/admin" className="text-slate-400 hover:text-[#0D9488] transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <h1 className="text-xl font-bold text-[#334155]">Solicitudes de Gestor</h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
        {(["pendiente", "resuelta"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 text-sm font-medium rounded-lg transition-colors ${
              tab === t ? "bg-white text-[#334155] shadow-sm" : "text-slate-500 hover:text-[#334155]"
            }`}
          >
            {t === "pendiente" ? "Pendientes" : "Historial"}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-sm text-red-500 bg-red-50 px-4 py-2 rounded-xl">{error}</p>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-20 bg-white rounded-xl animate-pulse" />
          ))}
        </div>
      ) : lista.length === 0 ? (
        <div className="text-center py-12 text-slate-400">
          <p className="text-3xl mb-2">📋</p>
          <p className="text-sm">
            {tab === "pendiente" ? "No hay solicitudes pendientes" : "Sin historial aún"}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {lista.map((p) => (
            <div key={p.id} className="bg-white rounded-xl shadow-sm p-4 flex items-center gap-3">
              {p.fotoUrl ? (
                <Image
                  src={p.fotoUrl}
                  alt={p.nick}
                  width={40}
                  height={40}
                  className="rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center shrink-0">
                  <UserCircle className="w-6 h-6 text-teal-600" />
                </div>
              )}

              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-[#334155] truncate">{p.nick}</p>
                <p className="text-xs text-slate-400">{formatFecha(p.fechaCreacion as never)}</p>
                {tab === "resuelta" && (
                  <span className={`text-xs font-medium ${
                    p.estado === "aprobada" ? "text-teal-600" : "text-red-500"
                  }`}>
                    {p.estado === "aprobada" ? "Aprobada" : "Rechazada"}
                  </span>
                )}
              </div>

              {tab === "pendiente" && (
                <div className="flex gap-2 shrink-0">
                  <button
                    onClick={() => handleAprobar(p.id, p.uid)}
                    disabled={actionId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-teal-500 text-white text-xs font-medium rounded-lg hover:bg-teal-600 transition-colors disabled:opacity-50"
                  >
                    <Check className="w-3.5 h-3.5" />
                    Aprobar
                  </button>
                  <button
                    onClick={() => handleRechazar(p.id)}
                    disabled={actionId === p.id}
                    className="flex items-center gap-1.5 px-3 py-1.5 border border-red-200 text-red-500 text-xs font-medium rounded-lg hover:bg-red-50 transition-colors disabled:opacity-50"
                  >
                    <X className="w-3.5 h-3.5" />
                    Rechazar
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
