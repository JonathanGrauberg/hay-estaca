"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { estaAbierta, hoyArgentina } from "@/lib/votaciones/datos";

export type ResultadoVotacion = { error: string } | { ok: true };

const SOLO_ADMIN = "Solo el admin del grupo puede hacer esto.";
const YA_ABIERTA = "Los resultados ya se abrieron: la votación terminó.";

function revalidar() {
  revalidatePath("/votaciones");
}

function leerFecha(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

// El admin arranca la temporada del año con el día de la despedida (la apertura).
export async function crearTemporada(formData: FormData): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }
  const apertura = leerFecha(formData.get("apertura"));
  if (!apertura) {
    return { error: "Elegí el día de la apertura." };
  }
  if (apertura <= hoyArgentina()) {
    return { error: "La apertura tiene que ser un día que todavía no llegó." };
  }
  const anio = Number(apertura.slice(0, 4));
  if (await prisma.temporadaVotacion.findUnique({ where: { anio } })) {
    return { error: `Ya hay una temporada ${anio}.` };
  }
  await prisma.temporadaVotacion.create({ data: { anio, apertura: new Date(apertura) } });
  revalidar();
  return { ok: true };
}

export async function cambiarApertura(
  temporadaId: string,
  formData: FormData,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }
  const apertura = leerFecha(formData.get("apertura"));
  if (!apertura) {
    return { error: "Elegí el día de la apertura." };
  }
  const temporada = await prisma.temporadaVotacion.findUnique({
    where: { id: temporadaId },
    select: { apertura: true },
  });
  if (!temporada) {
    return { error: "La temporada ya no existe." };
  }
  // Una vez abiertos, no se vuelven a cerrar: ya los vio todo el mundo.
  if (estaAbierta(temporada.apertura)) {
    return { error: YA_ABIERTA };
  }
  if (apertura <= hoyArgentina()) {
    return { error: "La apertura tiene que ser un día que todavía no llegó." };
  }
  await prisma.temporadaVotacion.update({
    where: { id: temporadaId },
    data: { apertura: new Date(apertura) },
  });
  revalidar();
  return { ok: true };
}

// Se puede proponer y votar: publicada (o sos admin, que la está preparando) y antes de
// la apertura.
async function temporadaVotable(temporadaId: string, usuario: { esAdmin: boolean }) {
  const temporada = await prisma.temporadaVotacion.findUnique({
    where: { id: temporadaId },
    select: { apertura: true, publicada: true },
  });
  if (!temporada) {
    return "La temporada ya no existe.";
  }
  if (!temporada.publicada && !usuario.esAdmin) {
    return "Los admin de las votaciones están preparando la encuesta.";
  }
  return estaAbierta(temporada.apertura) ? YA_ABIERTA : null;
}

// Publicar: la ven todos y pueden proponer y votar. Ocultar la vuelve a dejar solo
// para el admin.
export async function publicarTemporada(
  temporadaId: string,
  publicar: boolean,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }
  await prisma.temporadaVotacion.update({
    where: { id: temporadaId },
    data: { publicada: publicar },
  });
  revalidar();
  revalidatePath("/");
  return { ok: true };
}

// Cualquiera propone una categoría; la del admin queda aprobada directo.
export async function proponerCategoria(
  temporadaId: string,
  texto: string,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  const error = await temporadaVotable(temporadaId, usuario);
  if (error) {
    return { error };
  }
  const limpio = texto.trim().replace(/\s+/g, " ").slice(0, 60);
  if (!limpio) {
    return { error: 'Escribí la categoría (ej: "El más tomador").' };
  }
  const nombre = limpio[0].toUpperCase() + limpio.slice(1);
  const repetida = await prisma.categoriaVotacion.findFirst({
    where: { temporadaId, nombre: { equals: nombre, mode: "insensitive" } },
    select: { id: true },
  });
  if (repetida) {
    return { error: `Ya está "${nombre}".` };
  }
  await prisma.categoriaVotacion.create({
    data: {
      temporadaId,
      nombre,
      propuestaPorId: usuario.id,
      aprobada: usuario.esAdmin,
    },
  });
  revalidar();
  return { ok: true };
}

export async function aprobarCategoria(categoriaId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }
  await prisma.categoriaVotacion.update({
    where: { id: categoriaId },
    data: { aprobada: true },
  });
  revalidar();
  return { ok: true };
}

// Rechazar una propuesta (el admin o el que la propuso) o sacar una categoría
// aprobada (solo el admin; se van sus votos).
export async function borrarCategoria(categoriaId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: { aprobada: true, propuestaPorId: true, temporada: { select: { apertura: true } } },
  });
  if (!categoria) {
    return { ok: true };
  }
  const puede =
    usuario.esAdmin || (!categoria.aprobada && categoria.propuestaPorId === usuario.id);
  if (!puede) {
    return { error: SOLO_ADMIN };
  }
  if (estaAbierta(categoria.temporada.apertura)) {
    return { error: YA_ABIERTA };
  }
  await prisma.categoriaVotacion.delete({ where: { id: categoriaId } });
  revalidar();
  return { ok: true };
}

// Un voto por categoría; se puede cambiar hasta la apertura. A uno mismo no.
export async function votar(categoriaId: string, votadoId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (votadoId === usuario.id) {
    return { error: "No te podés votar a vos mismo." };
  }
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: { aprobada: true, temporadaId: true },
  });
  if (!categoria || !categoria.aprobada) {
    return { error: "Esa categoría no está para votar." };
  }
  const error = await temporadaVotable(categoria.temporadaId, usuario);
  if (error) {
    return { error };
  }
  const votado = await prisma.user.findUnique({ where: { id: votadoId }, select: { id: true } });
  if (!votado) {
    return { error: "Ese integrante ya no está en el grupo." };
  }
  await prisma.votoVotacion.upsert({
    where: { categoriaId_votanteId: { categoriaId, votanteId: usuario.id } },
    create: { categoriaId, votanteId: usuario.id, votadoId },
    update: { votadoId },
  });
  revalidar();
  return { ok: true };
}
