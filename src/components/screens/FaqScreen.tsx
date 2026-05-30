"use client";

import { useState } from "react";
import { ChevronDown, ChevronUp } from "lucide-react";

const FAQS = [
  {
    q: "¿Qué es RutaEscapista?",
    a: "RutaEscapista es una app para registrar, organizar y valorar tus partidas de escape room. Puedes llevar un historial de todas las salas que has jugado, organizar partidas con amigos y crear rutas con varios escape rooms.",
  },
  {
    q: "¿Cómo me registro?",
    a: "Pulsa «Entrar» en la barra superior y luego «¿No tienes cuenta? Regístrate». Solo necesitas un email y una contraseña. Después elige un nick público y ya puedes empezar.",
  },
  {
    q: "¿Qué diferencia hay entre sala, partida y ruta?",
    a: "Una sala es el establecimiento físico de escape room. Una partida es una sesión concreta en esa sala (con fecha, jugadores y resultado). Una ruta es un itinerario que agrupa varias partidas en distintas salas, normalmente jugadas de forma consecutiva.",
  },
  {
    q: "¿Cómo creo una partida?",
    a: "Entra en la ficha de la sala donde jugaste, pulsa «Nueva partida» y rellena la fecha, hora y jugadores. Necesitas rol de Gestor de Partidas para crear partidas.",
  },
  {
    q: "¿Cómo puedo convertirme en Gestor de Partidas?",
    a: "Desde tu perfil, pulsa «Solicitar ser Gestor de Partidas». Un administrador revisará tu solicitud y la aprobará. Los gestores pueden crear y gestionar partidas y rutas.",
  },
  {
    q: "¿Puedo añadir jugadores que no tienen cuenta?",
    a: "Sí. Al crear o editar una partida puedes añadir jugadores por nombre aunque no estén registrados en la app. Aparecerán como «pendientes» hasta que ellos creen su cuenta y se identifiquen.",
  },
  {
    q: "¿Puedo votar una sala si no jugué la partida?",
    a: "No. Solo pueden votar los usuarios que aparezcan en la lista de jugadores confirmados de una partida en estado «Jugada». Esto garantiza que las valoraciones son de personas que realmente jugaron.",
  },
  {
    q: "¿Cuándo puedo editar mi voto?",
    a: "Puedes editar tu valoración durante los 7 días siguientes a la fecha de la partida. Pasado ese plazo necesitas contactar con un administrador.",
  },
  {
    q: "¿Para qué sirve el estado de una partida?",
    a: "Borrador: la partida está en preparación. Confirmada: publicada y visible, los jugadores pueden unirse. Jugada: la partida ya se realizó (pasa automáticamente cuando expira el tiempo). Cancelada: cancelada manualmente, no se puede reactivar.",
  },
  {
    q: "¿Quién puede ver mis datos?",
    a: "Tu nick y foto de perfil son públicos. Tu nombre real (si lo indicas) solo lo ves tú. El email solo lo ven los administradores.",
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border-b border-slate-100 last:border-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between py-4 text-left gap-3"
      >
        <span className="text-sm font-medium text-[#334155]">{q}</span>
        {open
          ? <ChevronUp className="w-4 h-4 text-slate-400 shrink-0" />
          : <ChevronDown className="w-4 h-4 text-slate-400 shrink-0" />}
      </button>
      {open && (
        <p className="text-sm text-slate-500 pb-4 leading-relaxed">{a}</p>
      )}
    </div>
  );
}

export function FaqScreen() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-xl font-bold text-[#334155]">Preguntas frecuentes</h1>
        <p className="text-sm text-slate-400 mt-1">Todo lo que necesitas saber sobre RutaEscapista</p>
      </div>

      <div className="bg-white rounded-xl shadow-sm px-5 divide-y divide-slate-100">
        {FAQS.map((item) => (
          <FaqItem key={item.q} q={item.q} a={item.a} />
        ))}
      </div>
    </div>
  );
}
