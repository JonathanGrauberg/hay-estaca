"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import {
  esAdminVotaciones,
  estaAbierta,
  hoyArgentina,
  votacionCerrada,
} from "@/lib/votaciones/datos";

export type ResultadoVotacion = { error: string } | { ok: true };

const SOLO_ADMIN = "Solo los admin de las votaciones pueden hacer esto.";
const YA_CERRADA = "La votación ya cerró.";
const PREPARANDO = "Los admin de las votaciones están preparando la encuesta.";
const EN_PRUEBA = "Están probando la revelación: terminá la prueba primero.";

function revalidar() {
  revalidatePath("/votaciones");
}

function leerFecha(valor: FormDataEntryValue | null) {
  const texto = String(valor ?? "");
  return /^\d{4}-\d{2}-\d{2}$/.test(texto) ? texto : null;
}

function limpiarNombre(texto: string) {
  const limpio = texto.trim().replace(/\s+/g, " ").slice(0, 60);
  return limpio ? limpio[0].toUpperCase() + limpio.slice(1) : null;
}

async function nombreRepetido(temporadaId: string, nombre: string, salvoId?: string) {
  const repetida = await prisma.categoriaVotacion.findFirst({
    where: {
      temporadaId,
      nombre: { equals: nombre, mode: "insensitive" },
      ...(salvoId ? { id: { not: salvoId } } : {}),
    },
    select: { id: true },
  });
  return repetida ? `Ya está "${nombre}".` : null;
}

// Un admin arranca la temporada del año con el día de la despedida (cierre de la
// votación).
export async function crearTemporada(formData: FormData): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!esAdminVotaciones(usuario)) {
    return { error: SOLO_ADMIN };
  }
  const apertura = leerFecha(formData.get("apertura"));
  if (!apertura) {
    return { error: "Elegí el día de la despedida." };
  }
  if (apertura <= hoyArgentina()) {
    return { error: "Tiene que ser un día que todavía no llegó." };
  }
  const anio = Number(apertura.slice(0, 4));
  if (await prisma.temporadaVotacion.findUnique({ where: { anio } })) {
    return { error: `Ya hay una temporada ${anio}.` };
  }
  await prisma.temporadaVotacion.create({ data: { anio, apertura: new Date(apertura) } });
  revalidar();
  return { ok: true };
}

async function temporadaParaAdmin(
  temporadaId: string,
): Promise<
  { error: string } | { temporada: { apertura: Date; publicada: boolean; prueba: boolean } }
> {
  const usuario = await requireUsuario();
  if (!esAdminVotaciones(usuario)) {
    return { error: SOLO_ADMIN };
  }
  const temporada = await prisma.temporadaVotacion.findUnique({
    where: { id: temporadaId },
    select: { apertura: true, publicada: true, prueba: true },
  });
  if (!temporada) {
    return { error: "La temporada ya no existe." };
  }
  return { temporada };
}

export async function cambiarApertura(
  temporadaId: string,
  formData: FormData,
): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  const apertura = leerFecha(formData.get("apertura"));
  if (!apertura) {
    return { error: "Elegí el día de la despedida." };
  }
  // Una vez cerrada no se reabre: los votos ya quedaron.
  if (estaAbierta(chequeo.temporada.apertura)) {
    return { error: YA_CERRADA };
  }
  if (apertura <= hoyArgentina()) {
    return { error: "Tiene que ser un día que todavía no llegó." };
  }
  await prisma.temporadaVotacion.update({
    where: { id: temporadaId },
    data: { apertura: new Date(apertura) },
  });
  revalidar();
  return { ok: true };
}

// En la despedida: se corta la votación ya (hoy pasa a ser el día del cierre).
export async function cerrarVotacionYa(temporadaId: string): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  if (chequeo.temporada.prueba) {
    return { error: EN_PRUEBA };
  }
  if (estaAbierta(chequeo.temporada.apertura)) {
    return { error: YA_CERRADA };
  }
  await prisma.temporadaVotacion.update({
    where: { id: temporadaId },
    data: { apertura: new Date(hoyArgentina()) },
  });
  revalidar();
  return { ok: true };
}

// Publicar: la ven todos y pueden proponer y votar. Ocultar la vuelve a dejar solo
// para los admin.
export async function publicarTemporada(
  temporadaId: string,
  publicar: boolean,
): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  if (chequeo.temporada.prueba) {
    return { error: EN_PRUEBA };
  }
  await prisma.temporadaVotacion.update({
    where: { id: temporadaId },
    data: { publicada: publicar },
  });
  revalidar();
  revalidatePath("/");
  return { ok: true };
}

