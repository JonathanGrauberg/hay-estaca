import { AwsClient } from "aws4fetch";

// Cloudflare R2 (compatible con S3). El bucket es privado: para subir, el celular
// recibe un link firmado de PUT que vence en minutos; para ver, /fotos/... chequea
// permisos y redirige a un link firmado de GET que vence en una hora.

const ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const BUCKET = process.env.R2_BUCKET;

// Lo más grande que se acepta por foto. El celular las achica antes de subir (pesan
// ~100-300 KB), así que esto solo frena subidas hechas a mano.
export const TAMANO_MAXIMO = 5 * 1024 * 1024;

export function r2Configurado() {
  return Boolean(ACCOUNT_ID && ACCESS_KEY_ID && SECRET_ACCESS_KEY && BUCKET);
}

let cliente: AwsClient | null = null;

function r2() {
  if (!r2Configurado()) {
    throw new Error("Faltan las variables R2_* (ver .env.example)");
  }
  cliente ??= new AwsClient({
    accessKeyId: ACCESS_KEY_ID!,
    secretAccessKey: SECRET_ACCESS_KEY!,
    service: "s3",
    region: "auto",
  });
  return cliente;
}

function urlObjeto(key: string) {
  const ruta = key.split("/").map(encodeURIComponent).join("/");
  return new URL(`https://${ACCOUNT_ID}.r2.cloudflarestorage.com/${BUCKET}/${ruta}`);
}

async function firmar(key: string, method: "GET" | "PUT", segundos: number) {
  const url = urlObjeto(key);
  url.searchParams.set("X-Amz-Expires", String(segundos));
  const firmado = await r2().sign(new Request(url, { method }), { aws: { signQuery: true } });
  return firmado.url;
}

export function urlSubida(key: string) {
  return firmar(key, "PUT", 5 * 60);
}

export function urlLectura(key: string) {
  return firmar(key, "GET", 60 * 60);
}

// Tamaño en bytes, o null si el objeto no existe (no se llegó a subir).
export async function tamanoObjeto(key: string) {
  const respuesta = await r2().fetch(urlObjeto(key), { method: "HEAD" });
  if (!respuesta.ok) {
    return null;
  }
  return Number(respuesta.headers.get("content-length") ?? 0);
}

export async function borrarObjeto(key: string) {
  if (!r2Configurado()) {
    return;
  }
  await r2().fetch(urlObjeto(key), { method: "DELETE" });
}
