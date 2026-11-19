import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { obtenerCliente, actualizarCliente } from "@/services/clientes.service";

export const GET = apiHandler<{ id: string }>(
  async (_req: NextRequest, _usuario, { params }) => {
    const id = Number(params.id);
    const cliente = await obtenerCliente(id);
    return NextResponse.json(cliente, { status: 200 });
  }
);

export const PATCH = apiHandler<{ id: string }>(
  async (req: NextRequest, usuario, { params }) => {
    const id = Number(params.id);
    const body = await req.json();
    const actualizado = await actualizarCliente(usuario, id, body);
    return NextResponse.json(actualizado, { status: 200 });
  }
);
