"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import {
  puedeModificarJuntada,
  SOLO_LOS_QUE_VAN,
} from "@/lib/juntadas/permisos";
import { parsearPersona } from "@/lib/cuentas/personas";
import {
  leerPartidaTruco,
  puedeAnotar,
  type PartidaTrucoVista,
} from "@/lib/juegos/partida-truco";
import type { Equipo } from "@/lib/juegos/truco";

export type CrearPartidaState = { error: string } | undefined;

function revalidarTruco(juntadaId: string) {
  revalidatePath(`/juntadas/${juntadaId}`, "layout");
}

function nombreEquipo(valor: FormDataEntryValue | null, porDefecto: string) {
  const nombre = String(valor ?? "")
    .trim()
    .slice(0, 24);
  return nombre || porDefecto;
}

// Arma la partida: equipos (miembros o invitados de la juntada), a cuánto y quién anota.
export async function crearPartidaTruco(
  juntadaId: string,
  _prev: CrearPartidaState,
  formData: FormData,
): Promise<CrearPartidaState> {
  const usuario = await requireUsuario();
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }

  const limite = Number(formData.get("limite")) === 15 ? 15 : 30;
  const nombreNos = nombreEquipo(formData.get("nombreNos"), "Nosotros");
  const nombreEllos = nombreEquipo(formData.get("nombreEllos"), "Ellos");
  if (nombreNos.toLowerCase() === nombreEllos.toLowerCase()) {
    return { error: "Los dos equipos no pueden llamarse igual." };
  }

  const elegidos = new Map<string, Equipo>();
  for (const equipo of ["nos", "ellos"] as const) {
    for (const valor of formData.getAll(equipo)) {
      const clave = String(valor);
      if (elegidos.has(clave)) {
        return { error: "Alguien quedó en los dos equipos." };
      }
      elegidos.set(clave, equipo);
    }
  }
  const jugadores = [...elegidos].map(([clave, equipo]) => ({
    equipo,
    ref: parsearPersona(clave),
  }));
  if (jugadores.some((j) => !j.ref)) {
    return { error: "Hay un jugador que no se reconoce." };
  }
  for (const equipo of ["nos", "ellos"] as const) {
    if (!jugadores.some((j) => j.equipo === equipo)) {
      return { error: "Cada equipo necesita al menos un jugador." };
    }
  }

  // Los jugadores tienen que ser del grupo o invitados de esta juntada.
  const userIds = jugadores.flatMap((j) =>
    j.ref?.userId ? [j.ref.userId] : [],
  );
  const invitadoIds = jugadores.flatMap((j) =>
    j.ref?.invitadoId ? [j.ref.invitadoId] : [],
  );
  const [usuarios, invitados] = await Promise.all([
    prisma.user.count({ where: { id: { in: userIds } } }),
    prisma.invitado.count({ where: { id: { in: invitadoIds }, juntadaId } }),
  ]);
  if (usuarios !== userIds.length || invitados !== invitadoIds.length) {
    return { error: "Hay un jugador que no es de esta juntada." };
  }

  const anotadorId = String(formData.get("anotador") ?? "");
  const anotador = await prisma.user.findUnique({
    where: { id: anotadorId },
    select: { id: true, esAdmin: true },
  });
  if (!anotador || !(await puedeModificarJuntada(juntadaId, anotador))) {
    return { error: "El anotador tiene que ser alguien que va a la juntada." };
  }

  const partida = await prisma.partidaTruco.create({
    data: {
      juntadaId,
      limite,
      nombreNos,
      nombreEllos,
      anotadorId: anotador.id,
      jugadores: {
        create: jugadores.map((j) => ({
          equipo: j.equipo,
          userId: j.ref?.userId ?? null,
          invitadoId: j.ref?.invitadoId ?? null,
        })),
      },
    },
    select: { id: true },
  });

  revalidarTruco(juntadaId);
  redirect(`/juntadas/${juntadaId}/truco/${partida.id}`);
}

export type AnotarResultado = { error: string } | PartidaTrucoVista;

