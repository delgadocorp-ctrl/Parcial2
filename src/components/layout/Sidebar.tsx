"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ShoppingCart, Receipt, Package, Tags, Users, WalletCards, UserCog } from "lucide-react";
import { SesionUsuario } from "@/lib/auth";

interface SidebarProps {
  usuario: SesionUsuario;
  isOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ usuario, isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { href: "/", label: "Tablero", icon: LayoutDashboard },
    { href: "/ventas/nueva", label: "Nueva Venta", icon: ShoppingCart },
    { href: "/ventas", label: "Facturas", icon: Receipt },
    { href: "/productos", label: "Productos y Stock", icon: Package },
    { href: "/productos/categorias", label: "Categorías", icon: Tags },
    { href: "/clientes", label: "Clientes", icon: Users },
    { href: "/clientes/saldos", label: "Saldos Deudores", icon: WalletCards },
    ...(usuario.rol === "admin"
      ? [{ href: "/usuarios", label: "Usuarios", icon: UserCog }]
      : []),
  ];

  return (
    <>
      {/* Mobile backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 bottom-0 left-0 z-50 w-64 bg-[#1d3930] text-emerald-50 flex flex-col transition-transform duration-200 ease-in-out lg:translate-x-0 ${isOpen ? "translate-x-0" : "-translate-x-full"
          }`}
      >
        {/* Brand header */}
        <div className="h-16 px-6 flex items-center gap-3 border-b border-[#2d4d42]">
          <div className="w-9 h-9 rounded-lg bg-[#d4ed91] text-[#1d3930] flex items-center justify-center font-black text-lg">
            M
          </div>
          <div>
            <span className="font-bold tracking-tight text-lg block leading-tight">mostrador</span>
            <span className="text-[10px] text-emerald-300 uppercase tracking-widest block">
              Gestión comercial
            </span>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto py-5 px-3 space-y-1">
          <p className="px-3 pb-2 text-[10px] font-bold uppercase tracking-wider text-emerald-400/70">
            Espacio de trabajo
          </p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isChildRouteOfAnotherItem = navItems.some(
              (other) =>
                other.href !== item.href &&
                other.href.startsWith(item.href + "/") &&
                (pathname === other.href || pathname.startsWith(other.href + "/"))
            );

            const isActive =
              item.href === "/"
                ? pathname === "/"
                : pathname === item.href ||
          (pathname.startsWith(item.href + "/") && !isChildRouteOfAnotherItem);

          return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onClose}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${isActive
                ? "bg-[#36584b] text-white shadow-sm font-semibold"
                : "text-emerald-100/80 hover:bg-[#28483d] hover:text-white"
              }`}
          >
            <Icon className={`w-4 h-4 ${isActive ? "text-[#d4ed91]" : "text-emerald-300/70"}`} />
            {item.label}
          </Link>
          );
          })}
        </div>

        {/* Sidebar footer */}
        <div className="p-4 border-t border-[#2d4d42] text-xs text-emerald-200/60 leading-relaxed">
          <p className="font-medium text-emerald-200/80">Comercio Minorista</p>
          <p className="text-[11px]">Sistema de facturación y cuenta corriente</p>
        </div>
      </aside>
    </>
  );
}
