"use server";

import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { historiasSinVer, keyDeRuta, rutaFoto, vaALaJuntada } from "@/lib/fotos";
import { estadoHistorias } from "@/lib/juntadas/horario";
import { TAMANO_MAXIMO, borrarObjeto, r2Configurado, tamanoObjeto, urlSubida } from "@/lib/r2";

// Subida en dos pasos: pedirSubida da una clave y un link firmado de PUT, el celular
// sube la foto (ya achicada) directo a R2, y después la acción de cada caso la guarda.
// Las claves llevan el dueño o la juntada en el prefijo, y cada acción chequea que el
// prefijo sea el que corresponde.

export type Destino = { tipo: "avatar"; userId: string } | { tipo: "historia"; juntadaId: string };

export type PedirSubidaResultado = { error: string } | { key: string; url: string };

const SIN_R2 = "Las fotos todavía no están configuradas (falta conectar Cloudflare R2).";

// Las historias se suben solo los que van y desde el día de la juntada hasta que termina.
async function puedeSubirHistoria(juntadaId: string, userId: string) {
  const juntada = await prisma.juntada.findUnique({
    where: { id: juntadaId },
    select: { fecha: true, hora: true, fechaFin: true, horaFin: true },
  });
  if (!juntada) {
    return "Esa juntada ya no existe.";
  }
  const estado = estadoHistorias(juntada);
  if (estado === "todavia") {
    return "Las historias se abren el día de la juntada.";
  }
  if (estado === "terminada") {
    return "La juntada terminó: ya no se suben historias.";
  }
  if (!(await vaALaJuntada(juntadaId, userId))) {
    return "Solo los que van a la juntada pueden subir historias.";
  }
  return null;
}

function prefijo(destino: Destino) {
  return destino.tipo === "avatar"
    ? `avatars/${destino.userId}/`
    : `historias/${destino.juntadaId}/`;
}

export async function pedirSubida(destino: Destino): Promise<PedirSubidaResultado> {
  const usuario = await requireUsuario();

  if (!r2Configurado()) {
    return { error: SIN_R2 };
  }
  if (destino.tipo === "avatar") {
    const existe = await prisma.user.count({ where: { id: destino.userId } });
    if (!existe) {
      return { error: "Ese integrante ya no existe." };
    }
  } else {
    const error = await puedeSubirHistoria(destino.juntadaId, usuario.id);
    if (error) {
      return { error };
    }
  }

  const key = `${prefijo(destino)}${randomUUID()}.webp`;
  return { key, url: await urlSubida(key) };
}

// Chequea que la foto subida sea del destino esperado y que no sea gigante. Si algo no
// cierra, la borra de R2.
async function fotoValida(key: string, destino: Destino) {
  if (!key.startsWith(prefijo(destino)) || key.includes("..")) {
    return false;
  }
  const tamano = await tamanoObjeto(key);
  if (tamano === null) {
    return false;
  }
  if (tamano > TAMANO_MAXIMO) {
    await borrarObjeto(key);
    return false;
  }
  return true;
}

export type FotoState = { error: string } | { ok: string } | undefined;

// La propia pasa a ser el avatar; la de otro queda como propuesta hasta que la acepte.
export async function guardarFotoPerfil(userId: string, key: string): Promise<FotoState> {
  const usuario = await requireUsuario();

  if (!(await fotoValida(key, { tipo: "avatar", userId }))) {
    return { error: "No se pudo subir la foto. Probá de nuevo." };
  }

  if (userId === usuario.id) {
    await cambiarAvatar(userId, key);
    revalidatePath("/", "layout");
    return { ok: "Foto actualizada." };
  }

  await prisma.propuestaFoto.create({ data: { paraUserId: userId, deUserId: usuario.id, key } });
  revalidatePath("/", "layout");
  return { ok: "Listo: le llegó tu propuesta, la tiene que aceptar." };
}

