"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Menu, LogOut, User as UserIcon } from "lucide-react";
import { SesionUsuario } from "@/lib/auth";

interface HeaderProps {
  usuario: SesionUsuario;
  onMenuToggle?: () => void;
}

export function Header({ usuario, onMenuToggle }: HeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  return (
    <header className="h-16 border-b border-brand-200 bg-white/80 backdrop-blur-sm sticky top-0 z-30 px-4 lg:px-8 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuToggle}
          className="p-2 rounded-lg text-brand-900 hover:bg-brand-50 lg:hidden"
          aria-label="Abrir menú"
        >
          <Menu className="w-5 h-5" />
        </button>
        <span className="hidden sm:inline-block text-xs font-medium text-brand-800/60 uppercase tracking-wider">
          Punto de Venta Principal · Local 0001
        </span>
      </div>

      <div className="flex items-center gap-4">
        {/* User badge */}
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-full bg-brand-100 border border-brand-300 text-brand-900 flex items-center justify-center text-xs font-bold">
            {usuario.nombre
              .split(" ")
              .map((n) => n[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>
          <div className="hidden sm:block text-left">
            <span className="text-sm font-semibold text-brand-950 block leading-tight">
              {usuario.nombre}
            </span>
            <div className="flex items-center gap-1.5 mt-0.5">
              <span
                className={`inline-block px-1.5 py-0.2 rounded text-[10px] font-bold uppercase tracking-wider ${
                  usuario.rol === "admin"
                    ? "bg-purple-100 text-purple-800"
                    : "bg-teal-100 text-teal-800"
                }`}
              >
                {usuario.rol === "admin" ? "Administrador" : "Vendedor"}
              </span>
            </div>
          </div>
        </div>

        {/* Profile Link */}
        <Link
          href="/perfil"
          className="p-2 text-brand-700 hover:text-brand-950 hover:bg-brand-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
          title="Mi perfil y cambiar contraseña"
        >
          <UserIcon className="w-4 h-4" />
          <span className="hidden md:inline">Perfil</span>
        </Link>

        {/* Logout button */}
        <button
          onClick={handleLogout}
          className="p-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors text-xs font-medium flex items-center gap-1.5"
          title="Cerrar sesión"
        >
          <LogOut className="w-4 h-4" />
          <span className="hidden md:inline">Salir</span>
        </button>
      </div>
    </header>
  );
}
