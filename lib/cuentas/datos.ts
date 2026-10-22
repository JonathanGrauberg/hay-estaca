import { prisma } from "@/lib/prisma";
import { calcularCuentas, type PersonaId, type Transferencia } from "@/lib/cuentas/calcular";
import { personaId } from "@/lib/cuentas/personas";

export interface PersonaCuentas {
  id: PersonaId;
  nombre: string;
  esInvitado: boolean;
  // Solo integrantes; para el botón de copiar en las transferencias.
  aliasCvu: string | null;
  // Confirmó que va (o es invitado de la juntada): se precarga en los gastos nuevos.
  vaPorDefecto: boolean;
}

export interface GastoVista {
  id: string;
  concepto: string;
  montoCentavos: number;
  pagadoPor: PersonaId;
  participantes: PersonaId[];
}

export interface CuentasJuntada {
  personas: PersonaCuentas[];
  gastos: GastoVista[];
  bonificados: { id: string; persona: PersonaId; cubiertoPor: PersonaId | null }[];
  totalCentavos: number;
  pagado: Record<PersonaId, number>;
  parte: Record<PersonaId, number>;
  saldo: Record<PersonaId, number>;
  transferencias: Transferencia[];
}

// Todo lo que necesitan las pantallas de cuentas de una juntada, ya calculado y
// serializable (sin Map ni Date) para pasarlo a client components.
export async function cargarCuentas(juntadaId: string): Promise<CuentasJuntada> {
  const [usuarios, invitados, asistencias, gastos, bonificados] = await Promise.all([
    prisma.user.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apodo: true, aliasCvu: true },
    }),
    prisma.invitado.findMany({
      where: { juntadaId },
      orderBy: { createdAt: "asc" },
      select: { id: true, nombre: true },
    }),
    prisma.asistencia.findMany({
      where: { juntadaId, estado: "voy" },
      select: { userId: true },
    }),
    prisma.gasto.findMany({
      where: { juntadaId },
      orderBy: { createdAt: "asc" },
      include: { participantes: { select: { userId: true, invitadoId: true } } },
    }),
    prisma.bonificado.findMany({ where: { juntadaId } }),
  ]);

  const confirmados = new Set(asistencias.map((asistencia) => asistencia.userId));

  const personas: PersonaCuentas[] = [
    ...usuarios.map((usuario) => ({
      id: personaId({ userId: usuario.id, invitadoId: null }),
      nombre: usuario.apodo || usuario.nombre,
      esInvitado: false,
      aliasCvu: usuario.aliasCvu,
      vaPorDefecto: confirmados.has(usuario.id),
    })),
    ...invitados.map((invitado) => ({
      id: personaId({ userId: null, invitadoId: invitado.id }),
      nombre: invitado.nombre,
      esInvitado: true,
      aliasCvu: null,
      vaPorDefecto: true,
    })),
  ];

  const gastosVista = gastos.map((gasto) => ({
    id: gasto.id,
    concepto: gasto.concepto,
    montoCentavos: gasto.montoCentavos,
    pagadoPor: personaId({ userId: gasto.pagadoPorUserId, invitadoId: gasto.pagadoPorInvitadoId }),
    participantes: gasto.participantes.map(personaId),
  }));

  const bonificadosVista = bonificados.map((bonificado) => ({
    id: bonificado.id,
    persona: personaId(bonificado),
    cubiertoPor: bonificado.cubiertoPorUserId
      ? personaId({ userId: bonificado.cubiertoPorUserId, invitadoId: null })
      : null,
  }));

  const resultado = calcularCuentas(gastosVista, bonificadosVista);

  return {
    personas,
    gastos: gastosVista,
    bonificados: bonificadosVista,
    totalCentavos: gastosVista.reduce((total, gasto) => total + gasto.montoCentavos, 0),
    pagado: Object.fromEntries(resultado.pagado),
    parte: Object.fromEntries(resultado.parte),
    saldo: Object.fromEntries(resultado.saldo),
    transferencias: resultado.transferencias,
  };
}
