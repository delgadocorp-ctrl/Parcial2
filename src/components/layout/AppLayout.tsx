"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { SesionUsuario } from "@/lib/auth";

interface AppLayoutProps {
  usuario: SesionUsuario;
  children: React.ReactNode;
}

export function AppLayout({ usuario, children }: AppLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen bg-[#f5f6f2] flex">
      {/* Sidebar fijo */}
      <Sidebar
        usuario={usuario}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Área principal */}
      <div className="flex-1 lg:pl-64 flex flex-col min-w-0">
        <Header
          usuario={usuario}
          onMenuToggle={() => setSidebarOpen(!sidebarOpen)}
        />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {usuario.demo && (
            <p className="mb-4 rounded-lg border border-brand-200 bg-white p-3 text-sm text-brand-900">
              Modo demo · Datos de ejemplo de solo lectura
            </p>
          )}
          {children}
        </main>
      </div>
    </div>
  );
}
