"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import {
  puedeModificarJuntada,
  SOLO_LOS_QUE_VAN,
} from "@/lib/juntadas/permisos";
import { elegiblesEncuesta } from "@/lib/encuestas/datos";

export type ResultadoEncuesta = { error: string } | { ok: true };

const MAX_OPCIONES = 12;

function revalidarJuntada(juntadaId: string) {
  revalidatePath(`/juntadas/${juntadaId}`, "layout");
}

function limpiar(texto: FormDataEntryValue | string | null, largo: number) {
  return String(texto ?? "")
    .trim()
    .replace(/\s+/g, " ")
    .slice(0, largo);
}

// Crea una encuesta. Si viene soloDeOpcionId es una segunda vuelta: solo la votan los
// que eligieron esa opción (ej: "¿Cuántas promos?" para los que dijeron "Me sumo").
export async function crearEncuesta(
  juntadaId: string,
  formData: FormData,
): Promise<ResultadoEncuesta> {
  const usuario = await requireUsuario();
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }

  const pregunta = limpiar(formData.get("pregunta"), 140);
  if (!pregunta) {
    return { error: "Escribí la pregunta." };
  }
  const opciones: string[] = [];
  for (const valor of formData.getAll("opcion")) {
    const texto = limpiar(valor, 60);
    if (!texto) {
      continue;
    }
    if (opciones.some((o) => o.toLowerCase() === texto.toLowerCase())) {
      return { error: `La opción "${texto}" está repetida.` };
    }
    opciones.push(texto);
  }
  if (opciones.length < 2) {
    return { error: "Poné al menos dos opciones." };
  }
  if (opciones.length > MAX_OPCIONES) {
    return { error: `Como mucho ${MAX_OPCIONES} opciones.` };
  }

  const soloDeOpcionId = limpiar(formData.get("soloDeOpcionId"), 40) || null;
  if (soloDeOpcionId) {
    const opcion = await prisma.opcionEncuesta.findUnique({
      where: { id: soloDeOpcionId },
      select: {
        encuesta: { select: { juntadaId: true } },
        _count: { select: { votos: true } },
      },
    });
    if (!opcion || opcion.encuesta.juntadaId !== juntadaId) {
      return { error: "La opción de la encuesta anterior ya no existe." };
    }
    if (opcion._count.votos === 0) {
      return { error: "Nadie eligió esa opción todavía." };
    }
  }

  await prisma.encuesta.create({
    data: {
      juntadaId,
      creadaPorId: usuario.id,
      pregunta,
      multiple: formData.get("multiple") === "on",
      soloDeOpcionId,
      opciones: {
        create: opciones.map((texto, orden) => ({ texto, orden })),
      },
    },
  });
  revalidarJuntada(juntadaId);
  return { ok: true };
}

// Reemplaza los votos del usuario por los que mande (vacío = sacar el voto).
export async function votarEncuesta(
  encuestaId: string,
  opcionIds: string[],
): Promise<ResultadoEncuesta> {
  const usuario = await requireUsuario();
  const encuesta = await prisma.encuesta.findUnique({
    where: { id: encuestaId },
    select: {
      juntadaId: true,
      soloDeOpcionId: true,
      multiple: true,
      cerradaAt: true,
      opciones: { select: { id: true } },
    },
  });
  if (!encuesta) {
    return { error: "La encuesta ya no existe." };
  }
  if (encuesta.cerradaAt) {
    return { error: "La encuesta ya se cerró." };
  }
  const elegibles = await elegiblesEncuesta(encuesta);
  if (!elegibles.some((e) => e.id === usuario.id)) {
    return {
      error: encuesta.soloDeOpcionId
        ? "Esta la votan solo los que eligieron esa opción en la encuesta anterior."
        : "Votan los que van a la juntada. Confirmá que vas.",
    };
  }
  const validas = new Set(encuesta.opciones.map((o) => o.id));
  const elegidas = [...new Set(opcionIds)];
  if (elegidas.some((id) => !validas.has(id))) {
    return { error: "Esa opción no es de esta encuesta." };
  }
  if (!encuesta.multiple && elegidas.length > 1) {
    return { error: "En esta encuesta se elige una sola opción." };
  }

  await prisma.$transaction([
    prisma.votoEncuesta.deleteMany({
      where: { encuestaId, userId: usuario.id },
    }),
    prisma.votoEncuesta.createMany({
      data: elegidas.map((opcionId) => ({
        encuestaId,
        opcionId,
        userId: usuario.id,
      })),
    }),
    // Toca updatedAt para que los que miran se enteren.
    prisma.encuesta.update({
      where: { id: encuestaId },
      data: { updatedAt: new Date() },
    }),
  ]);
  revalidarJuntada(encuesta.juntadaId);
  return { ok: true };
}

