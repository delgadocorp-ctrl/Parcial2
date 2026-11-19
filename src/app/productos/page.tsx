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
import { Modal } from "@/components/ui/Modal";
import { ModalMovimientoStock } from "@/components/modals/ModalMovimientoStock";
import { formatearMoneda } from "@/lib/formatters";
import { Plus, Search, AlertTriangle, ArrowUpDown, Eye } from "lucide-react";

export default function CatalogoProductosPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [productos, setProductos] = useState<Awaited<ReturnType<typeof import("@/services/productos.service").listarProductos>>["data"]>([]);
  const [categorias, setCategorias] = useState<Awaited<ReturnType<typeof import("@/services/categorias.service").listarCategorias>>>([]);
  const [page, setPage] = useState<number>(1);
  const [total, setTotal] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Filtros
  const [q, setQ] = useState("");
  const [busqueda, setBusqueda] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [bajoMinimo, setBajoMinimo] = useState(false);

  // Modal Nuevo Producto (Admin)
  const [modalNuevoAbierto, setModalNuevoAbierto] = useState(false);
  const [nuevoCodigo, setNuevoCodigo] = useState("");
  const [nuevoDescripcion, setNuevoDescripcion] = useState("");
  const [nuevoCategoriaId, setNuevoCategoriaId] = useState("");
  const [nuevoPrecioPesos, setNuevoPrecioPesos] = useState("");
  const [nuevoStockMinimo, setNuevoStockMinimo] = useState("5");
  const [nuevoStockInicial, setNuevoStockInicial] = useState("0");
  const [guardandoNuevo, setGuardandoNuevo] = useState(false);
  const [errorNuevo, setErrorNuevo] = useState<string | null>(null);

  // Modal Movimiento Stock
  const [productoParaMovimiento, setProductoParaMovimiento] = useState<Awaited<ReturnType<typeof import("@/services/productos.service").listarProductos>>["data"][number] | null>(null);

  useEffect(() => {
    async function init() {
      const [meRes, catRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/categorias"),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await meRes.json());
      const cats = await catRes.json();
      setCategorias(cats || []);
      if (cats.length > 0) setNuevoCategoriaId(String(cats[0].id));
    }
    init();
  }, [router]);

  const cargarProductos = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (busqueda) params.set("q", busqueda);
      if (categoriaId) params.set("categoriaId", categoriaId);
      if (bajoMinimo) params.set("bajoMinimo", "true");
      params.set("page", String(page));
      params.set("pageSize", "20");

      const res = await fetch(`/api/productos?${params.toString()}`);
      if (res.ok) {
        const data = await res.json();
        setProductos(data.data || []);
        setTotal(data.total || 0);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [busqueda, categoriaId, bajoMinimo, page]);

  useEffect(() => {
    cargarProductos();
  }, [cargarProductos]);

  const handleBuscar = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setBusqueda(q);
    if (page === 1 && busqueda === q) void cargarProductos();
  };

  const handleCrearProducto = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorNuevo(null);
    setGuardandoNuevo(true);

    try {
      const precioCentavos = Math.round(parseFloat(nuevoPrecioPesos) * 100);
      if (isNaN(precioCentavos) || precioCentavos <= 0) {
        throw new Error("El precio debe ser un número positivo.");
      }

      const payload = {
        codigo: nuevoCodigo.trim().toUpperCase(),
        descripcion: nuevoDescripcion.trim(),
        categoriaId: Number(nuevoCategoriaId),
        precio: precioCentavos,
        stockMinimo: parseInt(nuevoStockMinimo, 10) || 0,
        stockInicial: parseInt(nuevoStockInicial, 10) || 0,
      };

      const res = await fetch("/api/productos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear producto.");
      }

      setModalNuevoAbierto(false);
      setNuevoCodigo("");
      setNuevoDescripcion("");
      setNuevoPrecioPesos("");
      setNuevoStockInicial("0");
      cargarProductos();
    } catch (err: unknown) {
      setErrorNuevo((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoNuevo(false);
    }
  };

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Catálogo / Existencias
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Productos y control de stock
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-1">
              Administrá los artículos, categorías, niveles de reposición e historial de movimientos.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <Link
              href="/productos/categorias"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-800 bg-brand-100 hover:bg-brand-200 px-3.5 py-2.5 rounded-lg transition-colors"
            >
              Gestionar categorías
            </Link>

            {usuario.rol === "admin" && (
              <Button
                onClick={() => setModalNuevoAbierto(true)}
                className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
              >
                <Plus className="w-4 h-4 mr-1.5" />
                Nuevo producto
              </Button>
            )}
          </div>
        </div>

        {/* Barra de Filtros */}
        <Card>
          <CardContent className="pt-4">
            <form onSubmit={handleBuscar} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 items-end">
              <div className="sm:col-span-2">
                <Input
                  label="Buscar por código o descripción"
                  placeholder="Ej. CAF-001 o café molido..."
                  value={q}
                  onChange={(e) => setQ(e.target.value)}
                />
              </div>

              <div>
                <Select
                  label="Categoría"
                  value={categoriaId}
                  onChange={(e) => {
                    setCategoriaId(e.target.value);
                    setPage(1);
                  }}
                >
                  <option value="">Todas las categorías</option>
                  {categorias.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.nombre}
                    </option>
                  ))}
                </Select>
              </div>

              <div className="flex items-center h-10 pb-1">
                <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-900">
                  <input
                    type="checkbox"
                    checked={bajoMinimo}
                    onChange={(e) => {
                      setBajoMinimo(e.target.checked);
                      setPage(1);
                    }}
                    className="w-4 h-4 rounded text-red-600 focus:ring-red-500"
                  />
                  Solo bajo mínimo ({productos.filter((p) => p.bajoMinimo).length})
                </label>
              </div>

              <div>
                <Button type="submit" className="w-full h-10 text-xs font-bold">
                  <Search className="w-3.5 h-3.5 mr-1" />
                  Buscar
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {/* Tabla de Productos */}
        <Card>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4 font-bold">Código</th>
                  <th className="py-3 px-4 font-bold">Descripción</th>
                  <th className="py-3 px-4 font-bold">Categoría</th>
                  <th className="py-3 px-4 font-bold text-right">Precio de Venta</th>
                  <th className="py-3 px-4 font-bold text-center">Stock Actual</th>
                  <th className="py-3 px-4 font-bold">Estado Stock</th>
                  <th className="py-3 px-4 font-bold text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      Cargando catálogo...
                    </td>
                  </tr>
                ) : productos.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-gray-400">
                      No se encontraron productos con los filtros seleccionados.
                    </td>
                  </tr>
                ) : (
                  productos.map((p) => (
                    <tr key={p.id} className="hover:bg-brand-50/40">
                      <td className="py-3 px-4 font-mono font-bold text-brand-950">
                        {p.codigo}
                      </td>

                      <td className="py-3 px-4 font-semibold text-brand-950">
                        {p.descripcion}
                      </td>

                      <td className="py-3 px-4 text-brand-800/80">
                        {p.categoria.nombre}
                      </td>

                      <td className="py-3 px-4 text-right font-bold tabular-nums text-brand-950">
                        {formatearMoneda(p.precio)}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <span className="font-bold text-sm block">{p.existencia} un.</span>
                        <div className="w-16 h-1.5 bg-gray-200 rounded-full mx-auto mt-1 overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              p.existencia <= p.stockMinimo ? "bg-red-500" : "bg-emerald-600"
                            }`}
                            style={{
                              width: `${Math.min(100, Math.max(5, (p.existencia / (p.stockMinimo * 2 || 10)) * 100))}%`,
                            }}
                          />
                        </div>
                      </td>

                      <td className="py-3 px-4">
                        {p.bajoMinimo ? (
                          <Badge variant="warning" className="flex items-center gap-1 w-max">
                            <AlertTriangle className="w-3 h-3 text-amber-600" />
                            Stock bajo (mín: {p.stockMinimo})
                          </Badge>
                        ) : (
                          <Badge variant="success">Normal (mín: {p.stockMinimo})</Badge>
                        )}
                      </td>

                      <td className="py-3 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          {usuario.rol === "admin" && (
                            <button
                              type="button"
                              onClick={() => setProductoParaMovimiento(p)}
                              className="px-2 py-1 text-xs font-semibold rounded bg-brand-50 hover:bg-brand-100 text-brand-900 border border-brand-200 flex items-center gap-1"
                              title="Registrar entrada/salida manual"
                            >
                              <ArrowUpDown className="w-3 h-3" />
                              Mover
                            </button>
                          )}

                          <Link
                            href={`/productos/${p.id}`}
                            className="px-2 py-1 text-xs font-semibold rounded bg-brand-100 hover:bg-brand-200 text-brand-900 flex items-center gap-1"
                            title="Ver ficha y movimientos"
                          >
                            <Eye className="w-3 h-3" />
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

          {/* Paginación */}
          {total > 20 && (
            <div className="p-4 border-t border-brand-100 flex items-center justify-between text-xs text-brand-800">
              <span>
                Mostrando página {page} de {Math.ceil(total / 20)} ({total} productos)
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

      {/* Modal Nuevo Producto (RF-P2) */}
      <Modal
        isOpen={modalNuevoAbierto}
        onClose={() => setModalNuevoAbierto(false)}
        title="Nuevo Producto"
        description="Agregá un artículo al catálogo del comercio"
        maxWidth="lg"
      >
        <form onSubmit={handleCrearProducto} className="space-y-4">
          {errorNuevo && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorNuevo}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Código de producto *"
              placeholder="Ej. CAF-003"
              value={nuevoCodigo}
              onChange={(e) => setNuevoCodigo(e.target.value.toUpperCase())}
              required
            />

            <Select
              label="Categoría *"
              value={nuevoCategoriaId}
              onChange={(e) => setNuevoCategoriaId(e.target.value)}
              required
            >
              {categorias.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.nombre}
                </option>
              ))}
            </Select>

            <Input
              label="Descripción *"
              placeholder="Ej. Café en grano Descafeinado 500 g"
              value={nuevoDescripcion}
              onChange={(e) => setNuevoDescripcion(e.target.value)}
              required
              className="sm:col-span-2"
            />

            <Input
              label="Precio de venta en pesos ($) *"
              type="number"
              min="0.01"
              step="0.01"
              placeholder="Ej. 6500.00"
              value={nuevoPrecioPesos}
              onChange={(e) => setNuevoPrecioPesos(e.target.value)}
              required
            />

            <Input
              label="Stock mínimo para reposición"
              type="number"
              min="0"
              step="1"
              value={nuevoStockMinimo}
              onChange={(e) => setNuevoStockMinimo(e.target.value)}
              required
            />

            <div className="sm:col-span-2 p-3 bg-brand-50 border border-brand-200 rounded-lg space-y-2">
              <Input
                label="Stock inicial (unidades a ingresar en inventario)"
                type="number"
                min="0"
                step="1"
                value={nuevoStockInicial}
                onChange={(e) => setNuevoStockInicial(e.target.value)}
                required
              />
              <p className="text-[11px] text-brand-800/70">
                Si el stock inicial es mayor a 0, se grabará un movimiento de ingreso automático con motivo &quot;Stock inicial&quot;.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-brand-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalNuevoAbierto(false)}
              disabled={guardandoNuevo}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardandoNuevo}>
              Guardar Producto
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Movimiento Manual */}
      {productoParaMovimiento && (
        <ModalMovimientoStock
          isOpen={!!productoParaMovimiento}
          onClose={() => setProductoParaMovimiento(null)}
          producto={productoParaMovimiento}
          onMovimientoRegistrado={cargarProductos}
        />
      )}
    </AppLayout>
  );
}