// Suma o resta puntos. Solo el anotador (o el admin): así no se pisan. Se lee y se
// escribe en una transacción para que dos toques seguidos no se pierdan.
export async function anotarTruco(
  partidaId: string,
  equipo: Equipo,
  delta: number,
): Promise<AnotarResultado> {
  const usuario = await requireUsuario();
  if (equipo !== "nos" && equipo !== "ellos") {
    return { error: "Equipo inválido." };
  }
  if (!Number.isInteger(delta) || delta === 0 || Math.abs(delta) > 4) {
    return { error: "Puntos inválidos." };
  }

  const error = await prisma.$transaction(async (tx) => {
    const partida = await tx.partidaTruco.findUnique({
      where: { id: partidaId },
      select: {
        anotadorId: true,
        limite: true,
        puntosNos: true,
        puntosEllos: true,
      },
    });
    if (!partida) {
      return "La partida ya no existe.";
    }
    if (
      !puedeAnotar(
        { anotador: partida.anotadorId ? { id: partida.anotadorId } : null },
        usuario,
      )
    ) {
      return "Solo anota el anotador de la partida.";
    }
    const campo = equipo === "nos" ? "puntosNos" : "puntosEllos";
    const puntos = Math.min(
      Math.max(partida[campo] + delta, 0),
      partida.limite,
    );
    const otro = equipo === "nos" ? partida.puntosEllos : partida.puntosNos;
    const terminada = puntos >= partida.limite || otro >= partida.limite;
    await tx.partidaTruco.update({
      where: { id: partidaId },
      data: { [campo]: puntos, terminadaAt: terminada ? new Date() : null },
    });
    return null;
  });
  if (error) {
    return { error };
  }

  const vista = await leerPartidaTruco(partidaId);
  if (!vista) {
    return { error: "La partida ya no existe." };
  }
  return vista;
}

// Pasa el anotador a otro que va a la juntada. Lo hace el anotador o el admin; si la
// partida se quedó sin anotador, lo puede tomar cualquiera de los que van.
export async function cambiarAnotadorTruco(
  partidaId: string,
  nuevoId: string,
): Promise<{ error: string } | { ok: true }> {
  const usuario = await requireUsuario();
  const partida = await prisma.partidaTruco.findUnique({
    where: { id: partidaId },
    select: { juntadaId: true, anotadorId: true },
  });
  if (!partida) {
    return { error: "La partida ya no existe." };
  }
  const puede =
    usuario.esAdmin ||
    partida.anotadorId === usuario.id ||
    (partida.anotadorId === null &&
      nuevoId === usuario.id &&
      (await puedeModificarJuntada(partida.juntadaId, usuario)));
  if (!puede) {
    return { error: "Solo el anotador puede pasarle la anotación a otro." };
  }
  const nuevo = await prisma.user.findUnique({
    where: { id: nuevoId },
    select: { id: true, esAdmin: true },
  });
  if (!nuevo || !(await puedeModificarJuntada(partida.juntadaId, nuevo))) {
    return { error: "El anotador tiene que ser alguien que va a la juntada." };
  }
  await prisma.partidaTruco.update({
    where: { id: partidaId },
    data: { anotadorId: nuevo.id },
  });
  revalidarTruco(partida.juntadaId);
  return { ok: true };
}

// Otra partida con los mismos equipos y el mismo anotador.
export async function revanchaTruco(partidaId: string) {
  const usuario = await requireUsuario();
  const partida = await prisma.partidaTruco.findUnique({
    where: { id: partidaId },
    include: { jugadores: true },
  });
  if (!partida) {
    redirect("/juntadas");
  }
  const vista = {
    anotador: partida.anotadorId ? { id: partida.anotadorId } : null,
  };
  if (!puedeAnotar(vista, usuario)) {
    redirect(`/juntadas/${partida.juntadaId}/truco/${partida.id}`);
  }
  const nueva = await prisma.partidaTruco.create({
    data: {
      juntadaId: partida.juntadaId,
      limite: partida.limite,
      nombreNos: partida.nombreNos,
      nombreEllos: partida.nombreEllos,
      anotadorId: partida.anotadorId,
      jugadores: {
        create: partida.jugadores.map((j) => ({
          equipo: j.equipo,
          userId: j.userId,
          invitadoId: j.invitadoId,
        })),
      },
    },
    select: { id: true },
  });
  revalidarTruco(partida.juntadaId);
  redirect(`/juntadas/${partida.juntadaId}/truco/${nueva.id}`);
}

// Borra una partida (ej: se armó mal). El anotador o el admin.
export async function borrarPartidaTruco(partidaId: string) {
  const usuario = await requireUsuario();
  const partida = await prisma.partidaTruco.findUnique({
    where: { id: partidaId },
    select: { juntadaId: true, anotadorId: true },
  });
  if (!partida) {
    redirect("/juntadas");
  }
  const vista = {
    anotador: partida.anotadorId ? { id: partida.anotadorId } : null,
  };
  if (puedeAnotar(vista, usuario)) {
    await prisma.partidaTruco.delete({ where: { id: partidaId } });
    revalidarTruco(partida.juntadaId);
  }
  redirect(`/juntadas/${partida.juntadaId}/truco`);
}
