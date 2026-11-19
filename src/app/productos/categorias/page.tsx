"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";
import { ArrowLeft, Plus, Edit2, Tags } from "lucide-react";

export default function CategoriasPage() {
  const router = useRouter();
  const [usuario, setUsuario] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [categorias, setCategorias] = useState<Awaited<ReturnType<typeof import("@/services/categorias.service").listarCategorias>>>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Crear
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nombreNueva, setNombreNueva] = useState("");
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Modal Editar
  const [categoriaAEditar, setCategoriaAEditar] = useState<Awaited<ReturnType<typeof import("@/services/categorias.service").listarCategorias>>[number] | null>(null);
  const [nombreEditar, setNombreEditar] = useState("");
  const [activaEditar, setActivaEditar] = useState(true);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  const cargarCategorias = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, catRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/categorias?todas=true"),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }
      setUsuario(await meRes.json());
      if (catRes.ok) {
        setCategorias(await catRes.json());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    cargarCategorias();
  }, [cargarCategorias]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear(null);
    setGuardandoCrear(true);

    try {
      const res = await fetch("/api/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nombre: nombreNueva.trim() }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear categoría.");
      }

      setModalCrearAbierto(false);
      setNombreNueva("");
      cargarCategorias();
    } catch (err: unknown) {
      setErrorCrear((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoCrear(false);
    }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoriaAEditar) return;
    setErrorEditar(null);
    setGuardandoEditar(true);

    try {
      const res = await fetch(`/api/categorias/${categoriaAEditar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreEditar.trim(),
          activa: activaEditar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al modificar categoría.");
      }

      setCategoriaAEditar(null);
      cargarCategorias();
    } catch (err: unknown) {
      setErrorEditar((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoEditar(false);
    }
  };

  if (!usuario) return null;

  return (
    <AppLayout usuario={usuario}>
      <div className="space-y-6 max-w-4xl mx-auto">
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
                Catálogo / Clasificación
              </div>
              <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
                Categorías de productos
              </h1>
              <p className="text-xs text-brand-800/70 mt-0.5">
                Organización de artículos en grupos comerciales.
              </p>
            </div>
          </div>

          {usuario.rol === "admin" && (
            <Button
              onClick={() => setModalCrearAbierto(true)}
              className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
            >
              <Plus className="w-4 h-4 mr-1.5" />
              Nueva categoría
            </Button>
          )}
        </div>

        {/* Listado */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Tags className="w-4 h-4 text-brand-800" />
              Categorías registradas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3 font-bold">Nombre de la categoría</th>
                    <th className="py-2.5 px-3 font-bold">Estado</th>
                    <th className="py-2.5 px-3 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">
                        Cargando categorías...
                      </td>
                    </tr>
                  ) : categorias.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-gray-400">
                        No hay categorías registradas.
                      </td>
                    </tr>
                  ) : (
                    categorias.map((c) => (
                      <tr key={c.id} className="hover:bg-brand-50/40">
                        <td className="py-3 px-3 font-semibold text-brand-950 text-sm">
                          {c.nombre}
                        </td>
                        <td className="py-3 px-3">
                          <Badge variant={c.activa ? "success" : "neutral"}>
                            {c.activa ? "Activa" : "Inactiva"}
                          </Badge>
                        </td>
                        <td className="py-3 px-3 text-center">
                          {usuario.rol === "admin" && (
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setCategoriaAEditar(c);
                                setNombreEditar(c.nombre);
                                setActivaEditar(c.activa);
                              }}
                              className="text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>
                          )}
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

      {/* Modal Crear Categoría */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="Nueva Categoría"
        description="Ingresá el nombre de la nueva categoría comercial"
      >
        <form onSubmit={handleCrear} className="space-y-4">
          {errorCrear && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorCrear}
            </div>
          )}

          <Input
            label="Nombre de la categoría *"
            placeholder="Ej. Limpieza del hogar"
            value={nombreNueva}
            onChange={(e) => setNombreNueva(e.target.value)}
            required
          />

          <div className="flex justify-end gap-3 pt-3 border-t border-brand-100">
            <Button
              type="button"
              variant="outline"
              onClick={() => setModalCrearAbierto(false)}
              disabled={guardandoCrear}
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={guardandoCrear}>
              Crear Categoría
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Categoría */}
      {categoriaAEditar && (
        <Modal
          isOpen={!!categoriaAEditar}
          onClose={() => setCategoriaAEditar(null)}
          title="Editar Categoría"
          description={`Modificando "${categoriaAEditar.nombre}"`}
        >
          <form onSubmit={handleEditar} className="space-y-4">
            {errorEditar && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {errorEditar}
              </div>
            )}

            <Input
              label="Nombre *"
              value={nombreEditar}
              onChange={(e) => setNombreEditar(e.target.value)}
              required
            />

            <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-900 pt-2">
              <input
                type="checkbox"
                checked={activaEditar}
                onChange={(e) => setActivaEditar(e.target.checked)}
                className="w-4 h-4 rounded text-brand-800 focus:ring-brand-600"
              />
              Categoría activa para nuevos productos
            </label>

            <div className="flex justify-end gap-3 pt-3 border-t border-brand-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setCategoriaAEditar(null)}
                disabled={guardandoEditar}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={guardandoEditar}>
                Guardar Cambios
              </Button>
            </div>
          </form>
        </Modal>
      )}
    </AppLayout>
  );
}
