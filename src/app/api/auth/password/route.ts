import { NextRequest, NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { cambiarPasswordPropia } from "@/services/usuarios.service";

export const PUT = apiHandler(async (req: NextRequest, usuario) => {
  const body = await req.json();
  await cambiarPasswordPropia(usuario, body);
  return new NextResponse(null, { status: 204 });
});
