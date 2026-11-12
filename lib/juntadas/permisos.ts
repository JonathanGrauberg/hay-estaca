import { prisma } from "@/lib/prisma";

// Una juntada la modifican los que van (cuentas, checklist, invitados, editarla) y el
// admin del grupo. El resto la puede mirar y responder si va, pero no tocar nada.
export async function puedeModificarJuntada(
  juntadaId: string,
  usuario: { id: string; esAdmin: boolean }
) {
  if (usuario.esAdmin) {
    return true;
  }
  const asistencia = await prisma.asistencia.findUnique({
    where: { userId_juntadaId: { userId: usuario.id, juntadaId } },
    select: { estado: true },
  });
  return asistencia?.estado === "voy";
}

export const SOLO_LOS_QUE_VAN = "Solo los que van a la juntada pueden modificarla. Confirmá que vas.";
