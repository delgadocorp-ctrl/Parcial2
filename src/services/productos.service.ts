import { db } from "@/db";
import { productos, categorias } from "@/db/schema";
import { eq, and, or, sql, not, lte } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { productoCrearSchema, productoEditarSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";
import { moverStock } from "./stock.service";

/**
 * RF-P1: Catálogo de productos con filtros, búsqueda y paginación
 */
export async function listarProductos(
  filtros: {
    q?: string;
    categoriaId?: number;
    bajoMinimo?: boolean | string;
    activo?: boolean | string;
    page?: number;
    pageSize?: number;
  },
  usuario?: SesionUsuario
) {
  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  // Filtro de activo: por defecto solo activos, salvo que el admin pida "todos" o false
  if (filtros.activo === "todos" && usuario?.rol === "admin") {
    // No filtramos por activo
  } else if (filtros.activo !== undefined && filtros.activo !== "todos") {
    const esActivo = String(filtros.activo) === "true";
    conditions.push(eq(productos.activo, esActivo));
  } else {
    conditions.push(eq(productos.activo, true));
  }

  // Búsqueda por código o descripción
  if (filtros.q && filtros.q.trim().length > 0) {
    const termino = `%${filtros.q.trim().toLowerCase()}%`;
    conditions.push(
      or(
        sql`lower(${productos.codigo}) LIKE ${termino}`,
        sql`lower(${productos.descripcion}) LIKE ${termino}`
      )
    );
  }

  // Filtro por categoría
  if (filtros.categoriaId) {
    conditions.push(eq(productos.categoriaId, Number(filtros.categoriaId)));
  }

  // Filtro por productos bajo mínimo
  const esBajoMinimo = String(filtros.bajoMinimo) === "true";
  if (esBajoMinimo) {
    conditions.push(lte(productos.existencia, productos.stockMinimo));
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(productos)
    .where(whereClause);

  const total = Number(totalRes?.count || 0);

  const filas = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      categoriaId: categorias.id,
      categoriaNombre: categorias.nombre,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(whereClause)
    .orderBy(productos.codigo)
    .limit(pageSize)
    .offset(offset);

  const data = filas.map((p) => ({
    id: p.id,
    codigo: p.codigo,
    descripcion: p.descripcion,
    categoria: {
      id: p.categoriaId,
      nombre: p.categoriaNombre,
    },
    precio: p.precio,
    existencia: p.existencia,
    stockMinimo: p.stockMinimo,
    bajoMinimo: p.existencia <= p.stockMinimo,
    activo: p.activo,
  }));

  return {
    data,
    page,
    pageSize,
    total,
  };
}

/**
 * Consulta de producto individual
 */
export async function obtenerProducto(id: number) {
  const [fila] = await db
    .select({
      id: productos.id,
      codigo: productos.codigo,
      descripcion: productos.descripcion,
      precio: productos.precio,
      existencia: productos.existencia,
      stockMinimo: productos.stockMinimo,
      activo: productos.activo,
      categoriaId: categorias.id,
      categoriaNombre: categorias.nombre,
    })
    .from(productos)
    .innerJoin(categorias, eq(productos.categoriaId, categorias.id))
    .where(eq(productos.id, id))
    .limit(1);

  if (!fila) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  return {
    id: fila.id,
    codigo: fila.codigo,
    descripcion: fila.descripcion,
    categoria: {
      id: fila.categoriaId,
      nombre: fila.categoriaNombre,
    },
    precio: fila.precio,
    existencia: fila.existencia,
    stockMinimo: fila.stockMinimo,
    bajoMinimo: fila.existencia <= fila.stockMinimo,
    activo: fila.activo,
  };
}

/**
 * RF-P2: Alta de producto con control de código único y stock inicial
 */
export async function crearProducto(usuario: SesionUsuario, rawData: unknown) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede crear productos.");
  }

  const data = productoCrearSchema.parse(rawData);

  // Verificamos código duplicado sin distinguir mayúsculas
  const [existente] = await db
    .select()
    .from(productos)
    .where(sql`lower(${productos.codigo}) = lower(${data.codigo})`)
    .limit(1);

  if (existente) {
    throw new ApiError(409, "CODIGO_DUPLICADO", `Ya existe un producto con el código "${data.codigo}".`);
  }

  // Verificamos que la categoría exista
  const [cat] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, data.categoriaId))
    .limit(1);

  if (!cat) {
    throw new ApiError(404, "NO_ENCONTRADO", "La categoría seleccionada no existe.");
  }

  return await db.transaction(async (tx) => {
    // Se inserta con existencia 0
    const [nuevo] = await tx
      .insert(productos)
      .values({
        codigo: data.codigo,
        descripcion: data.descripcion,
        categoriaId: data.categoriaId,
        precio: data.precio,
        existencia: 0,
        stockMinimo: data.stockMinimo,
        activo: true,
      })
      .returning();

    let existenciaFinal = 0;

    // Si viene stock inicial > 0, se carga como un movimiento de ingreso formal
    if (data.stockInicial && data.stockInicial > 0) {
      const mov = await moverStock(tx, {
        productoId: nuevo.id,
        tipo: "ingreso",
        cantidad: data.stockInicial,
        motivo: "Stock inicial",
        usuarioId: usuario.id,
      });
      existenciaFinal = mov.existenciaResultante;
    }

    return {
      id: nuevo.id,
      codigo: nuevo.codigo,
      descripcion: nuevo.descripcion,
      categoria: {
        id: cat.id,
        nombre: cat.nombre,
      },
      precio: nuevo.precio,
      existencia: existenciaFinal,
      stockMinimo: nuevo.stockMinimo,
      bajoMinimo: existenciaFinal <= nuevo.stockMinimo,
      activo: nuevo.activo,
    };
  });
}

