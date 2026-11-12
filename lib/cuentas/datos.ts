import { prisma } from "@/lib/prisma";
import {
  aplicarPagos,
  calcularCuentas,
  transferenciasDirectas,
  type PersonaId,
  type Transferencia,
} from "@/lib/cuentas/calcular";
import {
  encargadoDeJuntada,
  type EncargadoCuentas,
} from "@/lib/cuentas/encargado";
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
  categoriaId: string | null;
  // Con categoría, los tildados de la categoría; sin categoría, los elegidos a mano.
  participantes: PersonaId[];
}

export interface CategoriaVista {
  id: string;
  nombre: string;
  participantes: PersonaId[];
  totalCentavos: number;
}

export interface PagoVista {
  id: string;
  de: PersonaId;
  a: PersonaId;
  centavos: number;
}

export interface CuentasJuntada {
  estado: "abiertas" | "divididas" | "cerradas";
  encargado: EncargadoCuentas | null;
  personas: PersonaCuentas[];
  categorias: CategoriaVista[];
  gastos: GastoVista[];
  pagos: PagoVista[];
  bonificados: {
    id: string;
    persona: PersonaId;
    cubiertoPor: PersonaId | null;
  }[];
  totalCentavos: number;
  pagado: Record<PersonaId, number>;
  parte: Record<PersonaId, number>;
  saldo: Record<PersonaId, number>;
  // Saldo descontando los pagos ya tildados.
  pendiente: Record<PersonaId, number>;
  // Lo que falta transferir (ya descontados los pagos).
  transferencias: Transferencia[];
}

// Todo lo que necesitan las pantallas de cuentas de una juntada, ya calculado y
// serializable (sin Map ni Date) para pasarlo a client components.
export async function cargarCuentas(
  juntadaId: string,
): Promise<CuentasJuntada> {
  const [
    juntada,
    encargado,
    usuarios,
    invitados,
    asistencias,
    gastos,
    bonificados,
    categorias,
    pagos,
  ] = await Promise.all([
    prisma.juntada.findUniqueOrThrow({
      where: { id: juntadaId },
      select: { cuentasEstado: true },
    }),
    encargadoDeJuntada(juntadaId),
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
      include: {
        participantes: { select: { userId: true, invitadoId: true } },
      },
    }),
    prisma.bonificado.findMany({ where: { juntadaId } }),
    prisma.categoria.findMany({
      where: { juntadaId },
      orderBy: { createdAt: "asc" },
      include: {
        participantes: { select: { userId: true, invitadoId: true } },
      },
    }),
    prisma.pago.findMany({
      where: { juntadaId },
      orderBy: { createdAt: "asc" },
    }),
  ]);

  const confirmados = new Set(
    asistencias.map((asistencia) => asistencia.userId),
  );

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

  const participantesCategoria = new Map(
    categorias.map((categoria) => [
      categoria.id,
      categoria.participantes.map(personaId),
    ]),
  );

  const gastosVista: GastoVista[] = gastos.map((gasto) => ({
    id: gasto.id,
    concepto: gasto.concepto,
    montoCentavos: gasto.montoCentavos,
    pagadoPor: personaId({
      userId: gasto.pagadoPorUserId,
      invitadoId: gasto.pagadoPorInvitadoId,
    }),
    categoriaId: gasto.categoriaId,
    participantes: gasto.categoriaId
      ? (participantesCategoria.get(gasto.categoriaId) ?? [])
      : gasto.participantes.map(personaId),
  }));

  const categoriasVista = categorias.map((categoria) => ({
    id: categoria.id,
    nombre: categoria.nombre,
    participantes: participantesCategoria.get(categoria.id) ?? [],
    totalCentavos: gastosVista
      .filter((gasto) => gasto.categoriaId === categoria.id)
      .reduce((total, gasto) => total + gasto.montoCentavos, 0),
  }));

  const pagosVista = pagos.map((pago) => ({
    id: pago.id,
    de: personaId({ userId: pago.deUserId, invitadoId: pago.deInvitadoId }),
    a: personaId({ userId: pago.aUserId, invitadoId: pago.aInvitadoId }),
    centavos: pago.montoCentavos,
  }));

  const bonificadosVista = bonificados.map((bonificado) => ({
    id: bonificado.id,
    persona: personaId(bonificado),
    cubiertoPor: bonificado.cubiertoPorUserId
      ? personaId({ userId: bonificado.cubiertoPorUserId, invitadoId: null })
      : null,
  }));

  const resultado = calcularCuentas(gastosVista, bonificadosVista);
  const pendiente = aplicarPagos(resultado.saldo, pagosVista);

  return {
    estado: juntada.cuentasEstado,
    encargado,
    personas,
    categorias: categoriasVista,
    gastos: gastosVista,
    pagos: pagosVista,
    bonificados: bonificadosVista,
    totalCentavos: gastosVista.reduce(
      (total, gasto) => total + gasto.montoCentavos,
      0,
    ),
    pagado: Object.fromEntries(resultado.pagado),
    parte: Object.fromEntries(resultado.parte),
    saldo: Object.fromEntries(resultado.saldo),
    pendiente: Object.fromEntries(pendiente),
    transferencias: transferenciasDirectas(resultado.deudas, pagosVista),
  };
}

// Lo de una persona, separado: cuánto le tienen que pasar y cuánto tiene que pasar ella
// (ej: te deben el fernet y debés la carne). Sale de las transferencias pendientes.
// También quién te debe y a quién le debés, con nombre y monto.
export function miResumen(
  cuentas: Pick<CuentasJuntada, "transferencias" | "personas">,
  yo: PersonaId,
) {
  const nombre = new Map(cuentas.personas.map((p) => [p.id, p.nombre]));
  const conNombre = (id: PersonaId, centavos: number) => ({
    id,
    nombre: nombre.get(id) ?? "?",
    centavos,
  });
  const deQuienes = cuentas.transferencias
    .filter((t) => t.a === yo)
    .map((t) => conNombre(t.de, t.centavos));
  const aQuienes = cuentas.transferencias
    .filter((t) => t.de === yo)
    .map((t) => conNombre(t.a, t.centavos));
  const suma = (lista: { centavos: number }[]) =>
    lista.reduce((total, x) => total + x.centavos, 0);
  return {
    teDeben: suma(deQuienes),
    debes: suma(aQuienes),
    deQuienes,
    aQuienes,
  };
}

export type PersonaMonto = ReturnType<typeof miResumen>["deQuienes"][number];

// Junta los montos de la misma persona (ej: lo que te debe Cabra en varias juntadas),
// de mayor a menor.
export function sumarPorPersona(listas: PersonaMonto[][]): PersonaMonto[] {
  const porId = new Map<PersonaId, PersonaMonto>();
  for (const x of listas.flat()) {
    const actual = porId.get(x.id);
    porId.set(x.id, actual ? { ...actual, centavos: actual.centavos + x.centavos } : x);
  }
  return [...porId.values()].sort((a, b) => b.centavos - a.centavos);
}
