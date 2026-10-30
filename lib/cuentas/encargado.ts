import { prisma } from "@/lib/prisma";

export interface EncargadoCuentas {
  id: string;
  nombre: string;
  // true = se hizo cargo a mano; false = es encargado fijo del grupo y confirmó que va.
  asignado: boolean;
}

// Quién maneja "la casa de la moneda" en esta juntada: el que se hizo cargo, o si no
// el primer encargado fijo del grupo que confirmó que va. null = falta encargado.
export async function encargadoDeJuntada(juntadaId: string): Promise<EncargadoCuentas | null> {
  const juntada = await prisma.juntada.findUnique({
    where: { id: juntadaId },
    select: { encargadoCuentas: { select: { id: true, nombre: true, apodo: true } } },
  });

  if (juntada?.encargadoCuentas) {
    const { id, nombre, apodo } = juntada.encargadoCuentas;
    return { id, nombre: apodo || nombre, asignado: true };
  }

  const fijo = await prisma.user.findFirst({
    where: { encargadoCuentas: true, asistencias: { some: { juntadaId, estado: "voy" } } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true },
  });

  return fijo ? { id: fijo.id, nombre: fijo.apodo || fijo.nombre, asignado: false } : null;
}
