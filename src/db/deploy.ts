import "dotenv/config";
import { migrate } from "drizzle-orm/libsql/migrator";
import { db } from "./index";
import { baseVacia, cargarDatosDePrueba } from "./datos-prueba";
import { configuracion } from "./schema";
import { eq } from "drizzle-orm";

async function main() {
  console.log("=== Ejecutando script de despliegue (deploy.ts) ===");

  // En Vercel, los deploys de preview no tocan la base
  if (process.env.VERCEL && process.env.VERCEL_ENV !== "production") {
    console.log("-> Entorno preview en Vercel detectado. Omitiendo migraciones automáticas.");
    return;
  }

  // Validación de seguridad en producción
  if (process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production") {
    const dbUrl = process.env.DATABASE_URL || process.env.TURSO_DATABASE_URL;
    if (!dbUrl) {
      console.error("ERROR CRÍTICO: Falta configurar DATABASE_URL o TURSO_DATABASE_URL.");
      process.exit(1);
    }

    const secret = process.env.SESSION_SECRET;
    if (!secret || secret.length < 32 || secret.includes("desarrollo-local")) {
      console.error(
        "ERROR CRÍTICO: SESSION_SECRET es inválido o menor a 32 caracteres para producción."
      );
      process.exit(1);
    }
  }

  // Aplicar migraciones
  console.log("-> Aplicando migraciones de base de datos...");
  await migrate(db, { migrationsFolder: "drizzle" });
  console.log("✓ Migraciones aplicadas correctamente.");

  const estaVacia = await baseVacia();

  // Manejo de SEED_RESET opcional
  const seedReset = process.env.SEED_RESET;
  if (seedReset) {
    const [marca] = await db
      .select()
      .from(configuracion)
      .where(eq(configuracion.clave, "seed_reset"))
      .limit(1);

    if (!marca || marca.valor !== seedReset) {
      if (!estaVacia) {
        throw new Error(
          "SEED_RESET solo puede inicializar una base vacía; no modifica ni reemplaza datos existentes."
        );
      }

      console.log(`-> SEED_RESET=${seedReset} detectado. Cargando datos de prueba...`);
      await cargarDatosDePrueba();
      if (!marca) {
        await db.insert(configuracion).values({ clave: "seed_reset", valor: seedReset });
      } else {
        await db
          .update(configuracion)
          .set({ valor: seedReset })
          .where(eq(configuracion.clave, "seed_reset"));
      }
      return;
    }
  }

  // Si la base está vacía (sin usuarios), cargamos los datos iniciales
  if (estaVacia) {
    console.log("-> Base de datos vacía detectada. Inicializando datos de prueba...");
    await cargarDatosDePrueba();
  } else {
    console.log("-> La base de datos ya contiene información. Se omite el seed.");
  }

  console.log("=== Despliegue de base de datos finalizado con éxito ===");
}

main().then(
  () => process.exit(0),
  (err) => {
    console.error("Error durante el deploy de base de datos:", err);
    process.exit(1);
  }
);
