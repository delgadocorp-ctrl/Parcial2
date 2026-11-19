"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

import { Button } from "@/components/ui/Button";
import { formatearMoneda, formatearFechaHora } from "@/lib/formatters";
import { Printer, ArrowLeft } from "lucide-react";

export default function DetalleReciboPagoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [pago, setPago] = useState<Awaited<ReturnType<typeof import("@/services/cuenta.service").obtenerPago>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function cargar() {
      try {
        const [meRes, pagoRes] = await Promise.all([
          fetch("/api/auth/me"),
          fetch(`/api/pagos/${id}`),
        ]);

        if (!meRes.ok) {
          router.push("/login");
          return;
        }
        setUsuario(await meRes.json());

        if (!pagoRes.ok) {
          throw new Error("Recibo de pago no encontrado.");
        }
        setPago(await pagoRes.json());
      } catch (err: unknown) {
        setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
      } finally {
        setIsLoading(false);
      }
    }
    if (id) cargar();
  }, [id, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-brand-800">
        Cargando recibo de pago...
      </div>
    );
  }

  if (error || !pago) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 font-semibold mb-3">{error || "Recibo no encontrado."}</p>
        <Link href="/clientes" className="text-xs text-brand-800 underline">
          ← Volver a clientes
        </Link>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6 max-w-2xl mx-auto">
        {/* Barra superior de acciones */}
        <div className="no-print flex items-center justify-between gap-4">
          <Link
            href={`/clientes/${pago.cliente.id}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-950"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a la cuenta del cliente
          </Link>

          <Button
            size="sm"
            onClick={() => window.print()}
            className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
          >
            <Printer className="w-3.5 h-3.5 mr-1.5" />
            Imprimir recibo
          </Button>
        </div>

        {/* Recibo de pago imprimible */}
        <div className="printable-area bg-white rounded-2xl border border-brand-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex justify-between items-start pb-4 border-b border-brand-200">
            <div className="space-y-1">
              <span className="text-lg font-bold tracking-tight text-brand-950 block">mostrador</span>
              <p className="text-xs text-brand-800/80">Comercio Minorista · Comprobante de Cobro</p>
              <p className="text-[11px] text-gray-500">San Martín 1234 · CUIT 30-71999888-4</p>
            </div>

            <div className="text-right space-y-1">
              <div className="inline-block px-2.5 py-0.5 bg-emerald-50 border border-emerald-200 rounded text-[11px] font-bold text-emerald-900 uppercase">
                Recibo de Pago Oficial
              </div>
              <div className="text-xl font-mono font-bold text-brand-950 mt-1">
                {pago.numeroRecibo}
              </div>
              <p className="text-xs text-gray-600">
                Fecha: <span className="font-semibold">{formatearFechaHora(pago.fecha)}</span>
              </p>
            </div>
          </div>

          <div className="p-4 rounded-xl bg-brand-50/50 border border-brand-100 text-xs space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-500">Recibimos de:</span>
              <strong className="text-sm text-brand-950">{pago.cliente.nombre}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Medio de pago:</span>
              <strong className="capitalize text-brand-950">{pago.medio.replace("_", " ")}</strong>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Operador receptor:</span>
              <span className="text-brand-900 font-medium">{pago.usuario.nombre}</span>
            </div>
            {pago.observacion && (
              <div className="flex justify-between pt-1 border-t border-brand-200/60">
                <span className="text-gray-500">Observación:</span>
                <span className="text-brand-900">{pago.observacion}</span>
              </div>
            )}
          </div>

          <div className="p-5 rounded-xl bg-emerald-50/70 border border-emerald-200 flex justify-between items-baseline">
            <span className="text-sm font-bold text-emerald-950">IMPORTE CANCELADO:</span>
            <span className="text-3xl font-serif font-bold text-emerald-900 tabular-nums">
              {formatearMoneda(pago.importe)}
            </span>
          </div>

          <div className="pt-2 text-xs flex justify-between text-gray-600">
            <span>Saldo adeudado restante del cliente:</span>
            <strong className="text-brand-950 tabular-nums font-serif text-sm">
              {formatearMoneda(pago.saldoCliente)}
            </strong>
          </div>

          <div className="pt-6 border-t border-brand-100 text-center text-[10px] text-gray-400">
            Comprobante de crédito para la cuenta corriente del cliente · Gracias por su pago
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
