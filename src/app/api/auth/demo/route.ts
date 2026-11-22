import { NextResponse } from "next/server";
import { z } from "zod";
import { leerJson, publicApiHandler } from "@/lib/api-handler";
import { crearTokenSesion, establecerCookieSesion, type SesionUsuario } from "@/lib/auth";

const solicitudDemo = z.object({ rol: z.enum(["admin", "vendedor"]) }).strict();

export const POST = publicApiHandler(async (req) => {
  const { rol } = solicitudDemo.parse(await leerJson(req));
  const esAdmin = rol === "admin";
  const usuario: SesionUsuario = {
    id: esAdmin ? 1 : 2,
    nombre: esAdmin ? "Administrador demo" : "Vendedor demo",
    email: esAdmin ? "admin@comercio.test" : "vendedor@comercio.test",
    rol,
    demo: true,
  };
  await establecerCookieSesion(await crearTokenSesion(usuario), true);
  return NextResponse.json(usuario);
});
