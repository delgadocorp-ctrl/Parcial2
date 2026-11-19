import { db } from "@/db";
import { categorias, productos } from "@/db/schema";
import { eq, and, sql, not } from "drizzle-orm";
import { ApiError } from "@/lib/errors";
import { categoriaCrearSchema, categoriaEditarSchema } from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";

export async function listarCategorias(soloActivas: boolean = true) {
  const query = db.select().from(categorias);
  if (soloActivas) {
    return await query.where(eq(categorias.activa, true)).orderBy(categorias.nombre);
  }
  return await query.orderBy(categorias.nombre);
}

export async function crearCategoria(usuario: SesionUsuario, rawData: unknown) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede crear categorías.");
  }

  const data = categoriaCrearSchema.parse(rawData);

  // Verificamos nombre duplicado sin distinguir mayúsculas
  const [existente] = await db
    .select()
    .from(categorias)
    .where(sql`lower(${categorias.nombre}) = lower(${data.nombre})`)
    .limit(1);

  if (existente) {
    throw new ApiError(409, "NOMBRE_DUPLICADO", `Ya existe una categoría llamada "${data.nombre}".`);
  }

  const [nueva] = await db
    .insert(categorias)
    .values({
      nombre: data.nombre,
      activa: true,
    })
    .returning();

  return nueva;
}

export async function actualizarCategoria(
  usuario: SesionUsuario,
  id: number,
  rawData: unknown
) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede modificar categorías.");
  }

  const data = categoriaEditarSchema.parse(rawData);

  const [existente] = await db
    .select()
    .from(categorias)
    .where(eq(categorias.id, id))
    .limit(1);

  if (!existente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Categoría no encontrada.");
  }

  // Si cambia el nombre, chequear duplicados
  if (data.nombre && data.nombre.toLowerCase() !== existente.nombre.toLowerCase()) {
    const [duplicada] = await db
      .select()
      .from(categorias)
      .where(
        and(
          sql`lower(${categorias.nombre}) = lower(${data.nombre})`,
          not(eq(categorias.id, id))
        )
      )
      .limit(1);

    if (duplicada) {
      throw new ApiError(409, "NOMBRE_DUPLICADO", `Ya existe otra categoría llamada "${data.nombre}".`);
    }
  }

  // Si se intenta desactivar, chequear CATEGORIA_EN_USO
  if (data.activa === false && existente.activa) {
    const [productoActivo] = await db
      .select({ id: productos.id })
      .from(productos)
      .where(and(eq(productos.categoriaId, id), eq(productos.activo, true)))
      .limit(1);

    if (productoActivo) {
      throw new ApiError(
        409,
        "CATEGORIA_EN_USO",
        "No se puede desactivar una categoría que contiene productos activos."
      );
    }
  }

  const [actualizada] = await db
    .update(categorias)
    .set({
      ...(data.nombre ? { nombre: data.nombre } : {}),
      ...(data.activa !== undefined ? { activa: data.activa } : {}),
    })
    .where(eq(categorias.id, id))
    .returning();

  return actualizada;
}