// Ensayo de la despedida, solo con la temporada oculta: la votación se cierra (sin
// tocar la fecha) y los admin abren los sobres como esa noche.
export async function empezarPrueba(temporadaId: string): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  const { temporada } = chequeo;
  if (temporada.publicada) {
    return { error: "Ya la ven todos: la prueba es solo con la votación oculta." };
  }
  if (estaAbierta(temporada.apertura)) {
    return { error: YA_CERRADA };
  }
  await prisma.temporadaVotacion.update({ where: { id: temporadaId }, data: { prueba: true } });
  revalidar();
  return { ok: true };
}

// Fin del ensayo: se borran los votos de la prueba y se vuelven a tapar los sobres.
// Quedan las categorías, las propuestas y quién revela cada una.
export async function terminarPrueba(temporadaId: string): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  if (!chequeo.temporada.prueba) {
    return { ok: true };
  }
  await prisma.$transaction([
    prisma.votoVotacion.deleteMany({ where: { categoria: { temporadaId } } }),
    prisma.categoriaVotacion.updateMany({ where: { temporadaId }, data: { reveladaAt: null } }),
    prisma.temporadaVotacion.update({ where: { id: temporadaId }, data: { prueba: false } }),
  ]);
  revalidar();
  return { ok: true };
}

// Solo mientras está oculta (por ejemplo, después de probarla): se va con todo.
export async function borrarTemporada(temporadaId: string): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  if (chequeo.temporada.publicada) {
    return { error: "Ya la ven todos: ocultala primero." };
  }
  await prisma.temporadaVotacion.delete({ where: { id: temporadaId } });
  revalidar();
  return { ok: true };
}

// Se puede proponer y votar: publicada (o sos admin, que la está preparando) y antes
// del cierre.
async function temporadaVotable(temporadaId: string, esAdmin: boolean) {
  const temporada = await prisma.temporadaVotacion.findUnique({
    where: { id: temporadaId },
    select: { apertura: true, publicada: true, prueba: true },
  });
  if (!temporada) {
    return "La temporada ya no existe.";
  }
  if (!temporada.publicada && !esAdmin) {
    return PREPARANDO;
  }
  if (temporada.prueba) {
    return EN_PRUEBA;
  }
  return estaAbierta(temporada.apertura) ? YA_CERRADA : null;
}

// Cualquiera propone una categoría; la de un admin queda aprobada directo.
export async function proponerCategoria(
  temporadaId: string,
  texto: string,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  const esAdmin = esAdminVotaciones(usuario);
  const error = await temporadaVotable(temporadaId, esAdmin);
  if (error) {
    return { error };
  }
  const nombre = limpiarNombre(texto);
  if (!nombre) {
    return { error: 'Escribí la categoría (ej: "El más tomador").' };
  }
  const repetida = await nombreRepetido(temporadaId, nombre);
  if (repetida) {
    return { error: repetida };
  }
  await prisma.categoriaVotacion.create({
    data: { temporadaId, nombre, propuestaPorId: usuario.id, aprobada: esAdmin },
  });
  revalidar();
  return { ok: true };
}

// Los admin corrigen el nombre (aprobada o propuesta). Los votos quedan.
export async function renombrarCategoria(
  categoriaId: string,
  texto: string,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!esAdminVotaciones(usuario)) {
    return { error: SOLO_ADMIN };
  }
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: { temporadaId: true, reveladaAt: true },
  });
  if (!categoria) {
    return { error: "Esa categoría ya no está." };
  }
  if (categoria.reveladaAt) {
    return { error: "Ya se reveló: queda como está." };
  }
  const nombre = limpiarNombre(texto);
  if (!nombre) {
    return { error: "Escribí el nombre de la categoría." };
  }
  const repetida = await nombreRepetido(categoria.temporadaId, nombre, categoriaId);
  if (repetida) {
    return { error: repetida };
  }
  await prisma.categoriaVotacion.update({ where: { id: categoriaId }, data: { nombre } });
  revalidar();
  return { ok: true };
}

export async function aprobarCategoria(categoriaId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!esAdminVotaciones(usuario)) {
    return { error: SOLO_ADMIN };
  }
  await prisma.categoriaVotacion.update({
    where: { id: categoriaId },
    data: { aprobada: true },
  });
  revalidar();
  return { ok: true };
}

// Rechazar una propuesta (un admin o el que la propuso) o sacar una categoría
// aprobada (solo los admin; se van sus votos).
export async function borrarCategoria(categoriaId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: {
      aprobada: true,
      propuestaPorId: true,
      temporada: { select: { apertura: true, prueba: true } },
    },
  });
  if (!categoria) {
    return { ok: true };
  }
  const puede =
    esAdminVotaciones(usuario) ||
    (!categoria.aprobada && categoria.propuestaPorId === usuario.id);
  if (!puede) {
    return { error: SOLO_ADMIN };
  }
  if (votacionCerrada(categoria.temporada)) {
    return { error: categoria.temporada.prueba ? EN_PRUEBA : YA_CERRADA };
  }
  await prisma.categoriaVotacion.delete({ where: { id: categoriaId } });
  revalidar();
  return { ok: true };
}

