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

// Una vez divididas, los gastos quedan quietos hasta que el encargado vuelva a abrir
// la carga: si no, las transferencias cambiarían mientras se están pagando.
async function cuentasAbiertas(juntadaId: string) {
  const juntada = await prisma.juntada.findUnique({
    where: { id: juntadaId },
    select: { cuentasEstado: true },
  });
  return juntada?.cuentasEstado === "abiertas";
}

const ERROR_DIVIDIDAS =
  "Las cuentas ya se dividieron: pedile al encargado que vuelva a abrir la carga.";

export type GuardarGastoState = { error: string } | undefined;

export async function guardarGasto(
  juntadaId: string,
  // null = gasto nuevo.
  gastoId: string | null,
  _prevState: GuardarGastoState,
  formData: FormData
): Promise<GuardarGastoState> {
  await requireUsuario();

  if (!(await cuentasAbiertas(juntadaId))) {
    return { error: ERROR_DIVIDIDAS };
  }

  // Vacío = "elegir a mano" (una promo entre 3, o los gastos de antes de las categorías).
  const categoriaId = String(formData.get("categoria") ?? "");
  const categoria = categoriaId
    ? await prisma.categoria.findFirst({ where: { id: categoriaId, juntadaId } })
    : null;
  const concepto = String(formData.get("concepto") ?? "").trim() || categoria?.nombre || "";
  const montoCentavos = parsearMonto(String(formData.get("monto") ?? ""));
  const validas = await personasDeJuntada(juntadaId);
  const pagador = leerPersona(String(formData.get("pagadoPor") ?? ""), validas);
  const participantes = [...new Set(formData.getAll("participantes").map(String))]
    .map((valor) => leerPersona(valor, validas))
    .filter((persona): persona is PersonaRef => persona !== null);

  if (categoriaId && !categoria) {
    return { error: "Esa categoría ya no existe." };
  }
  if (!concepto) {
    return { error: "Poné qué se compró (ej: carne, fernet)." };
  }
  if (montoCentavos === null) {
    return { error: "El monto no es válido. Ej: 12500 o 12.500,50." };
  }
  if (!pagador) {
    return { error: "Elegí quién pagó." };
  }
  if (!categoria && participantes.length === 0) {
    return { error: "Marcá al menos una persona entre la que se divide." };
  }

  const datos = {
    concepto,
    montoCentavos,
    pagadoPorUserId: pagador.userId,
    pagadoPorInvitadoId: pagador.invitadoId,
    categoriaId: categoria?.id ?? null,
  };
  // Con categoría, los participantes salen de la categoría: no se guardan aparte.
  const propios = categoria ? [] : participantes;

  if (gastoId) {
    // Se reemplazan los participantes completos: es más simple que calcular el diff
    // y un gasto tiene pocas filas.
    await prisma.$transaction([
      prisma.gasto.update({ where: { id: gastoId, juntadaId }, data: datos }),
      prisma.gastoParticipante.deleteMany({ where: { gastoId } }),
      prisma.gastoParticipante.createMany({
        data: propios.map((persona) => ({ gastoId, ...persona })),
      }),
    ]);
  } else {
    await prisma.gasto.create({
      data: { juntadaId, ...datos, participantes: { create: propios } },
    });
  }

  revalidarCuentas(juntadaId);
  redirect(`/juntadas/${juntadaId}/cuentas`);
}

export async function borrarGasto(juntadaId: string, gastoId: string, _formData: FormData) {
  await requireUsuario();

  if (await cuentasAbiertas(juntadaId)) {
    await prisma.gasto.deleteMany({ where: { id: gastoId, juntadaId } });
    revalidarCuentas(juntadaId);
  }

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

  if (!(await cuentasAbiertas(juntadaId))) {
    return { error: ERROR_DIVIDIDAS };
  }

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

  if (!(await cuentasAbiertas(juntadaId))) {
    return;
  }

  await prisma.bonificado.deleteMany({ where: { id: bonificadoId, juntadaId } });

  revalidarCuentas(juntadaId);
}

export type CrearCategoriasState = { error: string } | undefined;