async function encuestaQueAdministro(encuestaId: string) {
  const usuario = await requireUsuario();
  const encuesta = await prisma.encuesta.findUnique({
    where: { id: encuestaId },
    select: { juntadaId: true, creadaPorId: true },
  });
  if (!encuesta) {
    return { error: "La encuesta ya no existe." } as const;
  }
  if (!usuario.esAdmin && encuesta.creadaPorId !== usuario.id) {
    return { error: "Solo el que la creó la puede cerrar o borrar." } as const;
  }
  return encuesta;
}

// Cerrar: no se vota más y queda el resultado. Se puede reabrir.
export async function cerrarEncuesta(
  encuestaId: string,
  cerrar: boolean,
): Promise<ResultadoEncuesta> {
  const encuesta = await encuestaQueAdministro(encuestaId);
  if ("error" in encuesta) {
    return encuesta;
  }
  await prisma.encuesta.update({
    where: { id: encuestaId },
    data: { cerradaAt: cerrar ? new Date() : null },
  });
  revalidarJuntada(encuesta.juntadaId);
  return { ok: true };
}

export async function borrarEncuesta(
  encuestaId: string,
): Promise<ResultadoEncuesta> {
  const encuesta = await encuestaQueAdministro(encuestaId);
  if ("error" in encuesta) {
    return encuesta;
  }
  await prisma.encuesta.delete({ where: { id: encuestaId } });
  revalidarJuntada(encuesta.juntadaId);
  return { ok: true };
}

async function opcionConVotantes(opcionId: string) {
  return prisma.opcionEncuesta.findUnique({
    where: { id: opcionId },
    select: {
      encuesta: { select: { juntadaId: true } },
      votos: { select: { userId: true } },
    },
  });
}

// Los que eligieron la opción pasan a una categoría nueva de las cuentas, ya tildados
// (ej: "Fernet" con los 5 que se sumaron). El gasto se carga después como siempre.
export async function pasarOpcionACuentas(
  opcionId: string,
  texto: string,
): Promise<ResultadoEncuesta> {
  const usuario = await requireUsuario();
  const opcion = await opcionConVotantes(opcionId);
  if (!opcion) {
    return { error: "La opción ya no existe." };
  }
  const { juntadaId } = opcion.encuesta;
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }
  if (opcion.votos.length === 0) {
    return { error: "Nadie eligió esta opción." };
  }
  const juntada = await prisma.juntada.findUnique({
    where: { id: juntadaId },
    select: { cuentasEstado: true },
  });
  if (juntada?.cuentasEstado !== "abiertas") {
    return {
      error:
        "Las cuentas ya se dividieron: pedile al encargado que vuelva a abrir la carga.",
    };
  }
  const limpio = limpiar(texto, 40);
  if (!limpio) {
    return { error: "Escribí el nombre de la categoría (ej: Fernet)." };
  }
  const nombre = limpio[0].toUpperCase() + limpio.slice(1);
  const repetida = await prisma.categoria.findFirst({
    where: { juntadaId, nombre: { equals: nombre, mode: "insensitive" } },
    select: { id: true },
  });
  if (repetida) {
    return { error: `Ya hay una categoría ${nombre}: poné otro nombre.` };
  }

  await prisma.categoria.create({
    data: {
      juntadaId,
      nombre,
      participantes: {
        create: opcion.votos.map((v) => ({ userId: v.userId })),
      },
    },
  });
  revalidarJuntada(juntadaId);
  revalidatePath("/cuentas");
  return { ok: true };
}

// "¿Quién la compra?": queda como tarea del checklist asignada a esa persona.
export async function encargarCompra(
  opcionId: string,
  userId: string,
  texto: string,
): Promise<ResultadoEncuesta> {
  const usuario = await requireUsuario();
  const opcion = await opcionConVotantes(opcionId);
  if (!opcion) {
    return { error: "La opción ya no existe." };
  }
  const { juntadaId } = opcion.encuesta;
  if (!(await puedeModificarJuntada(juntadaId, usuario))) {
    return { error: SOLO_LOS_QUE_VAN };
  }
  const descripcion = limpiar(texto, 120);
  if (!descripcion) {
    return { error: "Escribí qué hay que comprar." };
  }
  const encargado = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, esAdmin: true },
  });
  if (!encargado || !(await puedeModificarJuntada(juntadaId, encargado))) {
    return { error: "El encargado tiene que ser alguien que va a la juntada." };
  }

  await prisma.checklistItem.create({
    data: {
      juntadaId,
      descripcion,
      tipo: "grupal",
      asignadoAUserId: encargado.id,
    },
  });
  revalidarJuntada(juntadaId);
  revalidatePath("/");
  return { ok: true };
}
