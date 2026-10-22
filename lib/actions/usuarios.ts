"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardarSesion, requireUsuario } from "@/lib/auth";
import { PIN_REGEX, hashPin } from "@/lib/auth/pin";

export type CrearIntegranteState = { error: string } | undefined;

type DatosIntegrante = {
  nombre: string;
  apodo: string;
  telefono: string | null;
  pinHash: string;
};

function leerIntegrante(formData: FormData): { error: string } | { data: DatosIntegrante } {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apodo = String(formData.get("apodo") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  const pin = String(formData.get("pin") ?? "").trim();

  if (!nombre || !apodo) {
    return { error: "Completá nombre y apodo." };
  }
  if (!PIN_REGEX.test(pin)) {
    return { error: "El PIN tiene que tener 4 números." };
  }

  return {
    data: { nombre, apodo, telefono: telefono || null, pinHash: hashPin(pin) },
  };
}

export async function crearIntegrante(
  _prevState: CrearIntegranteState,
  formData: FormData
): Promise<CrearIntegranteState> {
  await requireUsuario();

  const resultado = leerIntegrante(formData);
  if ("error" in resultado) {
    return { error: resultado.error };
  }

  await prisma.user.create({ data: resultado.data });

  redirect("/perfil");
}

// Solo para arrancar con la base vacía: el primero en entrar se crea a sí mismo y
// queda logueado. Apenas existe un integrante, esta acción deja de funcionar.
export async function crearPrimerIntegrante(
  _prevState: CrearIntegranteState,
  formData: FormData
): Promise<CrearIntegranteState> {
  if ((await prisma.user.count()) > 0) {
    return { error: "El grupo ya tiene integrantes: entrá con tu PIN." };
  }

  const resultado = leerIntegrante(formData);
  if ("error" in resultado) {
    return { error: resultado.error };
  }

  const usuario = await prisma.user.create({ data: resultado.data });
  await guardarSesion(usuario.id);

  redirect("/");
}
