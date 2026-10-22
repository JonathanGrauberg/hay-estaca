"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";

export type GuardarJuntadaState = { error: string } | undefined;

async function leerJuntada(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const ubicacion = String(formData.get("ubicacion") ?? "").trim();
  const mensajeFomo = String(formData.get("mensajeFomo") ?? "").trim();
  const anfitrionId = String(formData.get("anfitrionId") ?? "").trim();

  if (!nombre || !fecha || !hora || !ubicacion) {
    return { error: "Completá nombre, fecha, hora y ubicación." } as const;
  }

  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) {
    return { error: "La fecha no es válida." } as const;
  }

  if (anfitrionId && !(await prisma.user.findUnique({ where: { id: anfitrionId } }))) {
    return { error: "Ese anfitrión ya no está en el grupo." } as const;
  }

  return {
    data: {
      nombre,
      fecha: fechaParseada,
      hora,
      ubicacion,
      mensajeFomo: mensajeFomo || null,
      anfitrionId: anfitrionId || null,
    },
  } as const;
}

export async function crearJuntada(
  _prevState: GuardarJuntadaState,
  formData: FormData
): Promise<GuardarJuntadaState> {
  await requireUsuario();

  const resultado = await leerJuntada(formData);
  if (resultado.error !== undefined) {
    return { error: resultado.error };
  }

  const juntada = await prisma.juntada.create({ data: resultado.data });

  revalidatePath("/");
  revalidatePath("/juntadas");
  redirect(`/juntadas/${juntada.id}`);
}

export async function editarJuntada(
  juntadaId: string,
  _prevState: GuardarJuntadaState,
  formData: FormData
): Promise<GuardarJuntadaState> {
  await requireUsuario();

  const resultado = await leerJuntada(formData);
  if (resultado.error !== undefined) {
    return { error: resultado.error };
  }

  await prisma.juntada.update({ where: { id: juntadaId }, data: resultado.data });

  revalidatePath("/");
  revalidatePath("/juntadas");
  revalidatePath(`/juntadas/${juntadaId}`);
  redirect(`/juntadas/${juntadaId}`);
}

// Archivar la saca del inicio y de las listas sin borrar nada (asistencias, checklist,
// y a futuro gastos y estadísticas siguen ahí). Desarchivar la devuelve: el valor de
// "proxima" no importa porque próxima/pasada se calcula por la fecha.
export async function cambiarArchivoJuntada(juntadaId: string, archivar: boolean, _formData: FormData) {
  await requireUsuario();

  await prisma.juntada.update({
    where: { id: juntadaId },
    data: { estado: archivar ? "archivada" : "proxima" },
  });

  revalidatePath("/");
  revalidatePath("/juntadas");
  revalidatePath(`/juntadas/${juntadaId}`);
}

export async function borrarJuntada(juntadaId: string, _formData: FormData) {
  await requireUsuario();

  // Asistencias, checklist, invitados y gastos se borran en cascada (schema).
  await prisma.juntada.delete({ where: { id: juntadaId } });

  revalidatePath("/");
  revalidatePath("/juntadas");
  redirect("/juntadas");
}

export type AgregarInvitadoState = { error: string } | undefined;

export async function agregarInvitado(
  juntadaId: string,
  _prevState: AgregarInvitadoState,
  formData: FormData
): Promise<AgregarInvitadoState> {
  const usuario = await requireUsuario();
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!nombre) {
    return { error: "Escribí el nombre del invitado." };
  }

  await prisma.invitado.create({
    data: { juntadaId, nombre, traidoPorId: usuario.id },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}

export async function borrarInvitado(juntadaId: string, invitadoId: string, _formData: FormData) {
  await requireUsuario();

  await prisma.invitado.deleteMany({ where: { id: invitadoId, juntadaId } });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}
