"use client";

import { useAuth } from "@/hooks/useAuth";
import "./globals.css";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  useAuth();
  return (
    <html lang="es">
      <body>{children}</body>
    </html>
  );
}