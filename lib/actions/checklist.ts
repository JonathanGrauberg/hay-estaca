"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import type { TipoChecklistItem } from "@/app/generated/prisma/enums";

export type CrearChecklistItemState = { error: string } | undefined;

export async function crearChecklistItem(
  juntadaId: string,
  tipo: TipoChecklistItem,
  _prevState: CrearChecklistItemState,
  formData: FormData
): Promise<CrearChecklistItemState> {
  const descripcion = String(formData.get("descripcion") ?? "").trim();

  if (!descripcion) {
    return { error: "Escribí una descripción para el item." };
  }

  await prisma.checklistItem.create({
    data: { juntadaId, descripcion, tipo },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}

// Solo togglea si el item es grupal y quienSoyId coincide con el asignado — si no
// coincide (o el item no tiene asignado, o es individual), el where no matchea
// ninguna fila y la acción queda rechazada sin tocar nada. No alcanza con
// deshabilitar el checkbox en el cliente porque cualquiera puede mandar el request
// a mano sin pasar por la UI, así que esto es lo que realmente lo impide.
export async function togglearChecklistItem(
  juntadaId: string,
  itemId: string,
  completado: boolean,
  quienSoyId: string,
  _formData: FormData
) {
  await prisma.checklistItem.updateMany({
    where: { id: itemId, tipo: "grupal", asignadoAUserId: quienSoyId },
    data: { completado },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}

// Cualquiera puede asignarse (o asignar a otro) un item grupal que todavía no tenga
// responsable. El where exige que siga sin asignar al momento de aplicarse, para
// evitar pisarle la asignación a otra persona por una carrera entre dos requests.
export async function asignarChecklistItem(juntadaId: string, itemId: string, formData: FormData) {
  const userId = String(formData.get("userId") ?? "").trim();

  if (!userId) {
    return;
  }

  await prisma.checklistItem.updateMany({
    where: { id: itemId, tipo: "grupal", asignadoAUserId: null },
    data: { asignadoAUserId: userId },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}

// Solo la persona asignada puede desasignarse a sí misma — mismo patrón de
// rechazo server-side que el toggle. Si estaba completado, se destilda: no puede
// quedar "listo" un item sin nadie a cargo.
export async function desasignarChecklistItem(
  juntadaId: string,
  itemId: string,
  quienSoyId: string,
  _formData: FormData
) {
  await prisma.checklistItem.updateMany({
    where: { id: itemId, tipo: "grupal", asignadoAUserId: quienSoyId },
    data: { asignadoAUserId: null, completado: false },
  });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}

export async function borrarChecklistItem(juntadaId: string, itemId: string, _formData: FormData) {
  await prisma.checklistItem.delete({ where: { id: itemId } });

  revalidatePath(`/juntadas/${juntadaId}`);
  revalidatePath("/");
}
