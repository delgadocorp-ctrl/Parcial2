import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { ApiError } from "@/lib/errors";
import { loginSchema } from "@/lib/schemas";
import {
  crearTokenSesion,
  establecerCookieSesion,
  eliminarCookieSesion,
  SesionUsuario,
} from "@/lib/auth";

export async function login(rawData: unknown) {
  const data = loginSchema.parse(rawData);

  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.email, data.email))
    .limit(1);

  if (!usuario || !usuario.activo) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }

  const valida = await bcrypt.compare(data.password, usuario.passwordHash);
  if (!valida) {
    throw new ApiError(401, "CREDENCIALES_INVALIDAS", "Email o contraseña incorrectos.");
  }

  const sesion: SesionUsuario = {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };

  const token = await crearTokenSesion(sesion);
  await establecerCookieSesion(token);

  return sesion;
}

export async function logout() {
  await eliminarCookieSesion();
  return { ok: true };
}

export async function obtenerMe(usuario: SesionUsuario) {
  return usuario;
}
