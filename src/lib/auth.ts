import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { db } from "@/db";
import { usuarios } from "@/db/schema";
import { eq } from "drizzle-orm";
import { ApiError } from "./errors";

function obtenerClaveSesion(): Uint8Array {
  const secreto = process.env.SESSION_SECRET;
  if (process.env.NODE_ENV === "production" &&
      (!secreto || secreto === "desarrollo-local-secreto-cambiar-en-produccion-32caracteres" || secreto.length < 32)) {
    throw new Error("SESSION_SECRET debe configurarse con al menos 32 caracteres distintos del valor de ejemplo.");
  }
  return new TextEncoder().encode(secreto || "desarrollo-local-secreto-cambiar-en-produccion-32caracteres");
}

const COOKIE_NAME = "session_token";

export interface SesionUsuario {
  id: number;
  nombre: string;
  email: string;
  rol: "admin" | "vendedor";
}

export async function crearTokenSesion(usuario: SesionUsuario): Promise<string> {
  return await new SignJWT({
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(obtenerClaveSesion());
}

export async function verificarTokenSesion(token: string): Promise<SesionUsuario | null> {
  try {
    const { payload } = await jwtVerify(token, obtenerClaveSesion());
    return {
      id: Number(payload.id),
      nombre: String(payload.nombre),
      email: String(payload.email),
      rol: payload.rol as "admin" | "vendedor",
    };
  } catch {
    return null;
  }
}

/**
 * Obtiene y valida el usuario activo contra la base de datos en cada petición
 */
export async function obtenerUsuarioActual(): Promise<SesionUsuario> {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    throw new ApiError(401, "NO_AUTENTICADO", "Falta la sesión o venció.");
  }

  const payload = await verificarTokenSesion(token);
  if (!payload) {
    throw new ApiError(401, "NO_AUTENTICADO", "Sesión inválida o expirada.");
  }

  // Verificamos siempre contra la base de datos que el usuario exista y siga activo
  const [usuario] = await db
    .select()
    .from(usuarios)
    .where(eq(usuarios.id, payload.id))
    .limit(1);

  if (!usuario || !usuario.activo) {
    throw new ApiError(401, "NO_AUTENTICADO", "El usuario no existe o está desactivado.");
  }

  return {
    id: usuario.id,
    nombre: usuario.nombre,
    email: usuario.email,
    rol: usuario.rol,
  };
}

export async function establecerCookieSesion(token: string) {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 días
  });
}

export async function eliminarCookieSesion() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
