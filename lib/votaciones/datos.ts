import { prisma } from "@/lib/prisma";

export interface IntegranteVoto {
  id: string;
  nombre: string;
  apodo: string;
  avatarUrl: string | null;
}

export interface CategoriaVista {
  id: string;
  nombre: string;
  propuestaPor: string | null;
  votaron: number;
  // Solo el voto propio: el de los demás no viaja nunca al celu.
  miVoto: string | null;
  // Solo después de la apertura: cuántos votos sacó cada uno (sin quién lo votó).
  resultados: { id: string; votos: number }[] | null;
}

export interface VotacionesVista {
  temporada: {
    id: string;
    anio: number;
    // "2026-12-20"
    apertura: string;
    abierta: boolean;
    // false mientras el admin la prepara: solo él la ve.
    publicada: boolean;
    diasQueFaltan: number;
  };
  categorias: CategoriaVista[];
  pendientes: { id: string; nombre: string; propuestaPor: string | null; mia: boolean }[];
  integrantes: IntegranteVoto[];
}

// "2026-11-13" de hoy en Argentina.
export function hoyArgentina() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

// @db.Date llega como medianoche UTC: el día guardado es la parte UTC.
export const diaGuardado = (fecha: Date) => fecha.toISOString().slice(0, 10);

export function estaAbierta(apertura: Date) {
  return hoyArgentina() >= diaGuardado(apertura);
}

const nombreDe = (u: { nombre: string; apodo: string | null }) => u.apodo || u.nombre;

// La temporada más nueva, con lo que puede ver este usuario.
export async function leerVotaciones(userId: string): Promise<VotacionesVista | null> {
  const temporada = await prisma.temporadaVotacion.findFirst({
    orderBy: { anio: "desc" },
    include: {
      categorias: {
        orderBy: { createdAt: "asc" },
        include: {
          propuestaPor: { select: { nombre: true, apodo: true } },
          votos: { select: { votanteId: true, votadoId: true } },
        },
      },
    },
  });
  if (!temporada) {
    return null;
  }

  const integrantes = await prisma.user.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true, avatarUrl: true },
  });

  const abierta = estaAbierta(temporada.apertura);
  const apertura = diaGuardado(temporada.apertura);
  const diasQueFaltan = Math.max(
    0,
    Math.round((Date.parse(apertura) - Date.parse(hoyArgentina())) / 86_400_000),
  );

  const categorias = temporada.categorias
    .filter((c) => c.aprobada)
    .map((c) => {
      let resultados: CategoriaVista["resultados"] = null;
      if (abierta) {
        const conteo = new Map<string, number>();
        for (const voto of c.votos) {
          conteo.set(voto.votadoId, (conteo.get(voto.votadoId) ?? 0) + 1);
        }
        resultados = [...conteo]
          .map(([id, votos]) => ({ id, votos }))
          .sort((a, b) => b.votos - a.votos);
      }
      return {
        id: c.id,
        nombre: c.nombre,
        propuestaPor: c.propuestaPor ? nombreDe(c.propuestaPor) : null,
        votaron: c.votos.length,
        miVoto: c.votos.find((v) => v.votanteId === userId)?.votadoId ?? null,
        resultados,
      };
    });

  const pendientes = temporada.categorias
    .filter((c) => !c.aprobada)
    .map((c) => ({
      id: c.id,
      nombre: c.nombre,
      propuestaPor: c.propuestaPor ? nombreDe(c.propuestaPor) : null,
      mia: c.propuestaPorId === userId,
    }));

  return {
    temporada: {
      id: temporada.id,
      anio: temporada.anio,
      apertura,
      abierta,
      publicada: temporada.publicada,
      diasQueFaltan,
    },
    categorias,
    pendientes,
    integrantes,
  };
}
