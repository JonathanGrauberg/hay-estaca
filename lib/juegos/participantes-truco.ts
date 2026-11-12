import { prisma } from "@/lib/prisma";

const nombreDe = (persona: { nombre: string; apodo: string | null }) =>
  persona.apodo || persona.nombre;

// Quiénes pueden jugar (los que van y los invitados) y quiénes pueden anotar (los que
// van: tienen que poder entrar a la app). El admin se suma como anotador posible.
export async function participantesTruco(
  juntadaId: string,
  usuario: {
    id: string;
    nombre: string;
    apodo: string | null;
    esAdmin: boolean;
  },
) {
  const [asistencias, invitados] = await Promise.all([
    prisma.asistencia.findMany({
      where: { juntadaId, estado: "voy" },
      select: { user: { select: { id: true, nombre: true, apodo: true } } },
      orderBy: { user: { nombre: "asc" } },
    }),
    prisma.invitado.findMany({
      where: { juntadaId },
      orderBy: { createdAt: "asc" },
      select: { id: true, nombre: true },
    }),
  ]);
  const van = asistencias.map((a) => ({
    id: a.user.id,
    nombre: nombreDe(a.user),
  }));
  const anotadores =
    usuario.esAdmin && !van.some((v) => v.id === usuario.id)
      ? [...van, { id: usuario.id, nombre: nombreDe(usuario) }]
      : van;
  const personas = [
    ...van.map((v) => ({
      clave: `u:${v.id}`,
      nombre: v.nombre,
      esInvitado: false,
    })),
    ...invitados.map((i) => ({
      clave: `i:${i.id}`,
      nombre: i.nombre,
      esInvitado: true,
    })),
  ];
  return { personas, anotadores };
}
