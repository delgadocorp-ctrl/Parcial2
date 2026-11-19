import { redirect } from "next/navigation";
import { obtenerUsuarioActual } from "@/lib/auth";

export default async function HomePage() {
  try {
    await obtenerUsuarioActual();
  } catch {
    redirect("/login");
  }
  redirect("/productos");
}