async function cambiarAvatar(userId: string, key: string | null) {
  const anterior = await prisma.user.findUnique({
    where: { id: userId },
    select: { avatarUrl: true },
  });
  await prisma.user.update({
    where: { id: userId },
    data: { avatarUrl: key ? rutaFoto(key) : null },
  });
  const keyAnterior = keyDeRuta(anterior?.avatarUrl ?? null);
  if (keyAnterior && keyAnterior !== key) {
    await borrarObjeto(keyAnterior);
  }
}

export async function quitarMiFoto(_formData: FormData) {
  const usuario = await requireUsuario();
  await cambiarAvatar(usuario.id, null);
  revalidatePath("/", "layout");
}

// Solo el dueño acepta o rechaza; el que la propuso también la puede retirar.
export async function responderPropuesta(propuestaId: string, aceptar: boolean, _formData: FormData) {
  const usuario = await requireUsuario();
  const propuesta = await prisma.propuestaFoto.findUnique({ where: { id: propuestaId } });

  if (!propuesta) {
    return;
  }
  const esDueno = propuesta.paraUserId === usuario.id;
  if (!esDueno && !(propuesta.deUserId === usuario.id && !aceptar)) {
    return;
  }

  await prisma.propuestaFoto.delete({ where: { id: propuesta.id } });
  if (aceptar && esDueno) {
    await cambiarAvatar(usuario.id, propuesta.key);
  } else {
    await borrarObjeto(propuesta.key);
  }

  revalidatePath("/", "layout");
}

export async function publicarHistoria(
  juntadaId: string,
  key: string,
  texto: string,
  fomo: string
): Promise<FotoState> {
  const usuario = await requireUsuario();

  const error = await puedeSubirHistoria(juntadaId, usuario.id);
  if (error) {
    return { error };
  }
  if (!(await fotoValida(key, { tipo: "historia", juntadaId }))) {
    return { error: "No se pudo subir la foto. Probá de nuevo." };
  }

  await prisma.historia.create({
    data: {
      juntadaId,
      autorId: usuario.id,
      key,
      texto: texto.trim().slice(0, 140) || null,
      fomo: fomo.trim().slice(0, 140) || null,
    },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  return { ok: "Historia subida." };
}

export async function borrarHistoria(historiaId: string) {
  const usuario = await requireUsuario();
  const historia = await prisma.historia.findFirst({
    where: { id: historiaId, autorId: usuario.id },
  });
  if (!historia) {
    return;
  }

  await prisma.historia.delete({ where: { id: historia.id } });
  await borrarObjeto(historia.key);

  revalidatePath(`/juntadas/${historia.juntadaId}`);
}

// Se llama al abrir cada historia en el visor. Solo cuenta a los que van (los únicos
// que la pueden ver) y no al que la subió.
export async function marcarHistoriaVista(historiaId: string) {
  const usuario = await requireUsuario();
  const historia = await prisma.historia.findUnique({
    where: { id: historiaId },
    select: { juntadaId: true, autorId: true },
  });
  if (!historia || historia.autorId === usuario.id) {
    return;
  }
  if (!(await vaALaJuntada(historia.juntadaId, usuario.id))) {
    return;
  }
  await prisma.vistaHistoria.upsert({
    where: { historiaId_userId: { historiaId, userId: usuario.id } },
    create: { historiaId, userId: usuario.id },
    update: { soloFomo: false },
  });
  // Sin revalidate: el que la subió ve la lista actualizada la próxima vez que entra, y
  // el inicio deja de ofrecerla en la próxima carga.
}

// El que no va vio el FOMO: las historias de ahora ya no se le ofrecen en el inicio (las
// nuevas sí). No aparece en "quién la vio".
export async function marcarFomoVisto(juntadaId: string) {
  const usuario = await requireUsuario();
  const historias = await prisma.historia.findMany({
    where: { juntadaId, ...historiasSinVer(usuario.id) },
    select: { id: true },
  });
  if (historias.length === 0) {
    return;
  }
  await prisma.vistaHistoria.createMany({
    data: historias.map((h) => ({ historiaId: h.id, userId: usuario.id, soloFomo: true })),
    skipDuplicates: true,
  });
}
