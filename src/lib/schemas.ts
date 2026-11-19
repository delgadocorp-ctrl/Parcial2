import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().trim().email("El correo electrónico no es válido"),
  password: z.string().min(1, "La contraseña es requerida"),
});

export const cambiarPasswordSchema = z.object({
  actual: z.string().min(1, "La contraseña actual es requerida"),
  nueva: z.string().min(8, "La nueva contraseña debe tener al menos 8 caracteres"),
});

export const usuarioCrearSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres"),
  email: z.string().trim().toLowerCase().email("El correo no es válido"),
  rol: z.enum(["admin", "vendedor"], {
    errorMap: () => ({ message: "El rol debe ser admin o vendedor" }),
  }),
  password: z.string().min(6, "La contraseña temporal debe tener al menos 6 caracteres"),
});

export const usuarioEditarSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre debe tener al menos 2 caracteres").optional(),
  email: z.string().trim().toLowerCase().email("El correo no es válido").optional(),
  rol: z.enum(["admin", "vendedor"]).optional(),
  activo: z.boolean().optional(),
});

export const categoriaCrearSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre de categoría es requerido"),
});

export const categoriaEditarSchema = z.object({
  nombre: z.string().trim().min(2).optional(),
  activa: z.boolean().optional(),
});

export const productoCrearSchema = z
  .object({
    codigo: z.string().trim().min(1, "El código es requerido").toUpperCase(),
    descripcion: z.string().trim().min(2, "La descripción es requerida"),
    categoriaId: z.number().int().positive("La categoría es requerida"),
    precio: z.number().int().safe().positive("El precio debe ser un número positivo en centavos"),
    stockMinimo: z.number().int().safe().min(0, "El stock mínimo no puede ser negativo").default(0),
    stockInicial: z.number().int().safe().min(0, "El stock inicial no puede ser negativo").optional(),
    existencia: z.never().optional(), // No se acepta en el body
  })
  .strict();

export const productoEditarSchema = z
  .object({
    codigo: z.string().trim().min(1).toUpperCase().optional(),
    descripcion: z.string().trim().min(2).optional(),
    categoriaId: z.number().int().positive().optional(),
    precio: z.number().int().safe().positive().optional(),
    stockMinimo: z.number().int().safe().min(0).optional(),
    activo: z.boolean().optional(),
    existencia: z.never().optional(), // Prohibido modificar existencia directamente
  })
  .strict();

export const movimientoStockManualSchema = z.object({
  tipo: z.enum(["ingreso", "egreso"], {
    errorMap: () => ({ message: "El tipo debe ser ingreso o egreso" }),
  }),
  cantidad: z.number().int().safe().positive("La cantidad debe ser mayor que cero"),
  motivo: z.string().trim().min(2, "El motivo es requerido"),
  observacion: z.string().trim().optional(),
});

export const clienteCrearSchema = z
  .object({
    tipoDoc: z.enum(["DNI", "CUIT"]).default("DNI"),
    nroDoc: z.string().trim().min(5, "El número de documento es requerido"),
    nombre: z.string().trim().min(2, "El nombre es requerido"),
    domicilio: z.string().trim().optional().nullable(),
    telefono: z.string().trim().optional().nullable(),
    email: z.string().trim().email("El correo no es válido").optional().nullable().or(z.literal("")),
    cuentaCorriente: z.boolean().default(false),
    limiteCredito: z.number().int().safe().min(0).optional().nullable(),
  })
  .refine(
    (data) => (data.telefono && data.telefono.length > 0) || (data.email && data.email.length > 0),
    {
      message: "Debe ingresar al menos un dato de contacto (teléfono o correo)",
      path: ["telefono"],
    }
  );

export const clienteEditarSchema = z.object({
  tipoDoc: z.enum(["DNI", "CUIT"]).optional(),
  nroDoc: z.string().trim().min(5).optional(),
  nombre: z.string().trim().min(2).optional(),
  domicilio: z.string().trim().optional().nullable(),
  telefono: z.string().trim().optional().nullable(),
  email: z.string().trim().email("El correo no es válido").optional().nullable().or(z.literal("")),
  cuentaCorriente: z.boolean().optional(),
  limiteCredito: z.number().int().safe().min(0).optional().nullable(),
  activo: z.boolean().optional(),
});

export const pagoCrearSchema = z.object({
  importe: z.number().int().safe().positive("El importe debe ser mayor que cero"),
  medio: z.enum(["efectivo", "transferencia", "tarjeta_debito"], {
    errorMap: () => ({ message: "El medio debe ser efectivo, transferencia o tarjeta_debito" }),
  }),
  observacion: z.string().trim().optional().nullable(),
});

const itemFacturaSchema = z.object({
  productoId: z.number().int().positive("ID de producto inválido"),
  cantidad: z.number().int().safe().positive("La cantidad debe ser al menos 1"),
});

const tarjetaSchema = z
  .object({
    tipo: z.enum(["debito", "credito"]),
    marca: z.string().trim().min(1, "La marca de tarjeta es requerida"),
    ultimos4: z.string().regex(/^\d{4}$/, "Debe ingresar exactamente los últimos 4 dígitos"),
  })
  .strict();

export const facturaCrearSchema = z
  .object({
    clienteId: z.number().int().positive().nullable().optional(),
    items: z
      .array(itemFacturaSchema)
      .min(1, "Debe agregar al menos un producto a la venta")
      .refine(
        (items) => {
          const ids = items.map((i) => i.productoId);
          return new Set(ids).size === ids.length;
        },
        { message: "No puede haber productos repetidos en el detalle" }
      ),
    pago: z
      .object({
        forma: z.enum(["contado", "tarjeta", "cuenta_corriente"]),
        montoRecibido: z.number().int().safe().positive().optional().nullable(),
        tarjeta: tarjetaSchema.optional().nullable(),
      })
      .strict(),
  })
  .refine(
    (data) => {
      if (data.pago.forma === "tarjeta") {
        return !!data.pago.tarjeta;
      }
      return true;
    },
    { message: "Faltan los datos de la tarjeta", path: ["pago", "tarjeta"] }
  );

export const anulacionFacturaSchema = z.object({
  motivo: z.string().trim().min(3, "El motivo de anulación es obligatorio"),
});
