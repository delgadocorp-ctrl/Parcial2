"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Modal } from "@/components/ui/Modal";

import { UserCog, UserPlus, KeyRound, Edit2 } from "lucide-react";

export default function UsuariosPage() {
  const router = useRouter();
  const [usuarioActual, setUsuarioActual] = useState<import("@/lib/auth").SesionUsuario | null>(null);
  const [usuarios, setUsuarios] = useState<Awaited<ReturnType<typeof import("@/services/usuarios.service").listarUsuarios>>["data"]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Modal Crear Usuario
  const [modalCrearAbierto, setModalCrearAbierto] = useState(false);
  const [nombreNuevo, setNombreNuevo] = useState("");
  const [emailNuevo, setEmailNuevo] = useState("");
  const [rolNuevo, setRolNuevo] = useState<"vendedor" | "admin">("vendedor");
  const [passwordNuevo, setPasswordNuevo] = useState("");
  const [guardandoCrear, setGuardandoCrear] = useState(false);
  const [errorCrear, setErrorCrear] = useState<string | null>(null);

  // Modal Editar Usuario
  const [usuarioAEditar, setUsuarioAEditar] = useState<Awaited<ReturnType<typeof import("@/services/usuarios.service").listarUsuarios>>["data"][number] | null>(null);
  const [nombreEditar, setNombreEditar] = useState("");
  const [emailEditar, setEmailEditar] = useState("");
  const [rolEditar, setRolEditar] = useState<"vendedor" | "admin">("vendedor");
  const [activoEditar, setActivoEditar] = useState(true);
  const [guardandoEditar, setGuardandoEditar] = useState(false);
  const [errorEditar, setErrorEditar] = useState<string | null>(null);

  // Modal Reset Password
  const [resetModalAbierto, setResetModalAbierto] = useState(false);
  const [usuarioReset, setUsuarioReset] = useState<Awaited<ReturnType<typeof import("@/services/usuarios.service").listarUsuarios>>["data"][number] | null>(null);
  const [passwordTemporalGenerada, setPasswordTemporalGenerada] = useState<string | null>(null);
  const [guardandoReset, setGuardandoReset] = useState(false);

  const cargarUsuarios = useCallback(async () => {
    setIsLoading(true);
    try {
      const [meRes, usrRes] = await Promise.all([
        fetch("/api/auth/me"),
        fetch("/api/usuarios?pageSize=50"),
      ]);

      if (!meRes.ok) {
        router.push("/login");
        return;
      }

      const me = await meRes.json();
      setUsuarioActual(me);

      if (me.rol !== "admin") {
        router.push("/");
        return;
      }

      if (usrRes.ok) {
        const data = await usrRes.json();
        setUsuarios(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    cargarUsuarios();
  }, [cargarUsuarios]);

  const handleCrear = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorCrear(null);
    setGuardandoCrear(true);

    try {
      const res = await fetch("/api/usuarios", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreNuevo.trim(),
          email: emailNuevo.trim().toLowerCase(),
          rol: rolNuevo,
          password: passwordNuevo,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al crear usuario.");
      }

      setModalCrearAbierto(false);
      setNombreNuevo("");
      setEmailNuevo("");
      setPasswordNuevo("");
      cargarUsuarios();
    } catch (err: unknown) {
      setErrorCrear((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoCrear(false);
    }
  };

  const handleEditar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!usuarioAEditar) return;
    setErrorEditar(null);
    setGuardandoEditar(true);

    try {
      const res = await fetch(`/api/usuarios/${usuarioAEditar.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nombre: nombreEditar.trim(),
          email: emailEditar.trim().toLowerCase(),
          rol: rolEditar,
          activo: activoEditar,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al modificar usuario.");
      }

      setUsuarioAEditar(null);
      cargarUsuarios();
    } catch (err: unknown) {
      setErrorEditar((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoEditar(false);
    }
  };

  const handleResetPassword = async () => {
    if (!usuarioReset) return;
    setGuardandoReset(true);

    try {
      const res = await fetch(`/api/usuarios/${usuarioReset.id}/reset-password`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al restablecer contraseña.");
      }

      setPasswordTemporalGenerada(data.passwordTemporal);
    } catch (err: unknown) {
      alert((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setGuardandoReset(false);
    }
  };

  if (!usuarioActual || usuarioActual.rol !== "admin") return null;

  return (
    <AppLayout usuario={usuarioActual}>
      <div className="space-y-6 max-w-5xl mx-auto">
        {/* Encabezado */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div>
            <div className="text-xs font-bold text-brand-800/60 uppercase tracking-widest">
              Configuración / Accesos
            </div>
            <h1 className="text-2xl sm:text-3xl font-serif text-brand-950 font-normal">
              Administración de usuarios
            </h1>
            <p className="text-xs sm:text-sm text-brand-800/70 mt-0.5">
              Gestión de cuentas del personal, roles de operador y restablecimiento de claves.
            </p>
          </div>

          <Button
            onClick={() => setModalCrearAbierto(true)}
            className="text-xs font-bold bg-[#254d3c] hover:bg-[#34634d]"
          >
            <UserPlus className="w-4 h-4 mr-1.5" />
            Nuevo usuario
          </Button>
        </div>

        {/* Tabla de Usuarios */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserCog className="w-4 h-4 text-brand-800" />
              Equipo y permisos de acceso
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-brand-50/70 border-b border-brand-200 text-brand-800 uppercase tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4 font-bold">Nombre</th>
                    <th className="py-3 px-4 font-bold">Correo de Acceso</th>
                    <th className="py-3 px-4 font-bold">Rol</th>
                    <th className="py-3 px-4 font-bold">Estado</th>
                    <th className="py-3 px-4 font-bold text-center">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-brand-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-gray-400">
                        Cargando usuarios...
                      </td>
                    </tr>
                  ) : (
                    usuarios.map((u) => (
                      <tr key={u.id} className="hover:bg-brand-50/40">
                        <td className="py-3 px-4 font-semibold text-brand-950 text-sm">
                          {u.nombre}
                          {u.id === usuarioActual.id && (
                            <span className="ml-2 text-[10px] text-brand-800 bg-brand-100 px-1.5 py-0.5 rounded font-normal">
                              Tú
                            </span>
                          )}
                        </td>

                        <td className="py-3 px-4 font-mono text-brand-800/80">
                          {u.email}
                        </td>

                        <td className="py-3 px-4">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                              u.rol === "admin"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-teal-100 text-teal-800"
                            }`}
                          >
                            {u.rol === "admin" ? "Administrador" : "Vendedor"}
                          </span>
                        </td>

                        <td className="py-3 px-4">
                          <Badge variant={u.activo ? "success" : "neutral"}>
                            {u.activo ? "Activo" : "Desactivado"}
                          </Badge>
                        </td>

                        <td className="py-3 px-4 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setUsuarioAEditar(u);
                                setNombreEditar(u.nombre);
                                setEmailEditar(u.email);
                                setRolEditar(u.rol);
                                setActivoEditar(u.activo);
                              }}
                              className="text-xs"
                            >
                              <Edit2 className="w-3.5 h-3.5 mr-1" />
                              Editar
                            </Button>

                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setUsuarioReset(u);
                                setPasswordTemporalGenerada(null);
                                setResetModalAbierto(true);
                              }}
                              className="text-xs"
                            >
                              <KeyRound className="w-3.5 h-3.5 mr-1" />
                              Clave
                            </Button>
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

      {/* Modal Crear Usuario */}
      <Modal
        isOpen={modalCrearAbierto}
        onClose={() => setModalCrearAbierto(false)}
        title="Nuevo Usuario"
        description="Creá un acceso para operar el mostrador"
      >
        <form onSubmit={handleCrear} className="space-y-4">
          {errorCrear && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {errorCrear}
            </div>
          )}

          <Input
            label="Nombre y Apellido *"
            placeholder="Ej. Juan Pérez"
            value={nombreNuevo}
            onChange={(e) => setNombreNuevo(e.target.value)}
            required
          />

          <Input
            label="Correo Electrónico de Acceso *"
            type="email"
            placeholder="juan@comercio.test"
            value={emailNuevo}
            onChange={(e) => setEmailNuevo(e.target.value)}
            required
          />

          <Select
            label="Perfil de Permisos *"
            value={rolNuevo}
            onChange={(e) => setRolNuevo(e.target.value as "vendedor" | "admin")}
          >
            <option value="vendedor">Vendedor (Opera ventas, productos y clientes)</option>
            <option value="admin">Administrador (Permiso total del sistema)</option>
          </Select>

          <Input
            label="Contraseña inicial *"
            type="password"
            placeholder="Mínimo 6 caracteres"
            value={passwordNuevo}
            onChange={(e) => setPasswordNuevo(e.target.value)}
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
              Crear Usuario
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal Editar Usuario */}
      {usuarioAEditar && (
        <Modal
          isOpen={!!usuarioAEditar}
          onClose={() => setUsuarioAEditar(null)}
          title="Editar Usuario"
          description={`Modificando a ${usuarioAEditar.nombre}`}
        >
          <form onSubmit={handleEditar} className="space-y-4">
            {errorEditar && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                {errorEditar}
              </div>
            )}

            <Input
              label="Nombre y Apellido *"
              value={nombreEditar}
              onChange={(e) => setNombreEditar(e.target.value)}
              required
            />

            <Input
              label="Correo de Acceso *"
              type="email"
              value={emailEditar}
              onChange={(e) => setEmailEditar(e.target.value)}
              required
            />

            <Select
              label="Rol *"
              value={rolEditar}
              onChange={(e) => setRolEditar(e.target.value as "vendedor" | "admin")}
              disabled={usuarioAEditar.id === usuarioActual.id}
            >
              <option value="vendedor">Vendedor</option>
              <option value="admin">Administrador</option>
            </Select>

            <div className="pt-2">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-brand-900">
                <input
                  type="checkbox"
                  checked={activoEditar}
                  disabled={usuarioAEditar.id === usuarioActual.id}
                  onChange={(e) => setActivoEditar(e.target.checked)}
                  className="w-4 h-4 rounded text-brand-800 focus:ring-brand-600"
                />
                Usuario activo (habilitado para iniciar sesión)
              </label>
              {usuarioAEditar.id === usuarioActual.id && (
                <p className="text-[11px] text-gray-400 mt-1">
                  Por seguridad, no puedes desactivar tu propia cuenta de administrador.
                </p>
              )}
            </div>

            <div className="flex justify-end gap-3 pt-3 border-t border-brand-100">
              <Button
                type="button"
                variant="outline"
                onClick={() => setUsuarioAEditar(null)}
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

      {/* Modal Reset Password */}
      {resetModalAbierto && (
        <Modal
          isOpen={resetModalAbierto}
          onClose={() => {
            setResetModalAbierto(false);
            setUsuarioReset(null);
            setPasswordTemporalGenerada(null);
          }}
          title="Restablecer Contraseña"
          description={`Generar clave temporal para ${usuarioReset?.nombre}`}
        >
          <div className="space-y-4">
            {!passwordTemporalGenerada ? (
              <>
                <p className="text-xs text-brand-800 leading-relaxed">
                  ¿Deseas generar una nueva contraseña temporal para el usuario? La clave actual
                  será reemplazada de inmediato y se mostrará en pantalla una única vez.
                </p>

                <div className="flex justify-end gap-3 pt-3 border-t border-brand-100">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setResetModalAbierto(false)}
                    disabled={guardandoReset}
                  >
                    Cancelar
                  </Button>
                  <Button type="button" onClick={handleResetPassword} isLoading={guardandoReset}>
                    Generar Clave Temporal
                  </Button>
                </div>
              </>
            ) : (
              <div className="space-y-4 text-center py-2">
                <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                  <span className="text-xs font-semibold text-emerald-950 block">
                    Nueva contraseña temporal generada:
                  </span>
                  <div className="text-xl font-mono font-bold text-emerald-900 bg-white p-2.5 rounded-lg border border-emerald-300 select-all">
                    {passwordTemporalGenerada}
                  </div>
                  <p className="text-[11px] text-emerald-800/80">
                    Copia y entrega esta clave al usuario para que ingrese y cambie su contraseña desde su perfil.
                  </p>
                </div>

                <Button
                  type="button"
                  onClick={() => {
                    setResetModalAbierto(false);
                    setUsuarioReset(null);
                    setPasswordTemporalGenerada(null);
                  }}
                  className="w-full text-xs font-bold"
                >
                  Entendido, cerrar
                </Button>
              </div>
            )}
          </div>
        </Modal>
      )}
    </AppLayout>
  );
}
