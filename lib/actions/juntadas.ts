"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { puedeModificarJuntada, SOLO_LOS_QUE_VAN } from "@/lib/juntadas/permisos";
import { instanteArgentina } from "@/lib/juntadas/horario";

export type GuardarJuntadaState = { error: string } | undefined;

async function leerJuntada(formData: FormData) {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const ubicacion = String(formData.get("ubicacion") ?? "").trim();
  const mensajeFomo = String(formData.get("mensajeFomo") ?? "").trim();
  const anfitrionId = String(formData.get("anfitrionId") ?? "").trim();
  const fechaFinTexto = String(formData.get("fechaFin") ?? "").trim();
  const horaFin = String(formData.get("horaFin") ?? "").trim();

  if (!nombre || !fecha || !hora || !ubicacion) {
    return { error: "Completá nombre, fecha, hora y ubicación." } as const;
  }

  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) {
    return { error: "La fecha no es válida." } as const;
  }

  // Fin opcional. Con solo la hora: el mismo día, o el siguiente si es más temprano
  // que el comienzo (un asado de las 21 que termina a las 4).
  let fechaFin: Date | null = null;
  if (horaFin) {
    if (fechaFinTexto) {
      fechaFin = new Date(fechaFinTexto);
    } else {
      fechaFin = new Date(fechaParseada);
      if (horaFin <= hora) {
        fechaFin.setUTCDate(fechaFin.getUTCDate() + 1);
      }
    }
    if (
      Number.isNaN(fechaFin.getTime()) ||
      instanteArgentina(fechaFin, horaFin) <= instanteArgentina(fechaParseada, hora)
    ) {
      return { error: "La juntada tiene que terminar después de empezar." } as const;
    }
  } else if (fechaFinTexto) {
    return { error: "Poné también a qué hora termina." } as const;
  }

  if (anfitrionId && !(await prisma.user.findUnique({ where: { id: anfitrionId } }))) {
    return { error: "Ese anfitrión ya no está en el grupo." } as const;
  }

  return {
    data: {
      nombre,
      fecha: fechaParseada,
      hora,
      fechaFin,
      horaFin: horaFin || null,
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
  const usuario = await requireUsuario();

  const resultado = await leerJuntada(formData);
  if (resultado.error !== undefined) {
    return { error: resultado.error };
  }

  // El que la crea queda como que va: si no, no la podría ni editar.
  const juntada = await prisma.juntada.create({
    data: {
      ...resultado.data,
      asistencias: { create: { userId: usuario.id, estado: "voy", respondidoAt: new Date() } },
    },
  });

  revalidatePath("/");
  revalidatePath("/juntadas");
  redirect(`/juntadas/${juntada.id}`);
}

export async function editarJuntada(
  juntadaId: string,
  _prevState: GuardarJuntadaState,
  formData: FormData
): Promise<GuardarJuntadaState> {
  const usuario = await requireUsuario();
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }

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
  const usuario = await requireUsuario();
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return;
  }

  await prisma.juntada.update({
    where: { id: juntadaId },
    data: { estado: archivar ? "archivada" : "proxima" },
  });

  revalidatePath("/");
  revalidatePath("/juntadas");
  revalidatePath(`/juntadas/${juntadaId}`);
}

// Borrar es para siempre: solo el admin del grupo. Los demás pueden archivarla.
export async function borrarJuntada(juntadaId: string, _formData: FormData) {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return;
  }

  // Asistencias, checklist, invitados, gastos, historias, encuestas y partidas se
  // borran en cascada (schema).
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
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }
  const nombre = String(formData.get("nombre") ?? "").trim();

  if (!nombre) {
    return { error: "Escribí el nombre del invitado." };
  }

  await prisma.invitado.create({
    data: { juntadaId, nombre, traidoPorId: usuario.id },
  });

  revalidatePath(`/juntadas/${juntadaId}`, "layout");
  revalidatePath("/");
}

export async function borrarInvitado(juntadaId: string, invitadoId: string, _formData: FormData) {
  const usuario = await requireUsuario();
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return;
  }

  // Si pagó algún gasto no se puede sacar (rompería las cuentas); la pantalla ya
  // oculta la X en ese caso.
  const [gastos, pagos] = await Promise.all([
    prisma.gasto.count({ where: { pagadoPorInvitadoId: invitadoId } }),
    prisma.pago.count({ where: { OR: [{ deInvitadoId: invitadoId }, { aInvitadoId: invitadoId }] } }),
  ]);
  if (gastos + pagos > 0) {
    return;
  }

  await prisma.invitado.deleteMany({ where: { id: invitadoId, juntadaId } });

  revalidatePath(`/juntadas/${juntadaId}`, "layout");
  revalidatePath("/");
}