/**
 * RF-P2, RF-P3: Modificación o baja lógica de producto
 */
export async function actualizarProducto(
  usuario: SesionUsuario,
  id: number,
  rawData: unknown
) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede modificar productos.");
  }

  // Comprueba que no venga existencia en el payload
  if (rawData && typeof rawData === "object" && "existencia" in rawData) {
    throw new ApiError(422, "VALIDACION", "No se permite modificar la existencia directamente.");
  }

  const data = productoEditarSchema.parse(rawData);

  const [existente] = await db
    .select()
    .from(productos)
    .where(eq(productos.id, id))
    .limit(1);

  if (!existente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Producto no encontrado.");
  }

  // Si cambia el código, chequear unicidad
  if (data.codigo && data.codigo.toLowerCase() !== existente.codigo.toLowerCase()) {
    const [duplicado] = await db
      .select()
      .from(productos)
      .where(
        and(
          sql`lower(${productos.codigo}) = lower(${data.codigo})`,
          not(eq(productos.id, id))
        )
      )
      .limit(1);

    if (duplicado) {
      throw new ApiError(409, "CODIGO_DUPLICADO", `Ya existe otro producto con el código "${data.codigo}".`);
    }
  }

  // Si cambia categoría, verificar que exista
  if (data.categoriaId) {
    const [cat] = await db
      .select()
      .from(categorias)
      .where(eq(categorias.id, data.categoriaId))
      .limit(1);

    if (!cat) {
      throw new ApiError(404, "NO_ENCONTRADO", "La categoría seleccionada no existe.");
    }
  }

  const [actualizado] = await db
    .update(productos)
    .set({
      ...(data.codigo ? { codigo: data.codigo } : {}),
      ...(data.descripcion ? { descripcion: data.descripcion } : {}),
      ...(data.categoriaId ? { categoriaId: data.categoriaId } : {}),
      ...(data.precio !== undefined ? { precio: data.precio } : {}),
      ...(data.stockMinimo !== undefined ? { stockMinimo: data.stockMinimo } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(productos.id, id))
    .returning();

  return await obtenerProducto(actualizado.id);
}
