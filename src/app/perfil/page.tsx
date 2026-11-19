"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

import { KeyRound, CheckCircle2 } from "lucide-react";

export default function PerfilPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [actual, setActual] = useState("");
  const [nueva, setNueva] = useState("");
  const [confirmacion, setConfirmacion] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [exito, setExito] = useState(false);

  useEffect(() => {
    async function cargar() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await res.json());
    }
    cargar();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setExito(false);

    if (nueva !== confirmacion) {
      setError("La nueva contraseña y su confirmación no coinciden.");
      return;
    }

    if (nueva.length < 8) {
      setError("La nueva contraseña debe tener al menos 8 caracteres.");
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch("/api/auth/password", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actual, nueva }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error?.message || "Error al cambiar contraseña.");
      }

      setExito(true);
      setActual("");
      setNueva("");
      setConfirmacion("");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setIsLoading(false);
    }
  };

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6 max-w-2xl mx-auto">
        <div>
          <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
            Mi Cuenta
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
            Perfil de usuario
          </h1>
          <p className="text-xs sm:text-sm text-brand-800/70 mt-0.5">
            Información de la sesión actual y cambio de contraseña.
          </p>
        </div>

        {/* Datos de la cuenta */}
        <Card className="p-6 bg-white space-y-4">
          <div className="flex items-center gap-4 pb-4 border-b border-brand-100">
            <div className="w-14 h-14 rounded-full bg-brand-100 border border-brand-200 text-brand-900 flex items-center justify-center text-lg font-bold">
              {usuario.nombre
                .split(" ")
                .map((n: string) => n[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div>
              <h2 className="text-base font-bold text-brand-950">{usuario.nombre}</h2>
              <p className="text-xs text-brand-800/70 font-mono">{usuario.email}</p>
              <div className="mt-1">
                <span
                  className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
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

          <div className="text-xs text-gray-500">
            Rol asignado: <strong className="text-brand-950 capitalize">{usuario.rol}</strong> ·
            Permisos de acceso gestionados por la administración del comercio.
          </div>
        </Card>

        {/* Formulario de cambio de contraseña */}
        <Card className="p-6 bg-white">
          <CardHeader className="p-0 pb-4 border-b border-brand-100">
            <CardTitle className="flex items-center gap-2 text-sm font-bold text-brand-950">
              <KeyRound className="w-4 h-4 text-brand-800" />
              Cambiar contraseña
            </CardTitle>
          </CardHeader>

          <CardContent className="p-0 pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {error}
                </div>
              )}

              {exito && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2 font-medium">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-none" />
                  <span>Tu contraseña fue actualizada correctamente.</span>
                </div>
              )}

              <Input
                label="Contraseña actual *"
                type="password"
                placeholder="Ingresá tu clave actual"
                value={actual}
                onChange={(e) => setActual(e.target.value)}
                required
              />

              <Input
                label="Nueva contraseña (mínimo 8 caracteres) *"
                type="password"
                placeholder="Ingresá la nueva clave"
                value={nueva}
                onChange={(e) => setNueva(e.target.value)}
                required
              />

              <Input
                label="Confirmar nueva contraseña *"
                type="password"
                placeholder="Repetí la nueva clave"
                value={confirmacion}
                onChange={(e) => setConfirmacion(e.target.value)}
                required
              />

              <div className="flex justify-end pt-3 border-t border-brand-100">
                <Button type="submit" isLoading={isLoading} className="text-xs font-bold">
                  Actualizar Contraseña
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppLayout>
  );
}
