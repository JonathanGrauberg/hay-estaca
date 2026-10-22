"use server";

import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";

export type CrearJuntadaState = { error: string } | undefined;

export async function crearJuntada(
  _prevState: CrearJuntadaState,
  formData: FormData
): Promise<CrearJuntadaState> {
  await requireUsuario();
  const nombre = String(formData.get("nombre") ?? "").trim();
  const fecha = String(formData.get("fecha") ?? "").trim();
  const hora = String(formData.get("hora") ?? "").trim();
  const ubicacion = String(formData.get("ubicacion") ?? "").trim();
  const mensajeFomo = String(formData.get("mensajeFomo") ?? "").trim();

  if (!nombre || !fecha || !hora || !ubicacion) {
    return { error: "Completá nombre, fecha, hora y ubicación." };
  }

  const fechaParseada = new Date(fecha);
  if (Number.isNaN(fechaParseada.getTime())) {
    return { error: "La fecha no es válida." };
  }

  await prisma.juntada.create({
    data: {
      nombre,
      fecha: fechaParseada,
      hora,
      ubicacion,
      mensajeFomo: mensajeFomo || null,
    },
  });

  redirect("/");
}