// Un voto por categoría; se puede cambiar hasta el cierre. A uno mismo no.
export async function votar(categoriaId: string, votadoId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (votadoId === usuario.id) {
    return { error: "No te podés votar a vos mismo." };
  }
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: { aprobada: true, temporadaId: true },
  });
  if (!categoria || !categoria.aprobada) {
    return { error: "Esa categoría no está para votar." };
  }
  const error = await temporadaVotable(categoria.temporadaId, esAdminVotaciones(usuario));
  if (error) {
    return { error };
  }
  const votado = await prisma.user.findUnique({ where: { id: votadoId }, select: { id: true } });
  if (!votado) {
    return { error: "Ese integrante ya no está en el grupo." };
  }
  await prisma.votoVotacion.upsert({
    where: { categoriaId_votanteId: { categoriaId, votanteId: usuario.id } },
    create: { categoriaId, votanteId: usuario.id, votadoId },
    update: { votadoId },
  });
  revalidar();
  return { ok: true };
}

// "¿Quién revela?": un admin elige quién presenta esa categoría (puede ser él mismo).
// null = sacarle el permiso.
export async function elegirRevelador(
  categoriaId: string,
  reveladorId: string | null,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!esAdminVotaciones(usuario)) {
    return { error: SOLO_ADMIN };
  }
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: { aprobada: true, reveladaAt: true },
  });
  if (!categoria || !categoria.aprobada) {
    return { error: "Esa categoría no está." };
  }
  if (categoria.reveladaAt) {
    return { error: "Ya se reveló." };
  }
  if (reveladorId) {
    const existe = await prisma.user.findUnique({
      where: { id: reveladorId },
      select: { id: true },
    });
    if (!existe) {
      return { error: "Ese integrante ya no está en el grupo." };
    }
  }
  await prisma.categoriaVotacion.update({
    where: { id: categoriaId },
    data: { reveladorId },
  });
  revalidar();
  return { ok: true };
}

// Solo el que presenta abre el sobre, y recién cuando cerró la votación. Desde ahí lo
// ven todos (cuántos votos sacó cada uno, nunca quién votó a quién).
export async function revelarCategoria(categoriaId: string): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  const categoria = await prisma.categoriaVotacion.findUnique({
    where: { id: categoriaId },
    select: {
      aprobada: true,
      reveladorId: true,
      reveladaAt: true,
      temporada: { select: { apertura: true, prueba: true } },
    },
  });
  if (!categoria || !categoria.aprobada) {
    return { error: "Esa categoría no está." };
  }
  if (categoria.reveladaAt) {
    return { ok: true };
  }
  if (categoria.reveladorId !== usuario.id) {
    return { error: "Este sobre lo abre el que presenta la categoría." };
  }
  if (!votacionCerrada(categoria.temporada)) {
    return { error: "Todavía se está votando: el sobre se abre en la despedida." };
  }
  await prisma.categoriaVotacion.update({
    where: { id: categoriaId },
    data: { reveladaAt: new Date() },
  });
  revalidar();
  return { ok: true };
}

// Al final de la noche: un admin abre todos los sobres que falten de una. Se ven
// cuántos votos sacó cada uno, nunca quién votó a quién.
export async function revelarTodas(temporadaId: string): Promise<ResultadoVotacion> {
  const chequeo = await temporadaParaAdmin(temporadaId);
  if ("error" in chequeo) {
    return chequeo;
  }
  if (!votacionCerrada(chequeo.temporada)) {
    return { error: "Todavía se está votando: se revela en la despedida." };
  }
  await prisma.categoriaVotacion.updateMany({
    where: { temporadaId, aprobada: true, reveladaAt: null },
    data: { reveladaAt: new Date() },
  });
  revalidar();
  return { ok: true };
}

// Solo el admin del grupo nombra (o saca) a los que lo ayudan con las votaciones.
export async function cambiarAdminVotaciones(
  userId: string,
  valor: boolean,
): Promise<ResultadoVotacion> {
  const usuario = await requireUsuario();
  if (!usuario.esAdmin) {
    return { error: "Solo el admin del grupo elige a los admin de las votaciones." };
  }
  const integrante = await prisma.user.findUnique({
    where: { id: userId },
    select: { esAdmin: true },
  });
  if (!integrante) {
    return { error: "Ese integrante ya no está en el grupo." };
  }
  if (integrante.esAdmin) {
    return { ok: true };
  }
  await prisma.user.update({ where: { id: userId }, data: { adminVotaciones: valor } });
  revalidar();
  return { ok: true };
}
