"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ModalNuevoCliente } from "@/components/modals/ModalNuevoCliente";
import { ModalRegistrarPago } from "@/components/modals/ModalRegistrarPago";
import { formatearMoneda } from "@/lib/formatters";
import { UserPlus, Search, Wallet, Eye, HandCoins } from "lucide-react";

export default function ClientesPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [clientes, setClientes] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"]>([]);
  const [totalAdeudado, setTotalAdeudado] = useState<number | null>(null);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [conDeuda, setConDeuda] = useState(false);

  // Modales
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [clienteParaPago, setClienteParaPago] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"][number] | null>(null);

  useEffect(() => {
    async function checkAuth() {
      const res = await fetch("/api/auth/me");
      if (!res.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await res.json());
    }
    checkAuth();
  }, [router]);

  const cargarClientes = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda);
      if (conDeuda) params.set("conDeuda", "true");
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/clientes?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setClientes(data.data || []);
        setTotal(data.total || 0);
        setTotalAdeudado(data.totalAdeudado ?? null);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [busqueda, conDeuda, page]);

  useEffect(() => {
    cargarClientes();
  }, [cargarClientes]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setBusqueda(q);
    if (page === 1 && busqueda === q) void cargarClientes();
  };

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Personas / Cuentas Corrientes
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Clientes y saldos comerciales
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-1">
              Consultá sus datos, estado de deuda, límites de crédito y cuenta corriente.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/clientes/saldos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 bg-brand-100 hover:bg-brand-200 px-3.5 py-2.5 rounded-lg transition-colors"
            >
              <Wallet className="w-4 h-4" />
              Ranking de saldos
            </Link>

            <Button
              onClick={() => setModalNuevoAbierto(true)}
              className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
            >
              <UserPlus className="w-4 h-4 mr-1.5" />
              Nuevo cliente
            </Button>
          </div>
        </div>

        {/* Filtros */}
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleBuscar} className="flex flex-col sm:flex-row gap-3 items-end">
              <div className="flex-1 w-full">
                <Input
                  label="Buscar cliente por nombre o documento"
                  placeholder="Ej. María González o 28.456.123..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div className="flex items-center h-10 pb-1 px-2">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-900">
                  <input
                    type="checkbox"
                    checked={conDeuda}
                    onChange={(e) => {
                      setConDeuda(e.target.checked);
                      setPage(1);
                    }}
                    className="w-4 h-4 rounded text-amber-600 focus:ring-amber-500"
                  />
                  Solo con saldo pendiente
                </label>
              </div>

              <Button type="submit" className="h-10 text-xs font-bold flex-none">
                <Search className="w-3.5 h-3.5 mr-1" />
                Buscar
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Banner de total adeudado si conDeuda está activo */}
        {conDeuda && totalAdeudado !== null && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-center justify-between text-xs text-amber-950">
            <div>
              <span className="font-bold text-sm block">Total adeudado por los clientes filtrados</span>
              <p className="text-amber-800/80">Suma total de cuentas con saldo pendiente de cobro</p>
            </div>
            <span className="text-2xl font-serif font-bold text-amber-900 tabular-nums">
              {formatearMoneda(totalAdeudado)}
            </span>
          </div>
        )}

        {/* Tabla de Clientes */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Cliente</th>
                  <th className="py-3 px-4 font-bold">Documento</th>
                  <th className="py-3 px-4 font-bold">Contacto</th>
                  <th className="py-3 px-4 font-bold">Cuenta Corriente</th>
                  <th className="py-3 px-4 font-bold text-right">Saldo Adeudado</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      Cargando clientes...
                    </td>
                  </tr>
                ) : clientes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-gray-400">
                      No se encontraron clientes con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  clientes.map((c) => (
                    <tr key={c.id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-4 font-semibold text-brand-950 text-sm">
                        {c.nombre}
                      </td>

                      <td className="py-3 px-4 text-brand-800/80 font-mono">
                        {c.tipoDoc} {c.nroDoc}
                      </td>

                      <td className="py-3 px-4 text-brand-800/80">
                        {c.telefono && <div>{c.telefono}</div>}
                        {c.email && <div className="text-gray-400 text-[10px]">{c.email}</div>}
                        {!c.telefono && !c.email && <span className="text-gray-400">—</span>}
                      </td>

                      <td className="py-3 px-4">
                        {c.cuentaCorriente ? (
                          <Badge variant="success">Habilitada</Badge>
                        ) : (
                          <Badge variant="neutral">Inhabilitada</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right tabular-nums">
                        <span
                          className={`font-serif font-bold text-base block ${
                            c.saldo > 0 ? "text-amber-800" : "text-emerald-700"
                          }`}
                        >
                          {formatearMoneda(c.saldo)}
                        </span>
                        {c.limiteCredito !== null && (
                          <span className="text-[10px] text-gray-400 block">
                            Límite: {formatearMoneda(c.limiteCredito)}
                          </span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {c.saldo > 0 && (
                            <button
                              type="button"
                              onClick={() => setClienteParaPago(c)}
                              className="px-2.5 py-1.5 text-xs font-semibold rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 flex items-center gap-1 transition-colors"
                            >
                              <HandCoins className="w-3.5 h-3.5" />
                              Pagar
                            </button>
                          )}

                          <Link
                            href={`/clientes/${c.id}`}
                            className="px-2.5 py-1.5 text-xs font-semibold rounded bg-brand-100 hover:bg-brand-200 text-brand-900 flex items-center gap-1 transition-colors"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            Ver cuenta
                          </Link>
                        </div>
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
                Mostrando página {page} de {Math.ceil(total / 20)} ({total} clientes)
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

      {/* Modal Nuevo Cliente */}
      <ModalNuevoCliente
        isOpen={modalNuevoAbierto}
        onClose={() => setModalNuevoAbierto(false)}
        onClienteCreado={cargarClientes}
      />

      {/* Modal Registrar Pago */}
      {clienteParaPago && (
        <ModalRegistrarPago
          isOpen={!!clienteParaPago}
          onClose={() => setClienteParaPago(null)}
          cliente={clienteParaPago}
          onPagoRegistrado={(pago) => {
            cargarClientes();
            router.push(`/pagos/${pago.id}`);
          }}
        />
      )}
    </AppLayout>
  );
}
