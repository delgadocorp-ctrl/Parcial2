import { NextRequest, NextResponse } from "next/server";
import { apiHandler, leerJson } from "@/lib/api-handler";
import { listarUsuarios, crearUsuario } from "@/services/usuarios.service";

export const GET = apiHandler(
  async (req: NextRequest, usuario) => {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q") || undefined;
    const activo = searchParams.get("activo") || undefined;
    const page = searchParams.get("page") ? Number(searchParams.get("page")) : undefined;
    const pageSize = searchParams.get("pageSize") ? Number(searchParams.get("pageSize")) : undefined;

    const res = await listarUsuarios({ q, activo, page, pageSize }, usuario);
    return NextResponse.json(res, { status: 200 });
  },
  { roles: ["admin"] }
);

export const POST = apiHandler(
  async (req: NextRequest, usuario) => {
    const body = await leerJson(req);
    const nuevo = await crearUsuario(usuario, body);
    return NextResponse.json(nuevo, { status: 201 });
  },
  { roles: ["admin"] }
);
