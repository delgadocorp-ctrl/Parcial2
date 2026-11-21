"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { ModalMovimientoStock } from "@/components/modals/ModalMovimientoStock";
import { formatearMoneda, formatearFechaHora } from "@/lib/formatters";
import { ArrowLeft, ArrowUpDown, History, AlertTriangle } from "lucide-react";

export default function FichaProductoPage() {
  const params = useParams();
  const router = useRouter();
  const id = params?.id as string;

  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [producto, setProducto] = useState<Awaited<ReturnType<typeof import("@/services/productos.service").obtenerProducto>> | null>(null);
  const [movimientos, setMovimientos] = useState<Awaited<ReturnType<typeof import("@/services/stock.service").listarMovimientosStock>>["data"]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [modalMovimientoAbierto, setModalMovimientoAbierto] = useState(false);

  const cargarDatos = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, prodRes, movsRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch(`/api/productos/${id}`),
        fetch(`/api/productos/${id}/movimientos?pageSize=50`),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      setUsuario(await meRes.json());

      if (prodRes.ok) {
        setProducto(await prodRes.json());
      }
      if (movsRes.ok) {
        const movData = await movsRes.json();
        setMovimientos(movData.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [id, router]);

  useEffect(() => {
    if (id) cargarDatos();
  }, [id, cargarDatos]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-brand-800">
        Cargando ficha de producto...
      </div>
    );
  }

  if (!producto) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-red-600 font-semibold mb-3">Producto no encontrado.</p>
        <Link href="/productos" className="text-xs text-brand-800 underline">
          ← Volver a productos
        </Link>
      </div>
    );
  }

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link
              href="/productos"
              className="p-2 text-brand-800 hover:text-brand-950 hover:bg-brand-100 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
                Catálogo / Ficha de artículo
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
                {producto.descripcion}
              </h1>
              <p className="text-xs text-brand-800/70 font-mono mt-0.5">
                Código: {producto.codigo} · Categoría: {producto.categoria.nombre}
              </p>
            </div>
          </div>

          <Button
            onClick={() => setModalMovimientoAbierto(true)}
            className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
          >
            <ArrowUpDown className="w-4 h-4 mr-1.5" />
            Registrar movimiento manual
          </Button>
        </div>

        {/* Tarjetas de Datos del Producto */}
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Precio de Venta</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-brand-950 tabular-nums">
                {formatearMoneda(producto.precio)}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Existencias Actuales</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-brand-950 tabular-nums">
                {producto.existencia} unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Stock Mínimo</span>
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-serif font-bold text-brand-950 tabular-nums">
                {producto.stockMinimo} unidades
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-1">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Estado de Stock</span>
            </CardHeader>
            <CardContent className="pt-1">
              {producto.bajoMinimo ? (
                <Badge variant="warning" className="flex items-center gap-1 w-max">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  Bajo mínimo de reposición
                </Badge>
              ) : (
                <Badge variant="success">Existencias en nivel óptimo</Badge>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Historial de Movimientos de Stock (RF-P6) */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <History className="w-4 h-4 text-brand-800" />
                Historial de movimientos de stock
              </CardTitle>
              <p className="text-xs text-brand-800/60 mt-1">
                Trazabilidad completa: entradas, salidas manuales, ventas y anulaciones
              </p>
            </div>
            <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-100 text-brand-900">
              {movimientos.length} movimientos
            </span>
          </CardHeader>

          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Fecha y Hora</th>
                    <th className="py-2.5 px-3 font-bold">Tipo</th>
                    <th className="py-2.5 px-3 font-bold text-right">Cantidad</th>
                    <th className="py-2.5 px-3 font-bold text-center">Stock Resultante</th>
                    <th className="py-2.5 px-3 font-bold">Motivo / Observación</th>
                    <th className="py-2.5 px-3 font-bold">Comprobante / Referencia</th>
                    <th className="py-2.5 px-3 font-bold">Operador</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {movimientos.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-gray-400">
                        No hay movimientos registrados para este artículo.
                      </td>
                    </tr>
                  ) : (
                    movimientos.map((m) => (
                      <tr key={m.id} className="hover:bg-brand-50/40">
                        <td className="py-2.5 px-3 text-brand-800/80">
                          {formatearFechaHora(m.fecha)}
                        </td>

                        <td className="py-2.5 px-3">
                          <Badge
                            variant={
                              m.tipo === "ingreso" || m.tipo === "anulacion"
                                ? "success"
                                : "warning"
                            }
                          >
                            {m.tipo.toUpperCase()}
                          </Badge>
                        </td>

                        <td
                          className={`py-2.5 px-3 text-right font-bold text-sm tabular-nums ${
                            m.cantidad > 0 ? "text-emerald-700" : "text-amber-800"
                          }`}
                        >
                          {m.cantidad > 0 ? `+${m.cantidad}` : m.cantidad}
                        </td>

                        <td className="py-2.5 px-3 text-center font-semibold tabular-nums text-brand-950">
                          {m.existenciaResultante} un.
                        </td>

                        <td className="py-2.5 px-3 font-medium text-brand-950">
                          {m.motivo}
                          {m.observacion && (
                            <span className="text-gray-400 block text-[10px]">
                              {m.observacion}
                            </span>
                          )}
                        </td>

                        <td className="py-2.5 px-3">
                          {m.referencia ? (
                            <Link
                              href={`/ventas/${m.referencia.facturaId}`}
                              className="text-brand-800 hover:underline font-mono font-semibold"
                            >
                              {m.referencia.numero}
                            </Link>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>

                        <td className="py-2.5 px-3 text-brand-800/70">
                          {m.usuario.nombre}
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

      {/* Modal de movimiento */}
      <ModalMovimientoStock
        isOpen={modalMovimientoAbierto}
        onClose={() => setModalMovimientoAbierto(false)}
        producto={producto}
        onMovimientoRegistrado={cargarDatos}
      />
    </AppLayout>
  );
}
