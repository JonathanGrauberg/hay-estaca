import { prisma } from "@/lib/prisma";

// Lo que viaja al cliente de cada encuesta: solo ids y nombres.
export interface PersonaEncuesta {
  id: string;
  nombre: string;
}

export interface EncuestaVista {
  id: string;
  pregunta: string;
  multiple: boolean;
  cerrada: boolean;
  creadaPor: string | null;
  // La puede cerrar, reabrir o borrar (el que la creó o el admin).
  administro: boolean;
  // Segunda vuelta: de qué encuesta y opción salen los que votan.
  segundaVueltaDe: { pregunta: string; opcion: string } | null;
  opciones: { id: string; texto: string; votantes: PersonaEncuesta[] }[];
  misVotos: string[];
  puedoVotar: boolean;
  // Los que pueden votar y todavía no votaron.
  faltan: PersonaEncuesta[];
  votaron: number;
}

const nombreDe = (persona: { nombre: string; apodo: string | null }) =>
  persona.apodo || persona.nombre;

// Quiénes votan una encuesta: los que van o, en una segunda vuelta, los que eligieron
// la opción de la anterior.
export async function elegiblesEncuesta(encuesta: {
  juntadaId: string;
  soloDeOpcionId: string | null;
}) {
  if (encuesta.soloDeOpcionId) {
    const votos = await prisma.votoEncuesta.findMany({
      where: { opcionId: encuesta.soloDeOpcionId },
      select: { user: { select: { id: true, nombre: true, apodo: true } } },
    });
    return votos.map((v) => v.user);
  }
  const asistencias = await prisma.asistencia.findMany({
    where: { juntadaId: encuesta.juntadaId, estado: "voy" },
    select: { user: { select: { id: true, nombre: true, apodo: true } } },
  });
  return asistencias.map((a) => a.user);
}

export async function leerEncuestas(
  juntadaId: string,
  usuario: { id: string; esAdmin: boolean },
): Promise<EncuestaVista[]> {
  const encuestas = await prisma.encuesta.findMany({
    where: { juntadaId },
    orderBy: { createdAt: "desc" },
    include: {
      creadaPor: { select: { nombre: true, apodo: true } },
      soloDeOpcion: {
        select: { texto: true, encuesta: { select: { pregunta: true } } },
      },
      opciones: {
        orderBy: { orden: "asc" },
        include: {
          votos: {
            orderBy: { createdAt: "asc" },
            select: {
              user: { select: { id: true, nombre: true, apodo: true } },
            },
          },
        },
      },
    },
  });

  return Promise.all(
    encuestas.map(async (encuesta) => {
      const elegibles = await elegiblesEncuesta(encuesta);
      const opciones = encuesta.opciones.map((opcion) => ({
        id: opcion.id,
        texto: opcion.texto,
        votantes: opcion.votos.map((v) => ({
          id: v.user.id,
          nombre: nombreDe(v.user),
        })),
      }));
      const votaronIds = new Set(
        opciones.flatMap((o) => o.votantes.map((v) => v.id)),
      );
      const cerrada = encuesta.cerradaAt !== null;
      return {
        id: encuesta.id,
        pregunta: encuesta.pregunta,
        multiple: encuesta.multiple,
        cerrada,
        creadaPor: encuesta.creadaPor ? nombreDe(encuesta.creadaPor) : null,
        administro: usuario.esAdmin || encuesta.creadaPorId === usuario.id,
        segundaVueltaDe: encuesta.soloDeOpcion
          ? {
              pregunta: encuesta.soloDeOpcion.encuesta.pregunta,
              opcion: encuesta.soloDeOpcion.texto,
            }
          : null,
        opciones,
        misVotos: opciones
          .filter((o) => o.votantes.some((v) => v.id === usuario.id))
          .map((o) => o.id),
        puedoVotar: !cerrada && elegibles.some((e) => e.id === usuario.id),
        faltan: elegibles
          .filter((e) => !votaronIds.has(e.id))
          .map((e) => ({ id: e.id, nombre: nombreDe(e) })),
        votaron: votaronIds.size,
      };
    }),
  );
}