// "¿Qué dividimos?": acepta varias separadas por coma ("comida, bebida, picada").
// Arrancan con todos los que confirmaron que van (y los invitados) tildados; si nadie
// confirmó, con todo el grupo. Después se destilda al que no participó.
export async function crearCategorias(
  juntadaId: string,
  _prevState: CrearCategoriasState,
  formData: FormData
): Promise<CrearCategoriasState> {
  await requireUsuario();

  if (!(await cuentasAbiertas(juntadaId))) {
    return { error: ERROR_DIVIDIDAS };
  }

  const existentes = await prisma.categoria.findMany({
    where: { juntadaId },
    select: { nombre: true },
  });
  const yaEstan = new Set(existentes.map((categoria) => categoria.nombre.toLowerCase()));
  const nombres = [
    ...new Map(
      // getAll: llegan el input y, si se tocó una sugerencia, también el botón.
      formData
        .getAll("nombres")
        .map(String)
        .join(",")
        .split(",")
        .map((nombre) => nombre.trim().slice(0, 40))
        .filter((nombre) => nombre && !yaEstan.has(nombre.toLowerCase()))
        .map((nombre) => [nombre.toLowerCase(), nombre[0].toUpperCase() + nombre.slice(1)])
    ).values(),
  ];

  if (nombres.length === 0) {
    return { error: "Escribí qué se divide (ej: comida, bebida) o una que no esté." };
  }

  const [usuarios, confirmados, invitados] = await Promise.all([
    prisma.user.findMany({ select: { id: true } }),
    prisma.asistencia.findMany({ where: { juntadaId, estado: "voy" }, select: { userId: true } }),
    prisma.invitado.findMany({ where: { juntadaId }, select: { id: true } }),
  ]);
  const integrantes =
    confirmados.length > 0 ? confirmados.map((a) => a.userId) : usuarios.map((u) => u.id);
  const participantes = [
    ...integrantes.map((userId) => ({ userId, invitadoId: null })),
    ...invitados.map((invitado) => ({ userId: null, invitadoId: invitado.id })),
  ];

  await prisma.$transaction(
    nombres.map((nombre) =>
      prisma.categoria.create({
        data: { juntadaId, nombre, participantes: { create: participantes } },
      })
    )
  );

  revalidarCuentas(juntadaId);
}

export async function borrarCategoria(juntadaId: string, categoriaId: string, _formData: FormData) {
  await requireUsuario();

  // Si tiene gastos no se borra: quedarían sin saber entre quiénes se dividen.
  const gastos = await prisma.gasto.count({ where: { categoriaId } });
  if (gastos > 0 || !(await cuentasAbiertas(juntadaId))) {
    return;
  }

  await prisma.categoria.deleteMany({ where: { id: categoriaId, juntadaId } });

  revalidarCuentas(juntadaId);
}

async function categoriaYPersonas(juntadaId: string, categoriaId: string) {
  const [categoria, validas] = await Promise.all([
    prisma.categoria.findFirst({ where: { id: categoriaId, juntadaId }, select: { id: true } }),
    personasDeJuntada(juntadaId),
  ]);
  return { categoria, validas };
}

// Tilda o destilda a una persona de una categoría. Recibe el estado final (no
// "alternar") para que dos toques rápidos o dos celulares a la vez no se pisen.
export async function marcarEnCategoria(
  juntadaId: string,
  categoriaId: string,
  persona: string,
  incluido: boolean
) {
  await requireUsuario();

  if (!(await cuentasAbiertas(juntadaId))) {
    return;
  }

  const { categoria, validas } = await categoriaYPersonas(juntadaId, categoriaId);
  const ref = leerPersona(persona, validas);
  if (!categoria || !ref) {
    return;
  }

  const donde = { categoriaId, userId: ref.userId, invitadoId: ref.invitadoId };
  if (incluido) {
    const existente = await prisma.categoriaParticipante.findFirst({ where: donde });
    if (!existente) {
      await prisma.categoriaParticipante.create({ data: donde });
    }
  } else {
    await prisma.categoriaParticipante.deleteMany({ where: donde });
  }

  revalidarCuentas(juntadaId);
}

// Atajos "Todos" / "Nadie" de una categoría.
export async function marcarTodosEnCategoria(
  juntadaId: string,
  categoriaId: string,
  personas: string[]
) {
  await requireUsuario();

  if (!(await cuentasAbiertas(juntadaId))) {
    return;
  }

  const { categoria, validas } = await categoriaYPersonas(juntadaId, categoriaId);
  if (!categoria) {
    return;
  }
  const refs = [...new Set(personas)]
    .map((valor) => leerPersona(valor, validas))
    .filter((persona): persona is PersonaRef => persona !== null);

  await prisma.$transaction([
    prisma.categoriaParticipante.deleteMany({ where: { categoriaId } }),
    prisma.categoriaParticipante.createMany({
      data: refs.map((ref) => ({ categoriaId, ...ref })),
    }),
  ]);

  revalidarCuentas(juntadaId);
}
