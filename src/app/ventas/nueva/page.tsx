"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { ModalNuevoCliente } from "@/components/modals/ModalNuevoCliente";
import { cargarPaginas } from "@/lib/cargar-paginas";
import { formatearMoneda } from "@/lib/formatters";
import { Trash2, Plus, Minus, UserPlus, CreditCard, Banknote, Wallet, Receipt, AlertCircle } from "lucide-react";

interface ItemVenta {
  productoId: number;
  codigo: string;
  descripcion: string;
  precioUnitario: number; // en centavos
  cantidad: number;
  existencia: number;
  subtotal: number; // en centavos
}

export default function NuevaVentaPage() {
  const router = useRouter();

  // Estados de sesión y catálogos
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [productosCatalogo, setProductosCatalogo] = useState<Awaited<ReturnType<typeof import("@/services/productos.service").listarProductos>>["data"]>([]);
  const [clientesLista, setClientesLista] = useState<Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"]>([]);
  const [cargandoInicial, setCargandoInicial] = useState(true);

  // Borrador de venta
  const [clienteSeleccionadoId, setClienteSeleccionadoId] = useState<number | null>(null);
  const [items, setItems] = useState<ItemVenta[]>([]);
  const [productoIdAAgregar, setProductoIdAAgregar] = useState<string>("");
  const [cantidadAAgregar, setCantidadAAgregar] = useState<number>(1);

  // Forma de pago
  const [formaPago, setFormaPago] = useState<"contado" | "tarjeta" | "cuenta_corriente">("contado");
  const [montoRecibidoPesos, setMontoRecibidoPesos] = useState<string>("");

  // Modales y control de errores
  const [modalClienteAbierto, setModalClienteAbierto] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const [errorVenta, setErrorVenta] = useState<string | null>(null);

  const selectProductoRef = useRef<HTMLSelectElement>(null);

  // Carga inicial de datos
  useEffect(() => {
    async function cargarDatos() {
      try {
        const meRes = await fetch("/api/auth/me");
        if (meRes.status === 401) {
          router.push("/login");
          return;
        }
        if (!meRes.ok) {
          throw new Error("No se pudo verificar la sesión.");
        }

        const [productos, clientes] = await Promise.all([
          cargarPaginas<(typeof productosCatalogo)[number]>("/api/productos?activo=true"),
          cargarPaginas<(typeof clientesLista)[number]>("/api/clientes"),
        ]);

        setUsuario(await meRes.json());
        setProductosCatalogo(productos);
        setClientesLista(clientes);
        setProductoIdAAgregar(productos[0] ? String(productos[0].id) : "");
      } catch (error) {
        setErrorVenta(error instanceof Error ? error.message : "No se pudo iniciar la venta.");
      } finally {
        setCargandoInicial(false);
      }
    }
    cargarDatos();
  }, [router]);

  // Cliente seleccionado
  const clienteSeleccionado = clientesLista.find((c) => c.id === clienteSeleccionadoId) || null;

  // Cálculos de totales
  const totalFacturaCentavos = items.reduce((acc, it) => acc + it.subtotal, 0);
  const totalArticulos = items.reduce((acc, it) => acc + it.cantidad, 0);

  // Vuelto en efectivo
  const montoRecibidoCentavos = montoRecibidoPesos
    ? Math.round(parseFloat(montoRecibidoPesos) * 100)
    : totalFacturaCentavos;
  const vueltoCentavos = Math.max(0, montoRecibidoCentavos - totalFacturaCentavos);

  // Validación de cuenta corriente
  const puedeCuentaCorriente = clienteSeleccionado && clienteSeleccionado.cuentaCorriente;
  const saldoActualCliente = clienteSeleccionado?.saldo || 0;
  const limiteCreditoCliente = clienteSeleccionado?.limiteCredito ?? null;
  const saldoResultante = saldoActualCliente + totalFacturaCentavos;
  const excedeLimite =
    limiteCreditoCliente !== null && saldoResultante > limiteCreditoCliente;

  // Agregar producto al borrador
  const agregarProductoAlBorrador = () => {
    if (!productoIdAAgregar) return;
    const prod = productosCatalogo.find((p) => p.id === Number(productoIdAAgregar));
    if (!prod) return;

    if (prod.existencia <= 0) {
      setErrorVenta(`No hay existencias disponibles para ${prod.descripcion}.`);
      return;
    }

    const itemExistente = items.find((i) => i.productoId === prod.id);
    const cantAAgregar = Math.max(1, cantidadAAgregar);

    if (itemExistente) {
      const nuevaCantidad = itemExistente.cantidad + cantAAgregar;
      if (nuevaCantidad > prod.existencia) {
        setErrorVenta(
          `No puedes agregar ${cantAAgregar} unidad(es) más. Existencia máxima: ${prod.existencia} un.`
        );
        return;
      }
      setItems(
        items.map((i) =>
          i.productoId === prod.id
            ? {
                ...i,
                cantidad: nuevaCantidad,
                subtotal: nuevaCantidad * i.precioUnitario,
              }
            : i
        )
      );
    } else {
      if (cantAAgregar > prod.existencia) {
        setErrorVenta(
          `No puedes agregar ${cantAAgregar} unidades. Existencia máxima: ${prod.existencia} un.`
        );
        return;
      }
      setItems([
        ...items,
        {
          productoId: prod.id,
          codigo: prod.codigo,
          descripcion: prod.descripcion,
          precioUnitario: prod.precio,
          cantidad: cantAAgregar,
          existencia: prod.existencia,
          subtotal: cantAAgregar * prod.precio,
        },
      ]);
    }

    setErrorVenta(null);
    setCantidadAAgregar(1);
    selectProductoRef.current?.focus();
  };

  const modificarCantidad = (productoId: number, delta: number) => {
    setItems((prev) =>
      prev
        .map((it) => {
          if (it.productoId === productoId) {
            const nueva = it.cantidad + delta;
            if (nueva <= 0) return null;
            if (nueva > it.existencia) {
              setErrorVenta(`Stock máximo alcanzado para ${it.descripcion} (${it.existencia} un).`);
              return it;
            }
            return {
              ...it,
              cantidad: nueva,
              subtotal: nueva * it.precioUnitario,
            };
          }
          return it;
        })
        .filter(Boolean) as ItemVenta[]
    );
  };

  const eliminarItem = (productoId: number) => {
    setItems(items.filter((i) => i.productoId !== productoId));
  };

  // Confirmar venta
  const handleConfirmarVenta = async () => {
    if (items.length === 0) {
      setErrorVenta("Debes agregar al menos un producto a la venta.");
      return;
    }

    if (formaPago === "cuenta_corriente") {
      if (!clienteSeleccionado) {
        setErrorVenta("Consumidor final no puede comprar en cuenta corriente.");
        return;
      }
      if (!clienteSeleccionado.cuentaCorriente) {
        setErrorVenta("El cliente no tiene habilitada la cuenta corriente.");
        return;
      }
      if (excedeLimite) {
        setErrorVenta("La venta excede el límite de crédito disponible del cliente.");
        return;
      }
    }

    if (formaPago === "contado" && montoRecibidoCentavos < totalFacturaCentavos) {
      setErrorVenta("El monto recibido no puede ser inferior al total de la venta.");
      return;
    }

    setErrorVenta(null);
    setConfirmando(true);

    try {
      const payload = {
        clienteId: clienteSeleccionadoId,
        items: items.map((i) => ({
          productoId: i.productoId,
          cantidad: i.cantidad,
        })),
        pago: {
          forma: formaPago,
          ...(formaPago === "contado"
            ? {
                montoRecibido: montoRecibidoPesos
                  ? Math.round(parseFloat(montoRecibidoPesos) * 100)
                  : totalFacturaCentavos,
              }
            : {}),
        },
      };

      const res = await fetch("/api/facturas", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al emitir factura.");
      }

      // Redirigir directamente al detalle del comprobante recién emitido
      router.push(`/ventas/${data.id}`);
    } catch (err: unknown) {
      setErrorVenta((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
      setConfirmando(false);
    }
  };

  if (cargandoInicial) {
    return (
      <div className="min-h-screen flex items-center justify-center text-xs text-brand-800">
        Cargando mostrador de venta...
      </div>
    );
  }

  if (!usuario) {
    return errorVenta ? (
      <p className="p-6 text-red-700" role="alert">{errorVenta}</p>
    ) : null;
  }

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Ventas / Nueva Venta
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Crear comprobante de venta
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-1">
              Prepará los artículos, seleccioná el cliente y emití la factura.
            </p>
          </div>

          <Button
            variant="outline"
            onClick={() => router.push("/ventas")}
            className="text-xs font-semibold"
          >
            Ver historial de ventas →
          </Button>
        </div>

        {/* Layout de 2 columnas: Izquierda (Cliente + Productos) | Derecha (Resumen + Pago) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Columna Izquierda: 7 cols */}
          <div className="lg:col-span-7 space-y-6">
            {/* Panel 1: Cliente (RF-V2) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Cliente</CardTitle>
                  <p className="text-xs text-brand-800/60">Elegí a quién corresponde la venta.</p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setModalClienteAbierto(true)}
                  className="text-brand-800 text-xs font-bold hover:bg-brand-50"
                >
                  <UserPlus className="w-3.5 h-3.5 mr-1" />
                  + Nuevo cliente
                </Button>
              </CardHeader>

              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1.5">
                      Seleccionar cliente
                    </label>
                    <select
                      value={clienteSeleccionadoId || ""}
                      onChange={(e) => {
                        const val = e.target.value ? Number(e.target.value) : null;
                        setClienteSeleccionadoId(val);
                        if (!val && formaPago === "cuenta_corriente") {
                          setFormaPago("contado");
                        }
                      }}
                      className="flex h-10 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    >
                      <option value="">Consumidor final (Sin identificación)</option>
                      {clientesLista.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.nombre} · {c.tipoDoc} {c.nroDoc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-brand-900 mb-1.5">
                      Documento / Contacto
                    </label>
                    <div className="h-10 px-3 py-2 rounded-lg bg-brand-50/60 border border-brand-200 text-xs text-brand-900 flex items-center justify-between">
                      <span>
                        {clienteSeleccionado
                          ? `${clienteSeleccionado.tipoDoc} ${clienteSeleccionado.nroDoc}`
                          : "Consumidor final"}
                      </span>
                      {clienteSeleccionado && (
                        <Badge variant={clienteSeleccionado.cuentaCorriente ? "success" : "neutral"}>
                          {clienteSeleccionado.cuentaCorriente ? "Cta. Cte." : "Sin Cta."}
                        </Badge>
                      )}
                    </div>
                  </div>
                </div>

                {clienteSeleccionado && (
                  <div className="p-3 bg-brand-50/80 rounded-lg text-xs space-y-1 text-brand-900 border border-brand-200/60">
                    <div className="flex justify-between">
                      <span>Saldo adeudado actual:</span>
                      <strong className={clienteSeleccionado.saldo > 0 ? "text-amber-800" : "text-emerald-800"}>
                        {formatearMoneda(clienteSeleccionado.saldo)}
                      </strong>
                    </div>
                    {clienteSeleccionado.limiteCredito !== null && (
                      <div className="flex justify-between text-brand-800/80">
                        <span>Límite de crédito asignado:</span>
                        <span>{formatearMoneda(clienteSeleccionado.limiteCredito)}</span>
                      </div>
                    )}
                    {clienteSeleccionado.disponible !== null && (
                      <div className="flex justify-between font-semibold pt-1 border-t border-brand-200/60">
                        <span>Crédito disponible para compras:</span>
                        <span className={clienteSeleccionado.disponible > 0 ? "text-emerald-800" : "text-red-700"}>
                          {formatearMoneda(clienteSeleccionado.disponible)}
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Panel 2: Productos y Renglones de Venta (RF-V3, RF-V4) */}
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                  <CardTitle>Productos de la venta</CardTitle>
                  <p className="text-xs text-brand-800/60">Buscá y agregá artículos al mostrador.</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-brand-100 text-brand-900">
                  {totalArticulos} {totalArticulos === 1 ? "artículo" : "artículos"}
                </span>
              </CardHeader>

              <CardContent className="space-y-4">
                {/* Fila de búsqueda y agregado con Enter */}
                <div className="flex flex-col sm:flex-row gap-3 items-end">
                  <div className="flex-1 w-full">
                    <label className="block text-xs font-semibold text-brand-900 mb-1.5">
                      Agregar artículo (buscar por código o descripción)
                    </label>
                    <select
                      ref={selectProductoRef}
                      value={productoIdAAgregar}
                      onChange={(e) => setProductoIdAAgregar(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          agregarProductoAlBorrador();
                        }
                      }}
                      className="flex h-10 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-600"
                    >
                      {productosCatalogo.map((p) => (
                        <option
                          key={p.id}
                          value={p.id}
                          disabled={p.existencia <= 0}
                        >
                          {p.codigo} · {p.descripcion} · {formatearMoneda(p.precio)} ({p.existencia} un. disponible)
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="w-24 flex-none">
                    <label className="block text-xs font-semibold text-brand-900 mb-1.5">
                      Cantidad
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={cantidadAAgregar}
                      onChange={(e) => setCantidadAAgregar(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          agregarProductoAlBorrador();
                        }
                      }}
                      className="flex h-10 w-full rounded-lg border border-brand-200 bg-white px-3 py-2 text-sm text-center font-bold focus:outline-none focus:ring-2 focus:ring-brand-600"
                    />
                  </div>

                  <Button
                    type="button"
                    onClick={agregarProductoAlBorrador}
                    className="h-10 text-xs font-bold"
                  >
                    <Plus className="w-4 h-4 mr-1" />
                    Agregar
                  </Button>
                </div>

                {/* Tabla de ítems cargados */}
                <div className="border border-brand-200 rounded-lg overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                      <tr>
                        <th className="py-2.5 px-3 font-bold">Artículo</th>
                        <th className="py-2.5 px-3 font-bold text-center">Cantidad</th>
                        <th className="py-2.5 px-3 font-bold text-right">Unitario</th>
                        <th className="py-2.5 px-3 font-bold text-right">Subtotal</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-100">
                      {items.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="py-8 text-center text-gray-400">
                            No hay productos agregados a la venta todavía.
                          </td>
                        </tr>
                      ) : (
                        items.map((it) => (
                          <tr key={it.productoId} className="hover:bg-brand-50/40">
                            <td className="py-2.5 px-3">
                              <span className="font-semibold text-brand-950 block">
                                {it.descripcion}
                              </span>
                              <span className="text-[10px] text-brand-800/60 font-mono">
                                {it.codigo} · Stock: {it.existencia} un.
                              </span>
                            </td>

                            <td className="py-2.5 px-3">
                              <div className="flex items-center justify-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => modificarCantidad(it.productoId, -1)}
                                  className="w-6 h-6 rounded bg-brand-100 hover:bg-brand-200 text-brand-900 flex items-center justify-center text-xs font-bold"
                                >
                                  <Minus className="w-3 h-3" />
                                </button>
                                <span className="font-bold text-sm w-7 text-center">
                                  {it.cantidad}
                                </span>
                                <button
                                  type="button"
                                  onClick={() => modificarCantidad(it.productoId, 1)}
                                  className="w-6 h-6 rounded bg-brand-100 hover:bg-brand-200 text-brand-900 flex items-center justify-center text-xs font-bold"
                                >
                                  <Plus className="w-3 h-3" />
                                </button>
                              </div>
                            </td>

                            <td className="py-2.5 px-3 text-right tabular-nums">
                              {formatearMoneda(it.precioUnitario)}
                            </td>

                            <td className="py-2.5 px-3 text-right font-bold text-brand-950 tabular-nums">
                              {formatearMoneda(it.subtotal)}
                            </td>

                            <td className="py-2.5 px-3 text-center">
                              <button
                                type="button"
                                onClick={() => eliminarItem(it.productoId)}
                                className="p-1 text-red-500 hover:text-red-700 hover:bg-red-50 rounded"
                                title="Quitar ítem"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
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

          {/* Columna Derecha: 5 cols (Resumen de Venta + Forma de Pago + Confirmación) */}
          <div className="lg:col-span-5 space-y-6">
            <Card className="border-t-4 border-t-[#254d3c] shadow-md">
              <CardHeader className="pb-3 border-b border-brand-100">
                <CardTitle>Resumen de Comprobante</CardTitle>
                <p className="text-xs text-brand-800/60">Punto de Venta 0001 · Venta en mostrador</p>
              </CardHeader>

              <CardContent className="space-y-5 pt-4">
                {/* Desglose de totales */}
                <div className="space-y-2 text-xs">
                  <div className="flex justify-between text-brand-800/80">
                    <span>Artículos cargados</span>
                    <span className="font-semibold">{totalArticulos} unidades</span>
                  </div>
                  <div className="flex justify-between text-brand-800/80">
                    <span>Subtotal</span>
                    <span className="font-semibold tabular-nums">{formatearMoneda(totalFacturaCentavos)}</span>
                  </div>
                  <div className="flex justify-between items-baseline pt-2 border-t border-brand-200 text-base font-bold text-brand-950">
                    <span>Total a Facturar</span>
                    <span className="text-2xl font-serif tabular-nums text-brand-900">
                      {formatearMoneda(totalFacturaCentavos)}
                    </span>
                  </div>
                </div>

                {/* Selección de Forma de Pago (RF-V5) */}
                <div className="space-y-3 pt-3 border-t border-brand-100">
                  <label className="block text-xs font-bold uppercase tracking-wider text-brand-900">
                    Forma de Pago
                  </label>

                  <div className="space-y-2">
                    {/* Opción 1: Contado */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formaPago === "contado"
                          ? "border-[#254d3c] bg-brand-50/70"
                          : "border-brand-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formaPago"
                        value="contado"
                        checked={formaPago === "contado"}
                        onChange={() => setFormaPago("contado")}
                        className="text-[#254d3c] focus:ring-[#254d3c]"
                      />
                      <Banknote className="w-4 h-4 text-emerald-700" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-brand-950 block">Contado / Efectivo</span>
                        <span className="text-[10px] text-brand-800/60">Cobro con vuelto inmediato</span>
                      </div>
                    </label>

                    {formaPago === "contado" && (
                      <div className="p-3 bg-brand-50/50 rounded-lg space-y-2 border border-brand-200/60 text-xs">
                        <Input
                          label="Monto recibido ($)"
                          type="number"
                          min="0"
                          step="0.01"
                          placeholder={((totalFacturaCentavos || 0) / 100).toFixed(2)}
                          value={montoRecibidoPesos}
                          onChange={(e) => setMontoRecibidoPesos(e.target.value)}
                        />
                        <div className="flex justify-between items-center text-xs font-semibold pt-1">
                          <span>Vuelto a entregar:</span>
                          <span className="text-sm font-bold text-emerald-800 tabular-nums">
                            {formatearMoneda(vueltoCentavos)}
                          </span>
                        </div>
                      </div>
                    )}

                    {/* Opción 2: Tarjeta */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        formaPago === "tarjeta"
                          ? "border-[#254d3c] bg-brand-50/70"
                          : "border-brand-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formaPago"
                        value="tarjeta"
                        checked={formaPago === "tarjeta"}
                        onChange={() => setFormaPago("tarjeta")}
                        className="text-[#254d3c] focus:ring-[#254d3c]"
                      />
                      <CreditCard className="w-4 h-4 text-blue-700" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-brand-950 block">Tarjeta de Débito / Crédito</span>
                        <span className="text-[10px] text-brand-800/60">Pago simulado</span>
                      </div>
                    </label>

                    {/* Opción 3: Cuenta Corriente */}
                    <label
                      className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-colors ${
                        !puedeCuentaCorriente
                          ? "opacity-60 bg-gray-50 cursor-not-allowed"
                          : formaPago === "cuenta_corriente"
                          ? "border-[#254d3c] bg-brand-50/70"
                          : "border-brand-200 bg-white hover:bg-gray-50"
                      }`}
                    >
                      <input
                        type="radio"
                        name="formaPago"
                        value="cuenta_corriente"
                        disabled={!puedeCuentaCorriente}
                        checked={formaPago === "cuenta_corriente"}
                        onChange={() => puedeCuentaCorriente && setFormaPago("cuenta_corriente")}
                        className="text-[#254d3c] focus:ring-[#254d3c]"
                      />
                      <Wallet className="w-4 h-4 text-amber-700" />
                      <div className="flex-1">
                        <span className="text-xs font-bold text-brand-950 block">Cuenta Corriente</span>
                        <span className="text-[10px] text-brand-800/60">
                          {puedeCuentaCorriente
                            ? "Genera deuda en el saldo del cliente"
                            : "Requiere cliente con cuenta habilitada"}
                        </span>
                      </div>
                    </label>

                    {formaPago === "cuenta_corriente" && clienteSeleccionado && (
                      <div className="p-3 bg-amber-50 rounded-lg space-y-1.5 border border-amber-200 text-xs text-amber-950">
                        <div className="flex justify-between">
                          <span>Saldo actual:</span>
                          <span>{formatearMoneda(saldoActualCliente)}</span>
                        </div>
                        <div className="flex justify-between font-bold">
                          <span>Nuevo saldo estimado:</span>
                          <span className={excedeLimite ? "text-red-700" : "text-amber-900"}>
                            {formatearMoneda(saldoResultante)}
                          </span>
                        </div>
                        {excedeLimite && (
                          <p className="text-[11px] font-bold text-red-700 pt-1 border-t border-amber-200">
                            ⚠ La venta excede el límite de crédito disponible ({formatearMoneda(limiteCreditoCliente)}).
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                {/* Error de venta */}
                {errorVenta && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 flex-none mt-0.5" />
                    <span>{errorVenta}</span>
                  </div>
                )}

                {/* Botón de Confirmación Atómica */}
                <Button
                  type="button"
                  onClick={handleConfirmarVenta}
                  isLoading={confirmando}
                  disabled={items.length === 0 || (formaPago === "cuenta_corriente" && excedeLimite)}
                  className="w-full h-12 text-sm font-bold shadow-md bg-[#254d3c] hover:bg-[#34634d]"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  Confirmar Venta →
                </Button>
                <p className="text-[11px] text-center text-brand-800/60 leading-tight">
                  Al confirmar se verifican y descuentan las existencias en una sola transacción atómica.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* Modal para alta rápida de cliente en el momento sin perder el borrador */}
      <ModalNuevoCliente
        isOpen={modalClienteAbierto}
        onClose={() => setModalClienteAbierto(false)}
        onClienteCreado={(nuevo) => {
          setClientesLista((prev) => [...prev, nuevo]);
          setClienteSeleccionadoId(nuevo.id);
          if (nuevo.cuentaCorriente) {
            setFormaPago("cuenta_corriente");
          }
        }}
      />
    </AppLayout>
  );
}
