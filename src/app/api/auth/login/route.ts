import { NextRequest, NextResponse } from "next/server";
import { publicApiHandler } from "@/lib/api-handler";
import { login } from "@/services/auth.service";

export const POST = publicApiHandler(async (req: NextRequest) => {
  const body = await req.json();
  const usuario = await login(body);
  return NextResponse.json(usuario, { status: 200 });
});
