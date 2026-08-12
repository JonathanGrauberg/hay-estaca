"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

export type CrearIntegranteState = { error: string } | undefined;

export async function crearIntegrante(
  _prevState: CrearIntegranteState,
  formData: FormData
): Promise<CrearIntegranteState> {
  const nombre = String(formData.get("nombre") ?? "").trim();
  const apodo = String(formData.get("apodo") ?? "").trim();
  const telefono = String(formData.get("telefono") ?? "").trim();

  if (!nombre || !apodo) {
    return { error: "Completá nombre y apodo." };
  }

  await prisma.user.create({
    data: {
      nombre,
      apodo,
      telefono: telefono || null,
    },
  });

  redirect("/perfil");
}
