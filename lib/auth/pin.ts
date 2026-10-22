import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

// Este archivo solo depende de node:crypto para que prisma/seed.ts lo pueda importar
// corriendo con Node directo (sin el bundler de Next ni el alias "@/").

export const PIN_REGEX = /^\d{4}$/;

// Se guarda "salt:hash" en hex. scrypt hace caro probar PINs si alguien se lleva la
// base, aunque con 4 dígitos la defensa real es el bloqueo por intentos fallidos.
export function hashPin(pin: string) {
  const salt = randomBytes(16);
  const hash = scryptSync(pin, salt, 32);
  return `${salt.toString("hex")}:${hash.toString("hex")}`;
}

export function verificarPin(pin: string, guardado: string) {
  const [saltHex, hashHex] = guardado.split(":");
  if (!saltHex || !hashHex) {
    return false;
  }
  const esperado = Buffer.from(hashHex, "hex");
  const calculado = scryptSync(pin, Buffer.from(saltHex, "hex"), esperado.length);
  return timingSafeEqual(esperado, calculado);
}
