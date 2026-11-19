"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";


import { ModalRegistrarPago } from "@/components/modals/ModalRegistrarPago";
import { formatearMoneda } from "@/lib/formatters";
import { ArrowLeft, Wallet, HandCoins, Eye } from "lucide-react";

export default function SaldosDeudoresPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"]>([]);
  const [totalAdeudado, setTotalAdeudado] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);
  const [clienteParaPago, setClienteParaPago] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"][number] | null>(null);

  const cargarSaldos = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, saldosRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/clientes?conDeuda=true&orden=saldo&pageSize=100"),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await meRes.json());

      if (saldosRes.ok) {
        const data = await saldosRes.json();
        setClientes(data.data || []);
        setTotalAdeudado(data.totalAdeudado || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    cargarSaldos();
  }, [cargarSaldos]);

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/clientes"
              className="p-2 text-brand-800 hover:text-brand-950 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
                Clientes / Cuenta Corriente
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
                Ranking de saldos deudores
              </h1>
              <p className="text-xs sm:text-sm text-brand-800/70 mt-0.5">
                Cuentas corrientes con saldo pendiente, ordenadas de mayor a menor importe.
              </p>
            </div>
          </div>
        </div>

        {/* Banner de Total Adeudado General */}
        <div className="p-6 bg-gradient-to-r from-amber-50 to-amber-100/60 border border-amber-200 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-amber-600 text-white flex items-center justify-center flex-none">
              <Wallet className="w-6 h-6" />
            </div>
            <div>
              <span className="text-xs font-bold text-amber-900/80 uppercase tracking-wider block">
                Total acumulado en cuentas corrientes
              </span>
              <p className="text-xs text-amber-800">
                {clientes.length} {clientes.length === 1 ? "cliente con deuda pendiente" : "clientes con deuda pendiente"}
              </p>
            </div>
          </div>

          <div className="text-left sm:text-right">
            <span className="text-3xl font-serif font-bold text-amber-950 tabular-nums">
              {formatearMoneda(totalAdeudado)}
            </span>
          </div>
        </div>

        {/* Tabla de Ranking de Deudores (RF-C6) */}
        <Card>
          <CardHeader>
            <CardTitle>Cuentas corrientes con saldo exigible</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-bold text-center">#</th>
                    <th className="py-3 px-4 font-bold">Cliente</th>
                    <th className="py-3 px-4 font-bold">Documento</th>
                    <th className="py-3 px-4 font-bold">Contacto</th>
                    <th className="py-3 px-4 font-bold text-right">Límite Asignado</th>
                    <th className="py-3 px-4 font-bold text-right">Deuda Actual</th>
                    <th className="py-3 px-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        Calculando saldos deudores...
                      </td>
                    </tr>
                  ) : clientes.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        ¡Excelente! No hay clientes con deuda pendiente en este momento.
                      </td>
                    </tr>
                  ) : (
                    clientes.map((c, idx) => (
                      <tr key={c.id} className="hover:bg-brand-50/40">
                        <td className="py-3 px-4 text-center font-bold text-gray-400 text-sm">
                          {idx + 1}
                        </td>

                        <td className="py-3 px-4 font-semibold text-brand-950 text-sm">
                          {c.nombre}
                        </td>

                        <td className="py-3 px-4 font-mono text-brand-800/80">
                          {c.tipoDoc} {c.nroDoc}
                        </td>

                        <td className="py-3 px-4 text-brand-800/80">
                          {c.telefono || c.email || "—"}
                        </td>

                        <td className="py-3 px-4 text-right tabular-nums text-gray-500">
                          {c.limiteCredito !== null ? formatearMoneda(c.limiteCredito) : "Sin límite"}
                        </td>

                        <td className="py-3 px-4 text-right font-serif font-bold text-base text-amber-900 tabular-nums">
                          {formatearMoneda(c.saldo)}
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button
                              type="button"
                              onClick={() => setClienteParaPago(c)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 flex items-center gap-1 transition-colors"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              Registrar pago
                            </button>

                            <Link
                              href={`/clientes/${c.id}`}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-brand-100 hover:bg-brand-200 text-brand-900 flex items-center gap-1 transition-colors"
                            >
                              <Eye className="w-3.5 h-3.5" />
                              Ficha
                            </Link>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Modal Registrar Pago */}
      {clienteParaPago && (
        <ModalRegistrarPago
          isOpen={!!clienteParaPago}
          onClose={() => setClienteParaPago(null)}
          cliente={clienteParaPago}
          onPagoRegistrado={(pago) => {
            cargarSaldos();
            router.push(`/pagos/${pago.id}`);
          }}
        />
      )}
    </AppLayout>
  );
}
