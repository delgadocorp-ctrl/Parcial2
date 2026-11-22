import { db } from "./index";
import { usuarios, facturas } from "./schema";
import bcrypt from "bcryptjs";
import { sql } from "drizzle-orm";
import { crearCategoria } from "@/services/categorias.service";
import { crearProducto } from "@/services/productos.service";
import { crearCliente } from "@/services/clientes.service";
import { emitirFactura } from "@/services/facturas.service";
import { registrarPago } from "@/services/cuenta.service";
import { SesionUsuario } from "@/lib/auth";
import { ApiError } from "@/lib/errors";

export async function baseVacia(): Promise<boolean> {
  const [res] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usuarios);
  return Number(res?.count || 0) === 0;
}

export async function cargarDatosDePrueba(credencialesDemo?: { admin: string; vendedor: string }) {
  console.log("-> Iniciando carga de datos de prueba...");

  // 1. Usuarios iniciales (RF-U3)
  const adminPassword = credencialesDemo?.admin ?? process.env.SEED_ADMIN_PASSWORD;
  const vendedorPassword = credencialesDemo?.vendedor ?? process.env.SEED_VENDEDOR_PASSWORD;
  const esProduccion = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
  if (esProduccion && (!adminPassword || adminPassword.length < 12 ||
    !vendedorPassword || vendedorPassword.length < 12 ||
    adminPassword === vendedorPassword)) {
    throw new Error("Configurá contraseñas iniciales distintas de al menos 12 caracteres en SEED_ADMIN_PASSWORD y SEED_VENDEDOR_PASSWORD.");
  }

  const [adminHash, vendedorHash] = await Promise.all([
    bcrypt.hash(adminPassword || "Password123!", 10),
    bcrypt.hash(vendedorPassword || "Password123!", 10),
  ]);

  const [adminDb] = await db
    .insert(usuarios)
    .values([
      {
        nombre: "Ana Martínez",
        email: "admin@comercio.test",
        passwordHash: adminHash,
        rol: "admin",
        activo: true,
      },
      {
        nombre: "Lucía Pérez",
        email: "vendedor@comercio.test",
        passwordHash: vendedorHash,
        rol: "vendedor",
        activo: true,
      },
    ])
    .returning();

  const adminSesion: SesionUsuario = {
    id: adminDb.id,
    nombre: adminDb.nombre,
    email: adminDb.email,
    rol: "admin",
  };

  // 2. Categorías (5 categorías)
  const nombresCategorias = [
    "Bebidas e infusiones",
    "Almacén y repostería",
    "Herramientas y ferretería",
    "Dulces y conservas",
    "Bazar y limpieza",
  ];

  const categoriasMap: Record<string, number> = {};
  for (const nombre of nombresCategorias) {
    const cat = await crearCategoria(adminSesion, { nombre });
    categoriasMap[nombre] = cat.id;
  }

  // 3. 30 Productos con stock inicial variado
  const listaProductos = [
    // Bebidas e infusiones
    { codigo: "CAF-001", descripcion: "Café molido tostado 250 g", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 650000, stockMinimo: 8, stockInicial: 35 },
    { codigo: "CAF-002", descripcion: "Café en granos Colombia 500 g", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 1250000, stockMinimo: 5, stockInicial: 20 },
    { codigo: "TE-001", descripcion: "Té negro en hebras 100 g", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 420000, stockMinimo: 6, stockInicial: 28 },
    { codigo: "TE-002", descripcion: "Té verde orgánico 100 g", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 450000, stockMinimo: 5, stockInicial: 18 },
    { codigo: "YER-001", descripcion: "Yerba mate premium 1 kg", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 780000, stockMinimo: 10, stockInicial: 45 },
    { codigo: "YER-002", descripcion: "Yerba mate suave con hierbas 500 g", categoriaId: categoriasMap["Bebidas e infusiones"], precio: 430000, stockMinimo: 8, stockInicial: 30 },

    // Almacén y repostería
    { codigo: "AZU-001", descripcion: "Azúcar mascabo natural 500 g", categoriaId: categoriasMap["Almacén y repostería"], precio: 310000, stockMinimo: 8, stockInicial: 6 }, // Stock bajo
    { codigo: "AZU-002", descripcion: "Azúcar orgánica blanca 1 kg", categoriaId: categoriasMap["Almacén y repostería"], precio: 280000, stockMinimo: 10, stockInicial: 40 },
    { codigo: "HAR-001", descripcion: "Harina de trigo 000 1 kg", categoriaId: categoriasMap["Almacén y repostería"], precio: 180000, stockMinimo: 12, stockInicial: 50 },
    { codigo: "HAR-002", descripcion: "Harina integral fina 1 kg", categoriaId: categoriasMap["Almacén y repostería"], precio: 220000, stockMinimo: 8, stockInicial: 25 },
    { codigo: "ACE-001", descripcion: "Aceite de oliva extra virgen 500 ml", categoriaId: categoriasMap["Almacén y repostería"], precio: 890000, stockMinimo: 6, stockInicial: 22 },
    { codigo: "LEV-001", descripcion: "Levadura seca en polvo 100 g", categoriaId: categoriasMap["Almacén y repostería"], precio: 150000, stockMinimo: 5, stockInicial: 4 }, // Stock bajo

    // Herramientas y ferretería
    { codigo: "HER-001", descripcion: "Martillo carpintero con mango fibra 500 g", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 1450000, stockMinimo: 4, stockInicial: 15 },
    { codigo: "HER-002", descripcion: "Destornillador Phillips 6x150 mm", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 580000, stockMinimo: 5, stockInicial: 24 },
    { codigo: "HER-003", descripcion: "Pinza universal aislada 8 pulgadas", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 1320000, stockMinimo: 4, stockInicial: 14 },
    { codigo: "HER-004", descripcion: "Cinta métrica profesional 5 metros", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 620000, stockMinimo: 6, stockInicial: 3 }, // Stock bajo
    { codigo: "ELE-001", descripcion: "Cinta aisladora de PVC 20 metros", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 190000, stockMinimo: 10, stockInicial: 45 },
    { codigo: "ELE-002", descripcion: "Lámpara LED 12W luz cálida rosca E27", categoriaId: categoriasMap["Herramientas y ferretería"], precio: 320000, stockMinimo: 15, stockInicial: 60 },

    // Dulces y conservas
    { codigo: "MER-001", descripcion: "Mermelada artesanal de frutos rojos 350 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 340000, stockMinimo: 6, stockInicial: 22 },
    { codigo: "MER-002", descripcion: "Mermelada de durazno sin azúcar 350 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 320000, stockMinimo: 6, stockInicial: 20 },
    { codigo: "DUL-001", descripcion: "Dulce de leche colonial pote 400 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 410000, stockMinimo: 8, stockInicial: 35 },
    { codigo: "DUL-002", descripcion: "Dulce de batata artesanal 500 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 260000, stockMinimo: 5, stockInicial: 18 },
    { codigo: "MIE-001", descripcion: "Miel pura de pradera frasco 500 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 480000, stockMinimo: 6, stockInicial: 26 },
    { codigo: "CON-001", descripcion: "Tomate triturado en botella 950 g", categoriaId: categoriasMap["Dulces y conservas"], precio: 210000, stockMinimo: 10, stockInicial: 5 }, // Stock bajo

    // Bazar y limpieza
    { codigo: "LIM-001", descripcion: "Detergente concentrado 750 ml", categoriaId: categoriasMap["Bazar y limpieza"], precio: 270000, stockMinimo: 10, stockInicial: 40 },
    { codigo: "LIM-002", descripcion: "Lavandina común desinfectante 1 litro", categoriaId: categoriasMap["Bazar y limpieza"], precio: 160000, stockMinimo: 10, stockInicial: 38 },
    { codigo: "LIM-003", descripcion: "Paño de microfibra multiuso 40x40 cm", categoriaId: categoriasMap["Bazar y limpieza"], precio: 210000, stockMinimo: 8, stockInicial: 30 },
    { codigo: "BAZ-001", descripcion: "Taza de cerámica artesanal 300 ml", categoriaId: categoriasMap["Bazar y limpieza"], precio: 590000, stockMinimo: 4, stockInicial: 16 },
    { codigo: "BAZ-002", descripcion: "Frasco hermético de vidrio 1 litro", categoriaId: categoriasMap["Bazar y limpieza"], precio: 750000, stockMinimo: 5, stockInicial: 19 },
    { codigo: "BAZ-003", descripcion: "Repasador de algodón panal de abeja", categoriaId: categoriasMap["Bazar y limpieza"], precio: 380000, stockMinimo: 6, stockInicial: 22 },
  ];

  const productosCreados = [];
  for (const prod of listaProductos) {
    const p = await crearProducto(adminSesion, prod);
    productosCreados.push(p);
  }

  // 4. 10 Clientes registrados con datos reales de contacto
  const listaClientes = [
    { tipoDoc: "DNI" as const, nroDoc: "28456123", nombre: "Mariana López", domicilio: "Las Heras 455", telefono: "381 455-2210", email: "mariana.lopez@correo.test", cuentaCorriente: true, limiteCredito: 40000000 },
    { tipoDoc: "CUIT" as const, nroDoc: "30-71234567-8", nombre: "Almacén Los Aromos", domicilio: "San Martín 1240", telefono: "381 555-0123", email: "contacto@losaromos.test", cuentaCorriente: true, limiteCredito: 60000000 },
    { tipoDoc: "DNI" as const, nroDoc: "32123456", nombre: "Javier Medina", domicilio: "Av. Aconquija 1820", telefono: "381 422-9090", email: "javier.medina@correo.test", cuentaCorriente: true, limiteCredito: 30000000 },
    { tipoDoc: "DNI" as const, nroDoc: "35987654", nombre: "Valeria Benítez", domicilio: "Crisóstomo Álvarez 630", telefono: "381 430-1122", email: "valeria.b@correo.test", cuentaCorriente: true, limiteCredito: 25000000 },
    { tipoDoc: "CUIT" as const, nroDoc: "30-68994512-3", nombre: "Café & Bistró Tucumán", domicilio: "Laprida 280", telefono: "381 421-4455", email: "compras@cafebistro.test", cuentaCorriente: true, limiteCredito: 80000000 },
    { tipoDoc: "DNI" as const, nroDoc: "40112334", nombre: "Gonzalo Ruiz", domicilio: "25 de Mayo 740", telefono: "381 498-7733", email: "gonzalo.ruiz@correo.test", cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "27889412", nombre: "Silvia Fernández", domicilio: "Salta 412", telefono: "381 451-2299", email: "silvia.f@correo.test", cuentaCorriente: true, limiteCredito: 20000000 },
    { tipoDoc: "CUIT" as const, nroDoc: "33-70891234-9", nombre: "Panadería y Confitería Central", domicilio: "Muñecas 350", telefono: "381 424-6677", email: "panaderiacentral@correo.test", cuentaCorriente: true, limiteCredito: 50000000 },
    { tipoDoc: "DNI" as const, nroDoc: "38445678", nombre: "Martín Navarro", domicilio: "Congreso 180", telefono: "381 411-8800", email: "martin.navarro@correo.test", cuentaCorriente: false, limiteCredito: null },
    { tipoDoc: "DNI" as const, nroDoc: "33221998", nombre: "Camila Suárez", domicilio: "Chacabuco 520", telefono: "381 465-3311", email: "camila.suarez@correo.test", cuentaCorriente: true, limiteCredito: 35000000 },
  ];

  const clientesCreados = [];
  for (const cli of listaClientes) {
    const c = await crearCliente(adminSesion, cli);
    clientesCreados.push(c);
  }

  // 5. 50 Facturas repartidas en los últimos 30 días con los servicios oficiales (RF-T1, RF-T2, RF-T3)
  console.log("-> Generando 50 facturas distribuidas en 30 días...");

  const ahora = new Date();

  for (let i = 1; i <= 50; i++) {
    // Distribuir en los últimos 28 días
    const diasAtras = Math.floor((50 - i) * 28 / 50);
    const fechaFactura = new Date(ahora);
    fechaFactura.setDate(fechaFactura.getDate() - diasAtras);
    fechaFactura.setHours(9 + (i % 10), (i * 13) % 60, 0, 0);

    // Selección de productos (1 a 3 ítems)
    const cantItems = 1 + (i % 3);
    const items: Array<{ productoId: number; cantidad: number }> = [];
    const prodIndices = [(i * 2) % productosCreados.length, (i * 3 + 1) % productosCreados.length, (i * 5 + 2) % productosCreados.length];

    for (let k = 0; k < cantItems; k++) {
      const prod = productosCreados[prodIndices[k]];
      if (prod && !items.some(it => it.productoId === prod.id)) {
        items.push({
          productoId: prod.id,
          cantidad: 1 + ((i + k) % 3),
        });
      }
    }

    // Forma de pago: rotar contado, tarjeta y cuenta corriente
    let clienteId: number | null = null;
    let pagoData: { forma: "contado" | "tarjeta" | "cuenta_corriente" } = { forma: "contado" };

    if (i % 3 === 0) {
      // Cuenta corriente (clientes con cuenta habilitada)
      const clientesCtaCte = clientesCreados.filter(c => c.cuentaCorriente);
      const cli = clientesCtaCte[i % clientesCtaCte.length];
      clienteId = cli.id;
      pagoData = { forma: "cuenta_corriente" };
    } else if (i % 3 === 1) {
      // Tarjeta
      clienteId = i % 2 === 0 ? clientesCreados[i % clientesCreados.length].id : null;
      pagoData = { forma: "tarjeta" };
    } else {
      // Contado
      clienteId = i % 4 === 0 ? clientesCreados[i % clientesCreados.length].id : null;
      pagoData = { forma: "contado" };
    }

    try {
      const fact = await emitirFactura(adminSesion, {
        clienteId,
        items,
        pago: pagoData,
      });

      // Actualizamos la fecha retroactiva en la base de datos para la simulación histórica de 30 días
      const fechaIso = fechaFactura.toISOString();
      await db
        .update(facturas)
        .set({ fecha: fechaIso })
        .where(sql`${facturas.id} = ${fact.id}`);
    } catch (error) {
      if (
        error instanceof ApiError &&
        (error.code === "STOCK_INSUFICIENTE" || error.code === "LIMITE_CREDITO_EXCEDIDO")
      ) {
        console.warn(`-> Se omite la factura de prueba ${i}: ${error.message}`);
        continue;
      }

      throw error;
    }
  }

  // 6. Algunos pagos en cuenta corriente para clientes con saldo
  const clientesConCta = clientesCreados.filter(c => c.cuentaCorriente);
  if (clientesConCta.length > 0) {
    try {
      await registrarPago(adminSesion, clientesConCta[0].id, {
        importe: 500000,
        medio: "transferencia",
        observacion: "Pago parcial a cuenta",
      });
    } catch (error) {
      if (!(error instanceof ApiError) || error.code !== "PAGO_SUPERA_DEUDA") {
        throw error;
      }
      console.warn(`-> Se omite un pago de prueba: ${error.message}`);
    }

    if (clientesConCta.length > 1) {
      try {
        await registrarPago(adminSesion, clientesConCta[1].id, {
          importe: 1000000,
          medio: "efectivo",
          observacion: "Cancelación anticipada",
        });
      } catch (error) {
        if (!(error instanceof ApiError) || error.code !== "PAGO_SUPERA_DEUDA") {
          throw error;
        }
        console.warn(`-> Se omite un pago de prueba: ${error.message}`);
      }
    }
  }

  console.log("✓ Carga de datos de prueba completada con éxito.");
}
