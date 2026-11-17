import { prisma } from "@/lib/prisma";

export interface IntegranteVoto {
  id: string;
  nombre: string;
  apodo: string;
  avatarUrl: string | null;
  // Admin del grupo o ayudante de las votaciones.
  adminVotaciones: boolean;
}

export interface CategoriaVista {
  id: string;
  nombre: string;
  propuestaPor: string | null;
  votaron: number;
  // Solo el voto propio: el de los demás no viaja nunca al celu.
  miVoto: string | null;
  // El que presenta la categoría en la despedida (solo él abre el sobre).
  reveladorId: string | null;
  revelada: boolean;
  // Solo cuando se reveló: cuántos votos sacó cada uno (sin quién lo votó). Antes ni
  // los admin lo ven.
  resultados: { id: string; votos: number }[] | null;
}

export interface VotacionesVista {
  temporada: {
    id: string;
    anio: number;
    // Día de la despedida, "2026-12-19": desde ahí no se vota más.
    apertura: string;
    cerrada: boolean;
    // false mientras los admin la preparan: solo ellos la ven.
    publicada: boolean;
    diasQueFaltan: number;
  };
  categorias: CategoriaVista[];
  pendientes: { id: string; nombre: string; propuestaPor: string | null; mia: boolean }[];
  integrantes: IntegranteVoto[];
}

export const esAdminVotaciones = (u: { esAdmin: boolean; adminVotaciones: boolean }) =>
  u.esAdmin || u.adminVotaciones;

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

// Llegó el día de la despedida: la votación está cerrada.
export function estaAbierta(apertura: Date) {
  return hoyArgentina() >= diaGuardado(apertura);
}

const nombreDe = (u: { nombre: string; apodo: string | null }) => u.apodo || u.nombre;

type Db = Pick<typeof prisma, "temporadaVotacion" | "user">;

// La temporada más nueva, con lo que puede ver este usuario. `db` se cambia solo para
// probar dentro de una transacción.
export async function leerVotaciones(
  userId: string,
  db: Db = prisma,
): Promise<VotacionesVista | null> {
  const temporada = await db.temporadaVotacion.findFirst({
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

  const integrantes = (
    await db.user.findMany({
      orderBy: { nombre: "asc" },
      select: {
        id: true,
        nombre: true,
        apodo: true,
        avatarUrl: true,
        esAdmin: true,
        adminVotaciones: true,
      },
    })
  ).map(({ esAdmin, adminVotaciones, ...resto }) => ({
    ...resto,
    adminVotaciones: esAdmin || adminVotaciones,
  }));

  const cerrada = estaAbierta(temporada.apertura);
  const apertura = diaGuardado(temporada.apertura);
  const diasQueFaltan = Math.max(
    0,
    Math.round((Date.parse(apertura) - Date.parse(hoyArgentina())) / 86_400_000),
  );

  const categorias = temporada.categorias
    .filter((c) => c.aprobada)
    .map((c) => {
      const revelada = c.reveladaAt !== null;
      let resultados: CategoriaVista["resultados"] = null;
      if (revelada) {
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
        reveladorId: c.reveladorId,
        revelada,
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
      cerrada,
      publicada: temporada.publicada,
      diasQueFaltan,
    },
    categorias,
    pendientes,
    integrantes,
  };
}
