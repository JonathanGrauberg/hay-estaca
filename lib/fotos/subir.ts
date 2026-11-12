import { pedirSubida, type Destino } from "@/lib/actions/fotos";

// Solo para client components: achica la foto en el celular (WebP, lado máximo
// `ladoMaximo`) y la sube directo a R2 con el link firmado. Devuelve la clave en R2.

async function achicar(archivo: File, ladoMaximo: number) {
  // imageOrientation: respeta la rotación de las fotos sacadas con el celular.
  const imagen = await createImageBitmap(archivo, { imageOrientation: "from-image" });
  const escala = Math.min(1, ladoMaximo / Math.max(imagen.width, imagen.height));
  const ancho = Math.round(imagen.width * escala);
  const alto = Math.round(imagen.height * escala);

  const canvas = document.createElement("canvas");
  canvas.width = ancho;
  canvas.height = alto;
  canvas.getContext("2d")!.drawImage(imagen, 0, 0, ancho, alto);
  imagen.close();

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error("No se pudo procesar la foto"))),
      "image/webp",
      0.82
    );
  });
}

export async function subirFoto(
  archivo: File,
  destino: Destino,
  ladoMaximo: number
): Promise<{ key: string } | { error: string }> {
  if (!archivo.type.startsWith("image/")) {
    return { error: "Elegí una imagen." };
  }

  let foto: Blob;
  try {
    foto = await achicar(archivo, ladoMaximo);
  } catch {
    return { error: "No se pudo leer la foto. Probá con otra." };
  }

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
