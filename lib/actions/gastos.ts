"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { parsearMonto } from "@/lib/cuentas/dinero";
import { parsearPersona, personaId, type PersonaRef } from "@/lib/cuentas/personas";

function revalidarCuentas(juntadaId: string) {
  revalidatePath(`/juntadas/${juntadaId}`, "layout");
  revalidatePath("/cuentas");
  revalidatePath("/");
}

// Personas válidas de una juntada: todos los integrantes + sus invitados. Cualquier
// persona que venga del form y no esté acá se rechaza (ids inventados, invitados de
// otra juntada).
async function personasDeJuntada(juntadaId: string) {
  const [usuarios, invitados] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.invitado.findMany({ where: { juntadaId }, select: { id: true } }),
  ]);
  return new Set([
    ...usuarios.map((u) => personaId({ userId: u.id, invitadoId: null })),
    ...invitados.map((i) => personaId({ userId: null, invitadoId: i.id })),
  ]);
}

function leerPersona(valor: string, validas: Set<string>): PersonaRef | null {
  return validas.has(valor) ? parsearPersona(valor) : null;
}

export type GuardarGastoState = { error: string } | undefined;

export async function guardarGasto(
  juntadaId: string,
  // null = gasto nuevo.
  gastoId: string | null,
  _prevState: GuardarGastoState,
  formData: FormData
): Promise<GuardarGastoState> {
  await requireUsuario();

  const concepto = String(formData.get("concepto") ?? "").trim();
  const montoCentavos = parsearMonto(String(formData.get("monto") ?? ""));
  const validas = await personasDeJuntada(juntadaId);
  const pagador = leerPersona(String(formData.get("pagadoPor") ?? ""), validas);
  const participantes = [...new Set(formData.getAll("participantes").map(String))]
    .map((valor) => leerPersona(valor, validas))
    .filter((persona): persona is PersonaRef => persona !== null);

  if (!concepto) {
    return { error: "Poné qué se compró (ej: carne, fernet)." };
  }
  if (montoCentavos === null) {
    return { error: "El monto no es válido. Ej: 12500 o 12.500,50." };
  }
  if (!pagador) {
    return { error: "Elegí quién pagó." };
  }
  if (participantes.length === 0) {
    return { error: "Marcá al menos una persona entre la que se divide." };
  }

  const datos = {
    concepto,
    montoCentavos,
    pagadoPorUserId: pagador.userId,
    pagadoPorInvitadoId: pagador.invitadoId,
  };

  if (gastoId) {
    // Se reemplazan los participantes completos: es más simple que calcular el diff
    // y un gasto tiene pocas filas.
    await prisma.$transaction([
      prisma.gasto.update({ where: { id: gastoId, juntadaId }, data: datos }),
      prisma.gastoParticipante.deleteMany({ where: { gastoId } }),
      prisma.gastoParticipante.createMany({
        data: participantes.map((persona) => ({ gastoId, ...persona })),
      }),
    ]);
  } else {
    await prisma.gasto.create({
      data: { juntadaId, ...datos, participantes: { create: participantes } },
    });
  }

  revalidarCuentas(juntadaId);
  redirect(`/juntadas/${juntadaId}/cuentas`);
}

export async function borrarGasto(juntadaId: string, gastoId: string, _formData: FormData) {
  await requireUsuario();

  await prisma.gasto.deleteMany({ where: { id: gastoId, juntadaId } });

  revalidarCuentas(juntadaId);
  redirect(`/juntadas/${juntadaId}/cuentas`);
}

export type BonificarState = { error: string } | undefined;

// Marca a alguien como invitado de honor de la juntada (no paga). Si ya estaba,
// actualiza quién lo cubre.
export async function bonificar(
  juntadaId: string,
  _prevState: BonificarState,
  formData: FormData
): Promise<BonificarState> {
  await requireUsuario();

  const validas = await personasDeJuntada(juntadaId);
  const persona = leerPersona(String(formData.get("persona") ?? ""), validas);
  const cubiertoPor = String(formData.get("cubiertoPor") ?? "");
  const cubridor = cubiertoPor ? leerPersona(cubiertoPor, validas) : null;

  if (!persona) {
    return { error: "Elegí quién no paga." };
  }
  if (cubiertoPor && (!cubridor || !cubridor.userId)) {
    return { error: "Quien cubre tiene que ser un integrante del grupo." };
  }
  if (cubridor?.userId && cubridor.userId === persona.userId) {
    return { error: "No puede cubrirse a sí mismo." };
  }

  const cubiertoPorUserId = cubridor?.userId ?? null;
  const existente = await prisma.bonificado.findFirst({
    where: { juntadaId, userId: persona.userId, invitadoId: persona.invitadoId },
  });

  if (existente) {
    await prisma.bonificado.update({ where: { id: existente.id }, data: { cubiertoPorUserId } });
  } else {
    await prisma.bonificado.create({ data: { juntadaId, ...persona, cubiertoPorUserId } });
  }

  revalidarCuentas(juntadaId);
}

export async function quitarBonificado(juntadaId: string, bonificadoId: string, _formData: FormData) {
  await requireUsuario();

  await prisma.bonificado.deleteMany({ where: { id: bonificadoId, juntadaId } });

  revalidarCuentas(juntadaId);
}
