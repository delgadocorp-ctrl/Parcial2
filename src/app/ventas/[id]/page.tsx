"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";

import { Button } from "@/components/ui/Button";

import { formatearMoneda, formatearFechaHora } from "@/lib/formatters";
import { Printer, ArrowLeft, AlertOctagon, Trash2 } from "lucide-react";

export default function DetalleFacturaPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [factura, setFactura] = useState<Awaited<ReturnType<typeof import("@/services/facturas.service").obtenerFactura>> | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [eliminando, setEliminando] = useState(false);
  const [errorEliminar, setErrorEliminar] = useState<string | null>(null);

  const eliminar = async () => {
    if (!factura || eliminando) return;
    if (!window.confirm(`¿Eliminar la factura ${factura.numeroFormateado}? Se devolverá el stock de la venta y se ajustará la cuenta corriente. Esta acción es permanente.`)) return;
    setEliminando(true);
    setErrorEliminar(null);
    try {
      const res = await fetch(`/api/facturas/${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error?.message || "No se pudo eliminar la factura.");
      router.push("/ventas");
      router.refresh();
    } catch (err) {
      setErrorEliminar(err instanceof Error ? err.message : "No se pudo eliminar la factura.");
      setEliminando(false);
    }
  };

  const cargarFactura = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, factRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/facturas/${id}`),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const me = await meRes.json();
      setUsuario(me);

      if (!factRes.ok) {
        throw new Error("Comprobante no encontrado.");
      }

      const f = await factRes.json();
      setFactura(f);
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) cargarFactura();
  }, [id, cargarFactura]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-brand-800">
        Cargando comprobante...
      </div>
    );
  }

  if (error || !factura) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 font-semibold mb-3">{error || "Factura no encontrada."}</p>
        <Link href="/ventas" className="text-xs text-brand-800 underline">
          ← Volver al listado de facturas
        </Link>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6 max-w-4xl mx-auto">
        {/* Barra superior de acciones (no se imprime) */}
        <div className="no-print flex items-center justify-between gap-4">
          <Link
            href="/ventas"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 hover:text-brand-950"
          >
            <ArrowLeft className="w-4 h-4" />
            Volver a facturas
          </Link>

          <div className="flex flex-wrap items-center gap-3">
            {usuario.rol === "admin" && (
              <Button variant="danger" size="sm" isLoading={eliminando} onClick={eliminar}>
                <Trash2 className="w-3.5 h-3.5" /> Eliminar factura
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={() => window.print()}
              className="text-xs font-bold"
            >
              <Printer className="w-3.5 h-3.5 mr-1" />
              Imprimir comprobante
            </Button>
          </div>
        </div>

        {errorEliminar && <p role="alert" className="no-print text-sm text-red-700">{errorEliminar}</p>}

        {/* Aviso de factura anulada */}
        {factura.estado === "anulada" && factura.anulacion && (
          <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-900 text-xs flex items-start gap-3">
            <AlertOctagon className="w-5 h-5 text-red-600 flex-none mt-0.5" />
            <div className="space-y-1">
              <strong className="font-bold text-sm block">COMPROBANTE ANULADO</strong>
              <p>
                Anulado el {formatearFechaHora(factura.anulacion.fecha)} por{" "}
                <span className="font-semibold">{factura.anulacion.usuario.nombre}</span>.
              </p>
              <p className="font-medium text-red-800">
                Motivo: &quot;{factura.anulacion.motivo}&quot;
              </p>
              <p className="text-[11px] text-red-700/80">
                Las unidades vendidas fueron reingresadas a existencias y el débito fue acreditado.
              </p>
            </div>
          </div>
        )}

        {/* Comprobante imprimible formal (RF-V7) */}
        <div className="printable-area bg-white rounded-2xl border border-brand-200 shadow-sm p-6 sm:p-10 space-y-8">
          {/* Cabecera del comprobante */}
          <div className="flex flex-col sm:flex-row justify-between pb-6 border-b border-brand-200 gap-6">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-[#1d3930] text-[#d4ed91] flex items-center justify-center font-black text-base">
                  M
                </div>
                <span className="text-xl font-bold tracking-tight text-brand-950">mostrador</span>
              </div>
              <p className="text-xs text-brand-800/80 font-medium">Gestión Comercial Minorista</p>
              <p className="text-xs text-gray-500">San Martín 1234 · San Miguel de Tucumán</p>
              <p className="text-xs text-gray-500">IVA Responsable Inscripto · CUIT 30-71999888-4</p>
            </div>

            <div className="text-left sm:text-right space-y-1.5">
              <div className="inline-block px-3 py-1 bg-brand-50 border border-brand-200 rounded-lg text-xs font-bold text-brand-900 uppercase">
                Factura Comercial
              </div>
              <div className="text-2xl font-mono font-bold text-brand-950 mt-1">
                {factura.numeroFormateado}
              </div>
              <p className="text-xs text-gray-600">
                Fecha: <span className="font-semibold">{formatearFechaHora(factura.fecha)}</span>
              </p>
              <p className="text-xs text-gray-600">
                Punto de Venta: <span className="font-semibold">0001</span>
              </p>
            </div>
          </div>

          {/* Datos del Cliente y Vendedor */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 p-4 rounded-xl bg-brand-50/50 border border-brand-100 text-xs">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase text-brand-800/60 tracking-wider">
                Datos del comprador
              </span>
              {factura.cliente ? (
                <>
                  <p className="font-bold text-sm text-brand-950">{factura.cliente.nombre}</p>
                  <p className="text-gray-600">
                    {factura.cliente.tipoDoc}: <span className="font-medium">{factura.cliente.nroDoc}</span>
                  </p>
                  {factura.cliente.domicilio && (
                    <p className="text-gray-600">Domicilio: {factura.cliente.domicilio}</p>
                  )}
                </>
              ) : (
                <>
                  <p className="font-bold text-sm text-brand-950">Consumidor Final</p>
                  <p className="text-gray-500">Sin identificación fiscal requerida</p>
                </>
              )}
            </div>

            <div className="space-y-1 sm:text-right">
              <span className="text-[10px] font-bold uppercase text-brand-800/60 tracking-wider">
                Operador / Vendedor
              </span>
              <p className="font-bold text-sm text-brand-950">{factura.vendedor.nombre}</p>
              <p className="text-gray-600">Estado: <span className="font-semibold uppercase">{factura.estado}</span></p>
              <p className="text-gray-600">Condición de Venta: <span className="font-semibold uppercase">{factura.pago.forma.replace("_", " ")}</span></p>
            </div>
          </div>

          {/* Tabla de Artículos */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b-2 border-brand-900 text-brand-900 text-[11px] uppercase">
                <tr>
                  <th className="py-2.5 px-3 font-bold">Código</th>
                  <th className="py-2.5 px-3 font-bold">Descripción</th>
                  <th className="py-2.5 px-3 font-bold text-center">Cantidad</th>
                  <th className="py-2.5 px-3 font-bold text-right">Precio Unitario</th>
                  <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {factura.items.map((it) => (
                  <tr key={it.productoId}>
                    <td className="py-3 px-3 font-mono font-medium text-gray-600">{it.codigo}</td>
                    <td className="py-3 px-3 font-semibold text-brand-950">{it.descripcion}</td>
                    <td className="py-3 px-3 text-center font-bold">{it.cantidad}</td>
                    <td className="py-3 px-3 text-right tabular-nums">{formatearMoneda(it.precioUnitario)}</td>
                    <td className="py-3 px-3 text-right font-bold tabular-nums text-brand-950">{formatearMoneda(it.subtotal)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totales y Forma de Pago */}
          <div className="pt-4 border-t border-brand-200 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6">
            <div className="text-xs space-y-1.5 text-gray-700">
              <span className="text-[10px] font-bold uppercase text-brand-800/60 tracking-wider block">
                Detalle del pago registrado
              </span>
              <p>
                Medio: <strong className="capitalize">{factura.pago.forma.replace("_", " ")}</strong>
              </p>
              {factura.pago.forma === "contado" && (
                <>
                  <p>Monto recibido: <span className="font-semibold">{formatearMoneda(factura.pago.montoRecibido)}</span></p>
                  <p>Vuelto entregado: <span className="font-semibold">{formatearMoneda(factura.pago.vuelto)}</span></p>
                </>
              )}
              {factura.pago.forma === "cuenta_corriente" && (
                <p className="text-amber-800 font-medium">
                  Imputado a la cuenta corriente del cliente.
                </p>
              )}
            </div>

            <div className="w-full sm:w-64 space-y-2 text-right">
              <div className="flex justify-between text-xs text-gray-600">
                <span>Subtotal neto:</span>
                <span className="font-semibold tabular-nums">{formatearMoneda(factura.total)}</span>
              </div>
              <div className="flex justify-between items-baseline pt-2 border-t-2 border-brand-950 text-base font-bold text-brand-950">
                <span>TOTAL:</span>
                <span className="text-3xl font-serif tabular-nums text-brand-900">
                  {formatearMoneda(factura.total)}
                </span>
              </div>
            </div>
          </div>

          {/* Pie de comprobante */}
          <div className="pt-6 border-t border-brand-100 text-center text-[10px] text-gray-400">
            Documento de control comercial interno · Gracias por su compra
          </div>
        </div>
      </div>

    </AppLayout>
  );
}
