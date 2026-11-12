import { prisma } from "@/lib/prisma";

// Las historias duran 24 horas desde que se suben.
export const HORAS_HISTORIA = 24;

export function desdeHistoriasVigentes() {
  return new Date(Date.now() - HORAS_HISTORIA * 60 * 60 * 1000);
}

// Las historias de una juntada solo las ven (y suben) los que confirmaron que van.
export async function vaALaJuntada(juntadaId: string, userId: string) {
  const asistencia = await prisma.asistencia.findUnique({
    where: { userId_juntadaId: { userId, juntadaId } },
    select: { estado: true },
  });
  return asistencia?.estado === "voy";
}

// avatarUrl guarda la ruta servida por app/fotos; en R2 el objeto es lo que sigue.
export const PREFIJO_RUTA = "/fotos/";

export function rutaFoto(key: string) {
  return `${PREFIJO_RUTA}${key}`;
}

export function keyDeRuta(ruta: string | null) {
  return ruta?.startsWith(PREFIJO_RUTA) ? ruta.slice(PREFIJO_RUTA.length) : null;
}

// "hace 2 h", "hace 15 min" o "recién".
export function haceCuanto(fecha: Date) {
  const minutos = Math.floor((Date.now() - fecha.getTime()) / 60_000);
  if (minutos >= 60) {
    return `hace ${Math.floor(minutos / 60)} h`;
  }
  return minutos > 0 ? `hace ${minutos} min` : "recién";
}
