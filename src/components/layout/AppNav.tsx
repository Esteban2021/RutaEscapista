"use client";

import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { useState } from "react";
import Image from "next/image";
import { signOut } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useAuthStore } from "@/store/authStore";
import { Menu, X, UserCircle, LogOut, User, LayoutDashboard, ShieldCheck } from "lucide-react";

const NAV_LINKS = [
  { href: "/salas", label: "Salas" },
  { href: "/rutas", label: "Rutas" },
  { href: "/faq", label: "FAQ" },
];

const AUTH_LINKS = [
  { href: "/mis-partidas", label: "Mis partidas" },
  { href: "/mis-rutas", label: "Mis rutas" },
];

export function AppNav() {
  const router = useRouter();
  const pathname = usePathname();
  const { user, perfil } = useAuthStore();
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await signOut(auth);
    document.cookie = "firebase-token=; path=/; max-age=0";
    router.push("/login");
  }

  function isActive(href: string) {
    return pathname === href || pathname.startsWith(href + "/");
  }

  return (
    <header className="bg-white border-b border-slate-100 sticky top-0 z-40">
      <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
        {/* Logo */}
        <Link href={user ? "/dashboard" : "/"} className="font-bold text-[#0D9488] text-lg tracking-tight">
          RutaEscapista
        </Link>

        {/* Desktop nav */}
        <nav className="hidden md:flex items-center gap-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive(l.href)
                  ? "bg-teal-50 text-[#0D9488]"
                  : "text-[#334155] hover:bg-slate-50"
              }`}
            >
              {l.label}
            </Link>
          ))}
            {user &&
            AUTH_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                  isActive(l.href)
                    ? "bg-teal-50 text-[#0D9488]"
                    : "text-[#334155] hover:bg-slate-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          {perfil && ["admin", "superadmin"].includes(perfil.rol) && (
            <Link
              href="/crear-sala"
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                isActive("/crear-sala")
                  ? "bg-teal-50 text-[#0D9488]"
                  : "text-[#334155] hover:bg-slate-50"
              }`}
            >
              + Sala
            </Link>
          )}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          {user ? (
            <div className="relative">
              <button
                onClick={() => setUserMenuOpen((v) => !v)}
                className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors"
              >
                {perfil?.fotoUrl ? (
                  <Image
                    src={perfil.fotoUrl}
                    alt={perfil.nick}
                    width={28}
                    height={28}
                    className="rounded-full object-cover"
                  />
                ) : (
                  <UserCircle className="w-7 h-7 text-[#0D9488]" />
                )}
                <span className="hidden md:block text-sm font-medium text-[#334155]">
                  {perfil?.nick || user.email?.split("@")[0]}
                </span>
              </button>
              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-10"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-1 w-48 bg-white border border-slate-100 rounded-xl shadow-md z-20 py-1">
                    <Link
                      href="/dashboard"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#334155] hover:bg-slate-50"
                    >
                      <LayoutDashboard className="w-4 h-4" />
                      Inicio
                    </Link>
                    <Link
                      href="/perfil"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 text-sm text-[#334155] hover:bg-slate-50"
                    >
                      <User className="w-4 h-4" />
                      Mi perfil
                    </Link>
                    {perfil && ["admin", "superadmin"].includes(perfil.rol) && (
                      <>
                        <hr className="my-1 border-slate-100" />
                        <Link
                          href="/admin"
                          onClick={() => setUserMenuOpen(false)}
                          className="flex items-center gap-2 px-4 py-2 text-sm text-[#334155] hover:bg-slate-50"
                        >
                          <ShieldCheck className="w-4 h-4" />
                          Administración
                        </Link>
                      </>
                    )}
                    <hr className="my-1 border-slate-100" />
                    <button
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-500 hover:bg-red-50"
                    >
                      <LogOut className="w-4 h-4" />
                      Salir
                    </button>
                  </div>
                </>
              )}
            </div>
          ) : (
            <Link
              href="/login"
              className="text-sm font-medium bg-[#0D9488] text-white px-4 py-1.5 rounded-lg hover:bg-teal-700 transition-colors"
            >
              Entrar
            </Link>
          )}

          {/* Mobile hamburger */}
          <button
            className="md:hidden p-1.5 rounded-lg hover:bg-slate-50"
            onClick={() => setMenuOpen((v) => !v)}
          >
            {menuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-slate-100 bg-white px-4 py-3 space-y-1">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              onClick={() => setMenuOpen(false)}
              className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                isActive(l.href) ? "bg-teal-50 text-[#0D9488]" : "text-[#334155]"
              }`}
            >
              {l.label}
            </Link>
          ))}
          {user &&
            AUTH_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setMenuOpen(false)}
                className={`block px-3 py-2 rounded-lg text-sm font-medium ${
                  isActive(l.href) ? "bg-teal-50 text-[#0D9488]" : "text-[#334155]"
                }`}
              >
                {l.label}
              </Link>
            ))}
        </div>
      )}
    </header>
  );
}
