import { NextResponse } from "next/server";
import { apiHandler } from "@/lib/api-handler";
import { logout } from "@/services/auth.service";

export const POST = apiHandler(async () => {
  await logout();
  return new NextResponse(null, { status: 204 });
}, { permitirEnDemo: true });
