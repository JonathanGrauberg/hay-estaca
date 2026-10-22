import type { PersonaId } from "@/lib/cuentas/calcular";

// En los formularios y en el motor de cálculo una persona viaja como string:
// "u:<userId>" para integrantes, "i:<invitadoId>" para invitados de la juntada.

export type PersonaRef = { userId: string; invitadoId: null } | { userId: null; invitadoId: string };

export function personaId(ref: { userId: string | null; invitadoId: string | null }): PersonaId {
  if (ref.userId) return `u:${ref.userId}`;
  if (ref.invitadoId) return `i:${ref.invitadoId}`;
  throw new Error("Persona sin userId ni invitadoId");
}

export function parsearPersona(valor: string): PersonaRef | null {
  const [tipo, id] = [valor.slice(0, 2), valor.slice(2)];
  if (!id) return null;
  if (tipo === "u:") return { userId: id, invitadoId: null };
  if (tipo === "i:") return { userId: null, invitadoId: id };
  return null;
}
