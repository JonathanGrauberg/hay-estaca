"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { guardarSesion, requireUsuario } from "@/lib/auth";
import { PIN_REGEX, generarPin, hashPin } from "@/lib/auth/pin";

export type CrearIntegranteState = { error: string } | undefined;

// Lo que ve el admin después de sumar a alguien o generarle un PIN nuevo: el PIN en
// claro, una sola vez, para pasárselo por privado (en la base solo queda el hash).
export type AccesoState = { error: string } | { apodo: string; pin: string } | undefined;

const SOLO_ADMIN = "Solo el admin del grupo puede hacer esto.";

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

// Solo el admin suma gente: le pone nombre y apodo, la app le genera el PIN y el admin
// se lo pasa con el botón "Compartir".
export async function crearIntegrante(
  _prevState: AccesoState,
  formData: FormData
): Promise<AccesoState> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }

  const nombre = String(formData.get("nombre") ?? "").trim();
  const apodo = String(formData.get("apodo") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();
  if (!nombre || !apodo) {
    return { error: "Completá nombre y apodo." };
  }

  const pin = generarPin();
  await prisma.user.create({
    data: { nombre, apodo, telefono: telefono || null, pinHash: hashPin(pin) },
  });

  revalidatePath("/", "layout");
  return { apodo, pin };
}

// Para el que se olvidó el PIN (o nunca lo supo): el admin le genera uno nuevo y de
// paso lo desbloquea si se había trabado por intentos fallidos.
export async function generarNuevoPin(
  userId: string,
  _prevState: AccesoState,
  _formData: FormData
): Promise<AccesoState> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }

  const pin = generarPin();
  const integrante = await prisma.user.update({
    where: { id: userId },
    data: { pinHash: hashPin(pin), intentosFallidos: 0, bloqueadoHasta: null },
    select: { apodo: true, nombre: true },
  });

  return { apodo: integrante.apodo || integrante.nombre, pin };
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

  // El que arranca el grupo queda como admin.
  const usuario = await prisma.user.create({ data: { ...resultado.data, esAdmin: true } });
  await guardarSesion(usuario.id);

  redirect("/");
}

export type EditarIntegranteState = { error: string } | { ok: string } | undefined;

// Cada uno edita sus datos (nombre, apodo, teléfono); los de los demás, solo el admin.
// El PIN no se toca acá: lo cambia cada uno desde /perfil o el admin genera uno nuevo.
export async function editarIntegrante(
  userId: string,
  _prevState: EditarIntegranteState,
  formData: FormData
): Promise<EditarIntegranteState> {
  const usuario = await requireUsuario();
  if (userId !== usuario.id && !usuario.esAdmin) {
    return { error: SOLO_ADMIN };
  }

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
  if (!usuario.esAdmin || userId === usuario.id) {
    return;
  }

  // Si pagó gastos no se puede borrar: se romperían las cuentas (el schema lo
  // impide con Restrict). La pantalla ya oculta el botón en ese caso.
  const [gastos, pagos] = await Promise.all([
    prisma.gasto.count({ where: { pagadoPorUserId: userId } }),
    prisma.pago.count({ where: { OR: [{ deUserId: userId }, { aUserId: userId }] } }),
  ]);
  if (gastos + pagos > 0) {
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
