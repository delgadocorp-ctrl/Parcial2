import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { resetPasswordUsuario } from "@/services/usuarios.service";

export const POST = apiHandler<{ id: string }>(
  async (_req: NextRequest, usuario, { params }) => {
    const id = Number(params.id);
    const resultado = await resetPasswordUsuario(usuario, id);
    return NextResponse.json(resultado, { status: 200 });
  },
  { roles: ["admin"] }
);
