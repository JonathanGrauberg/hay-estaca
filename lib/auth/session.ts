import { createHmac, timingSafeEqual } from "node:crypto";

// Token de sesión sin estado: "<userId>.<expiraMs>.<firma>", firmado con HMAC-SHA256
// y SESSION_SECRET. No depende de next/headers para que proxy.ts también lo pueda leer.

export const SESSION_COOKIE = "hayestaca_sesion";

const DURACION_MS = 30 * 24 * 60 * 60 * 1000;

function secreto() {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("Falta SESSION_SECRET (mínimo 32 caracteres) en las variables de entorno.");
  }
  return secret;
}

function firmar(payload: string) {
  return createHmac("sha256", secreto()).update(payload).digest("base64url");
}

export function crearToken(userId: string) {
  const expira = Date.now() + DURACION_MS;
  const payload = `${userId}.${expira}`;
  return { token: `${payload}.${firmar(payload)}`, expira: new Date(expira) };
}

// Devuelve el userId si la firma es válida y no venció; si no, null.
export function leerToken(token: string) {
  const partes = token.split(".");
  if (partes.length !== 3) {
    return null;
  }
  const [userId, expira, firma] = partes;
  const esperada = Buffer.from(firmar(`${userId}.${expira}`));
  const recibida = Buffer.from(firma);
  if (esperada.length !== recibida.length || !timingSafeEqual(esperada, recibida)) {
    return null;
  }
  if (Number(expira) < Date.now()) {
    return null;
  }
  return userId;
}
