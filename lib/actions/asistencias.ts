"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";

export type ActualizarAsistenciaState = { error: string } | undefined;

export async function actualizarAsistencia(
  _prevState: ActualizarAsistenciaState,
  formData: FormData
): Promise<ActualizarAsistenciaState> {
  // Cada uno responde solo por sí mismo: el userId sale de la sesión, no del form.
  const { id: userId } = await requireUsuario();
  const juntadaId = String(formData.get("juntadaId") ?? "");
  const estado = String(formData.get("estado") ?? "");

  if (!juntadaId) {
    return { error: "Falta la juntada." };
  }
  if (estado !== "voy" && estado !== "no_voy" && estado !== "en_duda") {
    return { error: "Estado de asistencia inválido." };
  }

  await prisma.asistencia.upsert({
    where: { userId_juntadaId: { userId, juntadaId } },
    create: { userId, juntadaId, estado, respondidoAt: new Date() },
    update: { estado, respondidoAt: new Date() },
  });

  // El anillo/badge del dashboard también dependen de esta asistencia.
  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}
