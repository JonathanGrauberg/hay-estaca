"use server";

import { prisma } from "@/lib/prisma";

export type ActualizarAsistenciaState = { error: string } | undefined;

export async function actualizarAsistencia(
  _prevState: ActualizarAsistenciaState,
  formData: FormData
): Promise<ActualizarAsistenciaState> {
  const juntadaId = String(formData.get("juntadaId") ?? "");
  const userId = String(formData.get("userId") ?? "");
  const estado = String(formData.get("estado") ?? "");

  // TODO: reemplazar por auth real cuando la implementemos. Por ahora "userId" viene
  // de un selector "¿quién sos?" sin verificar — cualquiera puede mandar cualquier id.
  if (!juntadaId || !userId) {
    return { error: "Elegí quién sos antes de responder." };
  }
  if (estado !== "voy" && estado !== "no_voy" && estado !== "en_duda") {
    return { error: "Estado de asistencia inválido." };
  }

  await prisma.asistencia.upsert({
    where: { userId_juntadaId: { userId, juntadaId } },
    create: { userId, juntadaId, estado, respondidoAt: new Date() },
    update: { estado, respondidoAt: new Date() },
  });
}
