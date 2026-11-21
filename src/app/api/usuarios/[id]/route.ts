import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { actualizarUsuario } from "@/services/usuarios.service";

export const PATCH = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const id = Number(params.id);
    const body = await leerJson(req);
    const actualizado = await actualizarUsuario(usuario, id, body);
    return NextResponse.json(actualizado, { status: 200 });
  },
  { roles: ["admin"] }
);
