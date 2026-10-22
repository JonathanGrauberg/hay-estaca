"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { borrarSesion, guardarSesion, requireUsuario } from "@/lib/auth";
import { PIN_REGEX, hashPin, verificarPin } from "@/lib/auth/pin";

const MAX_INTENTOS = 5;
const BLOQUEO_MS = 5 * 60 * 1000;

export type IniciarSesionState = { error: string } | undefined;

export async function iniciarSesion(
  _prevState: IniciarSesionState,
  formData: FormData
): Promise<IniciarSesionState> {
  const userId = String(formData.get("userId") ?? "");
  const pin = String(formData.get("pin") ?? "").trim();

  if (!userId) {
    return { error: "Elegí quién sos." };
  }
  if (!PIN_REGEX.test(pin)) {
    return { error: "El PIN tiene que tener 4 números." };
  }

  const usuario = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, pinHash: true, intentosFallidos: true, bloqueadoHasta: true },
  });
  if (!usuario) {
    return { error: "Ese integrante ya no existe." };
  }

  if (usuario.bloqueadoHasta && usuario.bloqueadoHasta > new Date()) {
    const minutos = Math.ceil((usuario.bloqueadoHasta.getTime() - Date.now()) / 60_000);
    return { error: `Demasiados intentos. Probá de nuevo en ${minutos} min.` };
  }

  if (!verificarPin(pin, usuario.pinHash)) {
    const intentos = usuario.intentosFallidos + 1;
    const bloquear = intentos >= MAX_INTENTOS;
    await prisma.user.update({
      where: { id: usuario.id },
      data: bloquear
        ? { intentosFallidos: 0, bloqueadoHasta: new Date(Date.now() + BLOQUEO_MS) }
        : { intentosFallidos: intentos },
    });
    return {
      error: bloquear
        ? "Demasiados intentos. Probá de nuevo en 5 min."
        : "PIN incorrecto.",
    };
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadoHasta: null },
  });
  await guardarSesion(usuario.id);
  redirect("/");
}

export async function cerrarSesion() {
  await borrarSesion();
  redirect("/login");
}

export type CambiarPinState = { error: string } | { ok: string } | undefined;

export async function cambiarPin(
  _prevState: CambiarPinState,
  formData: FormData
): Promise<CambiarPinState> {
  const usuario = await requireUsuario();
  const pinActual = String(formData.get("pinActual") ?? "").trim();
  const pinNuevo = String(formData.get("pinNuevo") ?? "").trim();

  if (!PIN_REGEX.test(pinNuevo)) {
    return { error: "El PIN nuevo tiene que tener 4 números." };
  }

  const { pinHash } = await prisma.user.findUniqueOrThrow({
    where: { id: usuario.id },
    select: { pinHash: true },
  });
  if (!verificarPin(pinActual, pinHash)) {
    return { error: "El PIN actual no es correcto." };
  }

  await prisma.user.update({
    where: { id: usuario.id },
    data: { pinHash: hashPin(pinNuevo) },
  });
  return { ok: "Listo, PIN cambiado." };
}
