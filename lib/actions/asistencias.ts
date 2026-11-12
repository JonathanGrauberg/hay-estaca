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

  // Si había visto solo el FOMO, ahora que va le tocan las historias de verdad.
  if (estado === "voy") {
    await prisma.vistaHistoria.deleteMany({
      where: { userId, soloFomo: true, historia: { juntadaId } },
    });
  }

  // Las cuentas siguen a la asistencia mientras se están cargando: el que confirma
  // queda tildado en todo lo que se divide, y el que se baja sale.
  const juntada = await prisma.juntada.findUnique({
    where: { id: juntadaId },
    select: { cuentasEstado: true, categorias: { select: { id: true } } },
  });
  if (juntada?.cuentasEstado === "abiertas" && juntada.categorias.length > 0) {
    const categoriaIds = juntada.categorias.map((categoria) => categoria.id);
    if (estado === "voy") {
      await prisma.categoriaParticipante.createMany({
        data: categoriaIds.map((categoriaId) => ({ categoriaId, userId })),
        skipDuplicates: true,
      });
    } else {
      await prisma.categoriaParticipante.deleteMany({
        where: { categoriaId: { in: categoriaIds }, userId },
      });
    }
    revalidatePath("/cuentas");
  }

  // El anillo/badge del dashboard también dependen de esta asistencia.
  revalidatePath(`/juntadas/${juntadaId}`, "layout");
  revalidatePath("/");
}
