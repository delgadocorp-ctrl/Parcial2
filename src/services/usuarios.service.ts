import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq, and, or, sql, not } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { randomBytes } from "node:crypto";
import { ApiError } from "@/lib/errors";
import {
  usuarioCrearSchema,
  usuarioEditarSchema,
  cambiarPasswordSchema,
} from "@/lib/schemas";
import { SesionUsuario } from "@/lib/auth";

export async function listarUsuarios(
  filtros: { q?: string; activo?: boolean | string; page?: number; pageSize?: number },
  usuario: SesionUsuario
) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede gestionar usuarios.");
  }

  const page = Math.max(1, Number(filtros.page) || 1);
  const pageSize = Math.min(100, Math.max(1, Number(filtros.pageSize) || 20));
  const offset = (page - 1) * pageSize;

  const conditions = [];

  if (filtros.activo !== undefined && filtros.activo !== "todos") {
    const esActivo = String(filtros.activo) === "true";
    conditions.push(eq(usuarios.activo, esActivo));
  }

  if (filtros.q && filtros.q.trim().length > 0) {
    const t = `%${filtros.q.trim().toLowerCase()}%`;
    conditions.push(
      or(sql`lower(${usuarios.nombre}) LIKE ${t}`, sql`lower(${usuarios.email}) LIKE ${t}`)
    );
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [totalRes] = await db
    .select({ count: sql<number>`count(*)` })
    .from(usuarios)
    .where(whereClause);

  const total = Number(totalRes?.count || 0);

  const filas = await db
    .select({
      id: usuarios.id,
      nombre: usuarios.nombre,
      email: usuarios.email,
      rol: usuarios.rol,
      activo: usuarios.activo,
      createdAt: usuarios.createdAt,
    })
    .from(usuarios)
    .where(whereClause)
    .orderBy(usuarios.nombre)
    .limit(pageSize)
    .offset(offset);

  return {
    data: filas,
    page,
    pageSize,
    total,
  };
}

export async function crearUsuario(usuario: SesionUsuario, rawData: unknown) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede crear usuarios.");
  }

  const data = usuarioCrearSchema.parse(rawData);

  const [existente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (existente) {
    throw new ApiError(409, "EMAIL_DUPLICADO", `Ya existe un usuario con el email "${data.email}".`);
  }

  const passwordHash = await bcrypt.hash(data.password, 10);

  const [nuevo] = await db
    .insert(usuarios)
    .values({
      nombre: data.nombre,
      email: data.email,
      passwordHash,
      rol: data.rol,
      activo: true,
    })
    .returning();

  return {
    id: nuevo.id,
    nombre: nuevo.nombre,
    email: nuevo.email,
    rol: nuevo.rol,
    activo: nuevo.activo,
  };
}

export async function actualizarUsuario(
  usuario: SesionUsuario,
  id: number,
  rawData: unknown
) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede modificar usuarios.");
  }

  const data = usuarioEditarSchema.parse(rawData);

  const [existente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!existente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  // RF-U4 / 11.3: Un admin no puede desactivarse ni quitarse el rol a sí mismo
  if (id === usuario.id) {
    if (data.activo === false) {
      throw new ApiError(
        422,
        "OPERACION_SOBRE_SI_MISMO",
        "No puedes desactivar tu propia cuenta de usuario."
      );
    }
    if (data.rol && data.rol !== "admin") {
      throw new ApiError(
        422,
        "OPERACION_SOBRE_SI_MISMO",
        "No puedes quitarte el rol de administrador a ti mismo."
      );
    }
  }

  if (existente.activo && existente.rol === "admin" &&
      (data.activo === false || data.rol === "vendedor")) {
    const [admins] = await db.select({ cantidad: sql<number>`count(*)` })
      .from(usuarios)
      .where(and(eq(usuarios.rol, "admin"), eq(usuarios.activo, true)));
    if (Number(admins.cantidad) <= 1) {
      throw new ApiError(422, "ULTIMO_ADMINISTRADOR", "Debe quedar al menos un administrador activo.");
    }
  }

  // Si cambia el email, chequear duplicados
  if (data.email && data.email !== existente.email) {
    const [duplicado] = await db
      .select()
      .from(usuarios)
      .where(and(eq(usuarios.email, data.email), not(eq(usuarios.id, id))))
      .limit(1);

    if (duplicado) {
      throw new ApiError(409, "EMAIL_DUPLICADO", `Ya existe otro usuario con el email "${data.email}".`);
    }
  }

  const [actualizado] = await db
    .update(usuarios)
    .set({
      ...(data.nombre ? { nombre: data.nombre } : {}),
      ...(data.email ? { email: data.email } : {}),
      ...(data.rol ? { rol: data.rol } : {}),
      ...(data.activo !== undefined ? { activo: data.activo } : {}),
    })
    .where(eq(usuarios.id, id))
    .returning();

  return {
    id: actualizado.id,
    nombre: actualizado.nombre,
    email: actualizado.email,
    rol: actualizado.rol,
    activo: actualizado.activo,
  };
}

export async function resetPasswordUsuario(usuario: SesionUsuario, id: number) {
  if (usuario.rol !== "admin") {
    throw new ApiError(403, "SIN_PERMISO", "Solo el administrador puede restablecer contraseñas.");
  }

  const [existente] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, id))
    .limit(1);

  if (!existente) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  // Generamos una contraseña temporal segura
  const passwordTemporal = "Temp" + randomBytes(12).toString("base64url") + "!";
  const passwordHash = await bcrypt.hash(passwordTemporal, 10);

  await db
    .update(usuarios)
    .set({ passwordHash })
    .where(eq(usuarios.id, id));

  return { passwordTemporal };
}

export async function cambiarPasswordPropia(usuario: SesionUsuario, rawData: unknown) {
  const data = cambiarPasswordSchema.parse(rawData);

  const [u] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, usuario.id))
    .limit(1);

  if (!u) {
    throw new ApiError(404, "NO_ENCONTRADO", "Usuario no encontrado.");
  }

  const valida = await bcrypt.compare(data.actual, u.passwordHash);
  if (!valida) {
    throw new ApiError(
      422,
      "CONTRASENA_ACTUAL_INCORRECTA",
      "La contraseña actual ingresada es incorrecta."
    );
  }

  const nuevaHash = await bcrypt.hash(data.nueva, 10);
  await db
    .update(usuarios)
    .set({ passwordHash: nuevaHash })
    .where(eq(usuarios.id, usuario.id));

  return { ok: true };
}
