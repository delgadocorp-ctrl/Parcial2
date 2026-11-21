"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";

interface ModalNuevoClienteProps {
  isOpen: boolean;
  cliente?: Awaited<ReturnType<typeof import("@/services/clientes.service").listarClientes>>["data"][number];
  onClose: () => void;
  onClienteCreado: (cliente: Awaited<ReturnType<typeof import("@/services/clientes.service").crearCliente>>) => void;
}

export function ModalNuevoCliente({ isOpen, onClose, onClienteCreado, cliente }: ModalNuevoClienteProps) {
  const [tipoDoc, setTipoDoc] = useState<"DNI" | "CUIT">(cliente?.tipoDoc ?? "DNI");
  const [nroDoc, setNroDoc] = useState(cliente?.nroDoc ?? "");
  const [nombre, setNombre] = useState(cliente?.nombre ?? "");
  const [domicilio, setDomicilio] = useState(cliente?.domicilio ?? "");
  const [telefono, setTelefono] = useState(cliente?.telefono ?? "");
  const [email, setEmail] = useState(cliente?.email ?? "");
  const [cuentaCorriente, setCuentaCorriente] = useState(cliente?.cuentaCorriente ?? true);
  const [limiteCredito, setLimiteCredito] = useState(cliente?.limiteCredito == null ? "" : (cliente.limiteCredito / 100).toFixed(2));
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!telefono && !email) {
      setError("Debe ingresar al menos un teléfono o correo electrónico.");
      return;
    }

    setIsLoading(true);

    try {
      const payload = {
        tipoDoc,
        nroDoc: nroDoc.trim(),
        nombre: nombre.trim(),
        domicilio: domicilio.trim() || null,
        telefono: telefono.trim() || null,
        email: email.trim() || null,
        cuentaCorriente,
        limiteCredito: limiteCredito ? Math.round(Number(limiteCredito) * 100) : null,
      };

      const res = await fetch(cliente ? `/api/clientes/${cliente.id}` : "/api/clientes", {
        method: cliente ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error?.message || "Error al guardar cliente");
      }

      onClienteCreado(data);
      onClose();
      // Reset form
      setNroDoc("");
      setNombre("");
      setDomicilio("");
      setTelefono("");
      setEmail("");
      setCuentaCorriente(true);
      setLimiteCredito("");
    } catch (err: unknown) {
      setError((err instanceof Error ? err.message : "Ocurrió un error inesperado."));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={cliente ? "Editar cliente" : "Nuevo cliente"}
      description="Registrá los datos para futuras ventas y cuenta corriente"
      maxWidth="lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Nombre y Apellido / Razón Social *"
            placeholder="Ej. María González"
            value={nombre}
            onChange={(e) => setNombre(e.target.value)}
            required
            className="sm:col-span-2"
          />

          <Select
            label="Tipo de Documento *"
            value={tipoDoc}
            onChange={(e) => setTipoDoc(e.target.value as "DNI" | "CUIT")}
          >
            <option value="DNI">DNI</option>
            <option value="CUIT">CUIT</option>
          </Select>

          <Input
            label="Número de Documento *"
            placeholder="Ej. 28456123 o 30-71234567-8"
            value={nroDoc}
            onChange={(e) => setNroDoc(e.target.value)}
            required
          />

          <Input
            label="Teléfono"
            placeholder="Ej. 381 455-2210"
            value={telefono}
            onChange={(e) => setTelefono(e.target.value)}
          />

          <Input
            label="Correo Electrónico"
            type="email"
            placeholder="cliente@ejemplo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Domicilio"
            placeholder="Ej. San Martín 123"
            value={domicilio}
            onChange={(e) => setDomicilio(e.target.value)}
            className="sm:col-span-2"
          />

          <div className="sm:col-span-2 pt-2 border-t border-brand-100">
            <label className="flex items-center gap-2 cursor-pointer text-sm font-semibold text-brand-900">
              <input
                type="checkbox"
                checked={cuentaCorriente}
                onChange={(e) => setCuentaCorriente(e.target.checked)}
                className="w-4 h-4 rounded text-brand-800 focus:ring-brand-600"
              />
              Habilitar Cuenta Corriente
            </label>
            <p className="text-xs text-brand-800/60 ml-6 mt-0.5">
              Permite realizar ventas a crédito y registrar pagos a cuenta.
            </p>
          </div>

          {cuentaCorriente && (
            <Input
              label="Límite de Crédito ($ opcional)"
              type="number"
              min="0"
              step="0.01"
              placeholder="Ej. 500000.00 (dejar vacío si no tiene límite)"
              value={limiteCredito}
              onChange={(e) => setLimiteCredito(e.target.value)}
              className="sm:col-span-2"
            />
          )}
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-brand-100">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="submit" isLoading={isLoading}>
            Guardar Cliente
          </Button>
        </div>
      </form>
    </Modal>
  );
}
