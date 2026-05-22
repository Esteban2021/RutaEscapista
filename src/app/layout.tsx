"use client";

import { useAuth } from "@/hooks/useAuth";
import { QueryProvider } from "@/components/providers/QueryProvider";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  useAuth();
  return (
    <html lang="es">
      <body>
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
