import { pedirSubida, type Destino } from "@/lib/actions/fotos";

// Solo para client components: prepara la foto en el celular (WebP chico) y la sube
// directo a R2 con el link firmado.

// Tamaño de las historias: vertical como Instagram.
export const HISTORIA_ANCHO = 1080;
export const HISTORIA_ALTO = 1920;

async function leer(archivo: File) {
  if (!archivo.type.startsWith("image/")) {
    throw new Error("Elegí una imagen.");
  }
  // imageOrientation: respeta la rotación de las fotos sacadas con el celular.
  return createImageBitmap(archivo, { imageOrientation: "from-image" });
}

function aWebp(canvas: HTMLCanvasElement) {
  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la foto."))),
      "image/webp",
      0.82
    );
  });
}

// Foto de perfil: la misma foto, con el lado más largo en `ladoMaximo`.
export async function prepararFoto(archivo: File, ladoMaximo: number) {
  const imagen = await leer(archivo);
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(imagen.width * escala);
  canvas.height = Math.round(imagen.height * escala);
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, canvas.width, canvas.height);
  imagen.close();
  return aWebp(canvas);
}

// Historia: siempre 1080×1920. La foto entra entera en el medio y el resto se rellena
// con la misma foto agrandada, borrosa y oscurecida (como hace Instagram con las
// fotos que no son verticales).
export async function prepararHistoria(archivo: File) {
  const imagen = await leer(archivo);
  const canvas = document.createElement("canvas");
  canvas.width = HISTORIA_ANCHO;
  canvas.height = HISTORIA_ALTO;
  const ctx = canvas.getContext("2d")!;

  const cubrir = Math.max(HISTORIA_ANCHO / imagen.width, HISTORIA_ALTO / imagen.height);
  const fondoAncho = imagen.width * cubrir;
  const fondoAlto = imagen.height * cubrir;
  ctx.filter = "blur(40px) brightness(0.55)";
  ctx.drawImage(
    imagen,
    (HISTORIA_ANCHO - fondoAncho) / 2,
    (HISTORIA_ALTO - fondoAlto) / 2,
    fondoAncho,
    fondoAlto
  );
  ctx.filter = "none";

  const entrar = Math.min(HISTORIA_ANCHO / imagen.width, HISTORIA_ALTO / imagen.height);
  const ancho = imagen.width * entrar;
  const alto = imagen.height * entrar;
  ctx.drawImage(imagen, (HISTORIA_ANCHO - ancho) / 2, (HISTORIA_ALTO - alto) / 2, ancho, alto);
  imagen.close();

  return aWebp(canvas);
}

// Sube una foto ya preparada. Devuelve la clave en R2.
export async function subirPreparada(
  foto: Blob,
  destino: Destino
): Promise<{ key: string } | { error: string }> {
  const subida = await pedirSubida(destino);
  if ("error" in subida) {
    return subida;
  }

  const respuesta = await fetch(subida.url, {
    method: "PUT",
    body: foto,
    headers: { "Content-Type": "image/webp" },
  }).catch(() => null);

  if (!respuesta?.ok) {
    return { error: "No se pudo subir la foto. Revisá la conexión y probá de nuevo." };
  }
  return { key: subida.key };
}

export async function subirFoto(
  archivo: File,
  destino: Destino,
  ladoMaximo: number
): Promise<{ key: string } | { error: string }> {
  let foto: Blob;
  try {
    foto = await prepararFoto(archivo, ladoMaximo);
  } catch (error) {
    return { error: error instanceof Error ? error.message : "No se pudo leer la foto." };
  }
  return subirPreparada(foto, destino);
}
