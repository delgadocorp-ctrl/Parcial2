import "dotenv/config";
import { cargarDatosDePrueba } from "./datos-prueba";

async function main() {
  await cargarDatosDePrueba();
  process.exit(0);
}

main().catch((err) => {
  console.error("Error en seed:", err);
  process.exit(1);
});
