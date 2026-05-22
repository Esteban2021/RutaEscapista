"use client";

import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuthStore } from "@/store/authStore";
import { AppNav } from "@/components/layout/AppNav";

export default function MainLayout({ children }: { children: React.ReactNode }) {
  const { perfil, loading } = useAuthStore();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!loading && perfil !== null && !perfil.nick && pathname !== "/perfil/editar") {
      router.replace("/perfil/editar");
    }
  }, [perfil, loading, pathname, router]);

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <AppNav />
      {children}
    </div>
  );
}
