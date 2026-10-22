// Carga los integrantes de prueba definidos en SEED_USUARIOS (ver .env.example).
// Correr con: npm run seed
//
// Usa pg directo en vez del cliente de Prisma porque el cliente generado importa sus
// módulos sin extensión y Node no los resuelve corriendo TypeScript sin bundler.
// Es idempotente: si ya existe alguien con ese apodo, solo le actualiza el PIN.
import "dotenv/config";
import { randomUUID } from "node:crypto";
import pg from "pg";
import { PIN_REGEX, hashPin } from "../lib/auth/pin.ts";

function leerUsuarios() {
  const crudo = process.env.SEED_USUARIOS;
  if (!crudo) {
    throw new Error("Falta SEED_USUARIOS en .env (copiá el ejemplo de .env.example).");
  }
  return crudo.split(";").map((entrada) => {
    const [nombre, apodo, pin] = entrada.split("|").map((parte) => parte.trim());
    if (!nombre || !apodo || !PIN_REGEX.test(pin ?? "")) {
      throw new Error(`Entrada inválida en SEED_USUARIOS: "${entrada}" (formato Nombre|Apodo|PIN).`);
    }
    return { nombre, apodo, pin };
  });
}

async function main() {
  const usuarios = leerUsuarios();
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();

  try {
    for (const { nombre, apodo, pin } of usuarios) {
      const existente = await client.query<{ id: string }>(
        'SELECT id FROM "User" WHERE apodo = $1 LIMIT 1',
        [apodo]
      );
      if (existente.rows[0]) {
        await client.query('UPDATE "User" SET nombre = $1, "pinHash" = $2 WHERE id = $3', [
          nombre,
          hashPin(pin),
          existente.rows[0].id,
        ]);
        console.log(`Actualizado: ${apodo}`);
      } else {
        await client.query(
          'INSERT INTO "User" (id, nombre, apodo, "pinHash") VALUES ($1, $2, $3, $4)',
          [randomUUID(), nombre, apodo, hashPin(pin)]
        );
        console.log(`Creado: ${apodo}`);
      }
    }
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
