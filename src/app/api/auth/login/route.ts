import { NextRequest, NextResponse } from "next/server";
import { publicApiHandler, leerJson } from "@/lib/api-handler";
import { login } from "@/services/auth.service";

export const POST = publicApiHandler(async (req: NextRequest) => {
  const body = await leerJson(req);
  const usuario = await login(body);
  return NextResponse.json(usuario, { status: 200 });
});
