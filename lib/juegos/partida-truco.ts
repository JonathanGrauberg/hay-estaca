import { prisma } from "@/lib/prisma";
import type { Equipo, Limite } from "@/lib/juegos/truco";

// Lo que se manda al cliente de una partida de la juntada: lo usan la página y el
// endpoint que consultan los que la siguen en vivo. Solo nombres, nunca datos de contacto.
export interface PartidaTrucoVista {
  id: string;
  juntadaId: string;
  limite: Limite;
  nombres: Record<Equipo, string>;
  puntos: Record<Equipo, number>;
  jugadores: Record<Equipo, string[]>;
  anotador: { id: string; nombre: string } | null;
  terminada: boolean;
  // Para descartar respuestas viejas del polling (ms desde epoch).
  version: number;
}

const nombreDe = (persona: { nombre: string; apodo: string | null }) =>
  persona.apodo || persona.nombre;

export async function leerPartidaTruco(
  partidaId: string,
): Promise<PartidaTrucoVista | null> {
  const partida = await prisma.partidaTruco.findUnique({
    where: { id: partidaId },
    include: {
      anotador: { select: { id: true, nombre: true, apodo: true } },
      jugadores: {
        orderBy: { id: "asc" },
        include: {
          user: { select: { nombre: true, apodo: true } },
          invitado: { select: { nombre: true } },
        },
      },
    },
  });
  if (!partida) {
    return null;
  }
  const jugadores: Record<Equipo, string[]> = { nos: [], ellos: [] };
  for (const jugador of partida.jugadores) {
    const equipo: Equipo = jugador.equipo === "ellos" ? "ellos" : "nos";
    const nombre = jugador.user
      ? nombreDe(jugador.user)
      : jugador.invitado
        ? `${jugador.invitado.nombre} (inv.)`
        : null;
    if (nombre) {
      jugadores[equipo].push(nombre);
    }
  }
  return {
    id: partida.id,
    juntadaId: partida.juntadaId,
    limite: partida.limite === 15 ? 15 : 30,
    nombres: { nos: partida.nombreNos, ellos: partida.nombreEllos },
    puntos: { nos: partida.puntosNos, ellos: partida.puntosEllos },
    jugadores,
    anotador: partida.anotador
      ? { id: partida.anotador.id, nombre: nombreDe(partida.anotador) }
      : null,
    terminada: partida.terminadaAt !== null,
    version: partida.updatedAt.getTime(),
  };
}

// Anota el anotador; el admin también puede, por si el anotador se fue.
export function puedeAnotar(
  partida: { anotador: { id: string } | null },
  usuario: { id: string; esAdmin: boolean },
) {
  return usuario.esAdmin || partida.anotador?.id === usuario.id;
}
