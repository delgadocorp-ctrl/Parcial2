"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { ShieldCheck, UserCheck, Users } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const iniciarSesion = async (ruta: string, datos: Record<string, string>) => {
    setError(null);
    setIsLoading(true);

    try {
      const res = await fetch(ruta, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Credenciales inválidas.");
      }

      router.push("/");
      router.refresh();
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    void iniciarSesion("/api/auth/login", { email: email.trim(), password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#f2f4ee]">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-brand-200 p-8 space-y-6">
        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="inline-flex w-14 h-14 rounded-2xl bg-[#1d3930] text-[#d4ed91] items-center justify-center font-black text-2xl shadow-sm mb-1">
            M
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-brand-950">
            mostrador
          </h1>
          <p className="text-xs text-brand-800/70 font-medium uppercase tracking-wider">
            Sistema de Gestión Comercial
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="p-3.5 bg-red-50 border border-red-200 text-red-700 text-xs rounded-xl flex items-center gap-2">
            <span>{error}</span>
          </div>
        )}

        {/* Formulario */}
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            id="email"
            label="Correo Electrónico"
            type="email"
            placeholder="usuario@comercio.test"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="username"
          />

          <Input
            id="password"
            label="Contraseña"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />

          <Button type="submit" className="w-full h-11 text-sm font-semibold" isLoading={isLoading}>
            Iniciar Sesión
          </Button>
        </form>

          <div className="pt-4 border-t border-brand-100 space-y-2.5">
            <p className="text-[11px] font-bold uppercase tracking-wider text-center text-brand-800/60">
              Entrá a la demo sin cuenta
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <button
                type="button"
                disabled={isLoading}
                onClick={() => iniciarSesion("/api/auth/demo", { rol: "admin" })}
                className="p-2.5 rounded-xl border border-brand-200 bg-brand-50/60 hover:bg-brand-100/80 transition-colors text-left flex items-start gap-2 text-xs"
              >
                <ShieldCheck className="w-4 h-4 text-purple-700 flex-none mt-0.5" />
                <div>
                  <span className="font-bold text-brand-950 block">Entrar como administrador</span>
                  <span className="text-[10px] text-brand-800/70">Datos de ejemplo</span>
                </div>
              </button>

              <button
                type="button"
                disabled={isLoading}
                onClick={() => iniciarSesion("/api/auth/demo", { rol: "vendedor" })}
                className="p-2.5 rounded-xl border border-brand-200 bg-brand-50/60 hover:bg-brand-100/80 transition-colors text-left flex items-start gap-2 text-xs"
              >
                <UserCheck className="w-4 h-4 text-teal-700 flex-none mt-0.5" />
                <div>
                  <span className="font-bold text-brand-950 block">Entrar como vendedor</span>
                  <span className="text-[10px] text-brand-800/70">Datos de ejemplo</span>
                </div>
              </button>
            </div>
          </div>
      </div>

      {/* Integrantes del proyecto */}
      <div className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 bg-white/95 backdrop-blur-sm border border-brand-200 rounded-2xl px-4 py-3 shadow-md z-10 flex items-center gap-3">
        <div className="text-right">
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-800/60 mb-0.5">
            Integrantes del proyecto
          </p>
          <div className="text-xs text-brand-950 font-medium space-y-0.5">
            <div>Francisco Agustín Delgado Ojeda</div>
            <div>Oriana Daniela Gordillo</div>
            <div>Sofía Cequi</div>
          </div>
        </div>
        <div className="hidden sm:flex w-9 h-9 rounded-xl bg-brand-50 border border-brand-200/80 text-brand-800 items-center justify-center flex-none">
          <Users className="w-4 h-4" />
        </div>
      </div>
    </div>
  );
}
