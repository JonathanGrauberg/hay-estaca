"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { cargarCuentas } from "@/lib/cuentas/datos";
import { encargadoDeJuntada } from "@/lib/cuentas/encargado";
import { parsearPersona, personaId } from "@/lib/cuentas/personas";

// "La casa de la moneda": el encargado divide, se tildan los pagos y el encargado cierra.

function revalidarCuentas(juntadaId: string) {
  revalidatePath(`/juntadas/${juntadaId}`, "layout");
  revalidatePath("/cuentas");
  revalidatePath("/");
}

async function soyEncargado(juntadaId: string, userId: string) {
  return (await encargadoDeJuntada(juntadaId))?.id === userId;
}

// Solo cuando falta encargado (ningún encargado fijo confirmó que va).
export async function hacermeCargo(juntadaId: string, _formData: FormData) {
  const usuario = await requireUsuario();

  if (!(await encargadoDeJuntada(juntadaId))) {
    await prisma.juntada.update({
      where: { id: juntadaId },
      data: { encargadoCuentasId: usuario.id },
    });
  }

  revalidarCuentas(juntadaId);
}

async function cambiarEstado(
  juntadaId: string,
  desde: "abiertas" | "divididas" | "cerradas",
  hacia: "abiertas" | "divididas" | "cerradas"
) {
  const usuario = await requireUsuario();

  if (!(await soyEncargado(juntadaId, usuario.id))) {
    return;
  }

  // Solo se cierra si ya no falta ninguna transferencia.
  if (hacia === "cerradas" && (await cargarCuentas(juntadaId)).transferencias.length > 0) {
    return;
  }

  await prisma.juntada.updateMany({
    where: { id: juntadaId, cuentasEstado: desde },
    data: { cuentasEstado: hacia },
  });

  revalidarCuentas(juntadaId);
}

export async function dividirGastos(juntadaId: string, _formData: FormData) {
  await cambiarEstado(juntadaId, "abiertas", "divididas");
}

// Los pagos ya tildados se mantienen: al volver a dividir se descuentan igual.
export async function volverACargar(juntadaId: string, _formData: FormData) {
  await cambiarEstado(juntadaId, "divididas", "abiertas");
}

export async function cerrarCuentas(juntadaId: string, _formData: FormData) {
  await cambiarEstado(juntadaId, "divididas", "cerradas");
}

export async function reabrirCuentas(juntadaId: string, _formData: FormData) {
  await cambiarEstado(juntadaId, "cerradas", "divididas");
}

// El check verde. Lo pueden tildar el que paga, el que cobra o el encargado. El monto
// sale del cálculo del servidor, no del form.
export async function marcarPagado(juntadaId: string, de: string, a: string, _formData: FormData) {
  const usuario = await requireUsuario();
  const cuentas = await cargarCuentas(juntadaId);
  const yo = personaId({ userId: usuario.id, invitadoId: null });

  const transferencia = cuentas.transferencias.find((t) => t.de === de && t.a === a);
  const deRef = parsearPersona(de);
  const aRef = parsearPersona(a);
  const puede = yo === de || yo === a || cuentas.encargado?.id === usuario.id;

  if (cuentas.estado !== "divididas" || !transferencia || !deRef || !aRef || !puede) {
    return;
  }

  await prisma.pago.create({
    data: {
      juntadaId,
      deUserId: deRef.userId,
      deInvitadoId: deRef.invitadoId,
      aUserId: aRef.userId,
      aInvitadoId: aRef.invitadoId,
      montoCentavos: transferencia.centavos,
    },
  });

  revalidarCuentas(juntadaId);
}

export async function deshacerPago(juntadaId: string, pagoId: string, _formData: FormData) {
  const usuario = await requireUsuario();
  const [cuentas, pago] = await Promise.all([
    cargarCuentas(juntadaId),
    prisma.pago.findFirst({ where: { id: pagoId, juntadaId } }),
  ]);

  if (!pago || cuentas.estado !== "divididas") {
    return;
  }

  const puede =
    pago.deUserId === usuario.id ||
    pago.aUserId === usuario.id ||
    cuentas.encargado?.id === usuario.id;
  if (!puede) {
    return;
  }

  await prisma.pago.delete({ where: { id: pago.id } });

  revalidarCuentas(juntadaId);
}

// Encargados fijos del grupo (Willy, Guichi...). Los elige el admin.
export async function cambiarEncargadoFijo(userId: string, encargado: boolean, _formData: FormData) {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return;
  }

  await prisma.user.update({ where: { id: userId }, data: { encargadoCuentas: encargado } });

  revalidatePath("/", "layout");
}
