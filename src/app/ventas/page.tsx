"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { formatearMoneda, formatearFechaHora } from "@/lib/formatters";
import { ShoppingCart, Filter, Eye } from "lucide-react";

export default function HistorialVentasPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [facturas, setFacturas] = useState<Awaited<ReturnType<typeof import("@/services/facturas.service").listarFacturas>>["data"]>([]);
  const [totalEmitido, setTotalEmitido] = useState<number>(0);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [desdeAplicado, setDesdeAplicado] = useState("");
  const [hastaAplicado, setHastaAplicado] = useState("");
  const [forma, setForma] = useState("");
  const [estado, setEstado] = useState("");
  const [desde, setDesde] = useState("");
  const [hasta, setHasta] = useState("");

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      const data = await res.json();
      setUsuario(data);
    }
    checkAuth();
  }, [router]);

  const cargarFacturas = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda);
      if (forma) params.set("forma", forma);
      if (estado) params.set("estado", estado);
      if (desdeAplicado) params.set("desde", desdeAplicado);
      if (hastaAplicado) params.set("hasta", hastaAplicado);
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/facturas?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setFacturas(data.data || []);
        setTotalEmitido(data.totalEmitido || 0);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [busqueda, forma, estado, desdeAplicado, hastaAplicado, page]);

  useEffect(() => {
    cargarFacturas();
  }, [cargarFacturas]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setBusqueda(q);
    setDesdeAplicado(desde);
    setHastaAplicado(hasta);
    if (page === 1 && busqueda === q && desdeAplicado === desde && hastaAplicado === hasta) void cargarFacturas();
  };

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Ventas / Historial
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Comprobantes de venta
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-1">
              Consultá las operaciones registradas, comprobantes emitidos y anulaciones.
            </p>
          </div>

          <Link
            href="/ventas/nueva"
            className="inline-flex items-center gap-2 bg-[#254d3c] hover:bg-[#34634d] text-white px-4 py-2.5 rounded-lg text-sm font-bold shadow-sm transition-colors"
          >
            <ShoppingCart className="w-4 h-4" />
            Nueva venta
          </Link>
        </div>

        {/* Resumen superior */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card>
            <CardContent className="pt-4">
              <span className="text-xs font-bold text-brand-800/70 uppercase">Comprobantes listados</span>
              <p className="text-2xl font-serif font-medium text-brand-950 mt-1">{total}</p>
            </CardContent>
          </Card>

          <Card className="sm:col-span-2">
            <CardContent className="pt-4 flex justify-between items-center">
              <div>
                <span className="text-xs font-bold text-brand-800/70 uppercase">Total emitido (filtrado)</span>
                <p className="text-2xl font-serif font-medium text-emerald-850 mt-1 tabular-nums">
                  {formatearMoneda(totalEmitido)}
                </p>
              </div>
              <span className="text-xs text-brand-800/60 text-right">
                Solo incluye facturas en estado emitida
              </span>
            </CardContent>
          </Card>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleBuscar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input
                  label="Buscar por número o cliente"
                  placeholder="Ej. 0001-00000001 o Mariana..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Forma de pago"
                  value={forma}
                  onChange={(e) => {
                    setForma(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas</option>
                  <option value="contado">Contado</option>
                  <option value="tarjeta">Tarjeta</option>
                  <option value="cuenta_corriente">Cuenta Corriente</option>
                </Select>
              </div>

              <div>
                <Select
                  label="Estado"
                  value={estado}
                  onChange={(e) => {
                    setEstado(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todos</option>
                  <option value="emitida">Emitida</option>
                  <option value="anulada">Anulada</option>
                </Select>
              </div>

              <div>
                <Input
                  label="Desde"
                  type="date"
                  value={desde}
                  onChange={(e) => setDesde(e.target.value)}
                />
              </div>

              <div>
                <Input
                  label="Hasta"
                  type="date"
                  value={hasta}
                  onChange={(e) => setHasta(e.target.value)}
                />
              </div>

              <div>
                <Button type="submit" className="w-full h-10 text-xs font-bold">
                  <Filter className="w-3.5 h-3.5 mr-1" />
                  Filtrar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabla de Facturas */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Comprobante</th>
                  <th className="py-3 px-4 font-bold">Fecha y Hora</th>
                  <th className="py-3 px-4 font-bold">Cliente</th>
                  <th className="py-3 px-4 font-bold">Forma de Pago</th>
                  <th className="py-3 px-4 font-bold">Estado</th>
                  <th className="py-3 px-4 font-bold text-right">Total</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Cargando comprobantes...
                    </td>
                  </tr>
                ) : facturas.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No se encontraron facturas con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  facturas.map((f) => (
                    <tr key={f.id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-brand-950">
                        {f.numeroFormateado}
                      </td>

                      <td className="py-3 px-4 text-brand-800/80">
                        {formatearFechaHora(f.fecha)}
                      </td>

                      <td className="py-3 px-4 font-medium text-brand-950">
                        {f.cliente ? f.cliente.nombre : <span className="text-gray-400">Consumidor final</span>}
                      </td>

                      <td className="py-3 px-4">
                        <Badge
                          variant={
                            f.formaPago === "cuenta_corriente"
                              ? "warning"
                              : f.formaPago === "contado"
                              ? "success"
                              : "info"
                          }
                        >
                          {f.formaPago === "cuenta_corriente"
                            ? "Cta. Cte."
                            : f.formaPago === "contado"
                            ? "Contado"
                            : "Tarjeta"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4">
                        <Badge variant={f.estado === "emitida" ? "success" : "danger"}>
                          {f.estado === "emitida" ? "Emitida" : "Anulada"}
                        </Badge>
                      </td>

                      <td className="py-3 px-4 text-right font-bold tabular-nums text-brand-950">
                        {formatearMoneda(f.total)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <Link
                          href={`/ventas/${f.id}`}
                          className="inline-flex items-center gap-1 text-xs font-semibold text-brand-800 hover:text-brand-950 bg-brand-100 hover:bg-brand-200 px-2.5 py-1.5 rounded-md transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Ver
                        </Link>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          {/* Paginación */}
          {total > 20 && (
            <div className="p-4 border-t border-brand-100 flex items-center justify-between text-xs text-brand-800">
              <span>
                Mostrando página {page} de {Math.ceil(total / 20)} ({total} facturas)
              </span>
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page <= 1}
                  onClick={() => setPage(page - 1)}
                >
                  Anterior
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={page >= Math.ceil(total / 20)}
                  onClick={() => setPage(page + 1)}
                >
                  Siguiente
                </Button>
              </div>
            </div>
          )}
        </Card>
      </div>
    </AppLayout>
  );
}
