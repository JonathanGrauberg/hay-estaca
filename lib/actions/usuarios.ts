"use server";

import { revalidatePath } from "next/cache";
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

  revalidatePath("/", "layout");
  redirect("/integrantes");
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

export type EditarIntegranteState = { error: string } | { ok: string } | undefined;

// Grupo de confianza: cualquiera puede corregir los datos de cualquiera (nombre,
// apodo, teléfono). El PIN no se toca acá: solo lo cambia cada uno desde /perfil.
export async function editarIntegrante(
  userId: string,
  _prevState: EditarIntegranteState,
  formData: FormData
): Promise<EditarIntegranteState> {
  await requireUsuario();

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apodo = String(formData.get("apodo") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!nombre || !apodo) {
    return { error: "Completá nombre y apodo." };
  }

  await prisma.user.update({
    where: { id: userId },
    data: { nombre, apodo, telefono: telefono || null },
  });

  revalidatePath("/", "layout");
  return { ok: "Guardado." };
}

export async function borrarIntegrante(userId: string, _formData: FormData) {
  const usuario = await requireUsuario();

  // Borrarse a uno mismo dejaría la sesión colgada (y podría dejar el grupo vacío).
  if (userId === usuario.id) {
    return;
  }

  // Si pagó gastos no se puede borrar: se romperían las cuentas (el schema lo
  // impide con Restrict). La pantalla ya oculta el botón en ese caso.
  if ((await prisma.gasto.count({ where: { pagadoPorUserId: userId } })) > 0) {
    return;
  }

  // Asistencias y participaciones se borran en cascada; checklist, anfitrión e
  // invitados traídos quedan sin asignar (SetNull).
  await prisma.user.delete({ where: { id: userId } });

  revalidatePath("/", "layout");
  redirect("/integrantes");
}

export type GuardarAliasState = { error: string } | { ok: string } | undefined;

// El alias/CVU solo lo cambia su dueño: es a dónde le van a transferir plata, así
// que nadie más puede tocarlo (a diferencia de nombre/apodo/teléfono).
export async function guardarAlias(
  _prevState: GuardarAliasState,
  formData: FormData
): Promise<GuardarAliasState> {
  const usuario = await requireUsuario();
  const aliasCvu = String(formData.get("aliasCvu") ?? "").trim();

  if (aliasCvu && !/^(\d{22}|[A-Za-z0-9.-]{6,20})$/.test(aliasCvu)) {
    return { error: "Tiene que ser un alias (6 a 20 letras, números, puntos o guiones) o un CVU/CBU de 22 números." };
  }

  await prisma.user.update({ where: { id: usuario.id }, data: { aliasCvu: aliasCvu || null } });

  revalidatePath("/", "layout");
  return { ok: aliasCvu ? "Alias guardado." : "Alias borrado." };
}
