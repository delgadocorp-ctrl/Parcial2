import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { actualizarCategoria } from "@/services/categorias.service";

export const PATCH = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const id = Number(params.id);
    const body = await leerJson(req);
    const actualizada = await actualizarCategoria(usuario, id, body);
    return NextResponse.json(actualizada, { status: 200 });
  },
  { roles: ["admin"] }
);
