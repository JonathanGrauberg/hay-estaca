// Motor de "cuentas claras". Puro y sin dependencias (ni Prisma ni "@/") para poder
// probarlo con Node directo. Todo en centavos (enteros): nunca se pierde ni aparece
// un centavo, la suma de los saldos siempre da 0.
//
// Una persona se identifica como "u:<userId>" (integrante) o "i:<invitadoId>" (invitado).

export type PersonaId = string;

export interface GastoCalculo {
  montoCentavos: number;
  pagadoPor: PersonaId;
  participantes: PersonaId[];
}

export interface BonificadoCalculo {
  persona: PersonaId;
  // null = su parte se reparte entre los demás participantes de cada gasto.
  cubiertoPor: PersonaId | null;
}

export interface Transferencia {
  de: PersonaId;
  a: PersonaId;
  centavos: number;
}

export interface ResultadoCuentas {
  // Cuánto puso cada uno.
  pagado: Map<PersonaId, number>;
  // Cuánto le toca pagar a cada uno (ya con bonificados resueltos).
  parte: Map<PersonaId, number>;
  // pagado - parte: positivo = le deben, negativo = debe.
  saldo: Map<PersonaId, number>;
  transferencias: Transferencia[];
}

function sumar(mapa: Map<PersonaId, number>, persona: PersonaId, centavos: number) {
  mapa.set(persona, (mapa.get(persona) ?? 0) + centavos);
}

// Reparte en partes iguales; los centavos que sobran van de a uno a los primeros
// (ordenados por id, así el resultado no cambia según el orden de carga).
function repartir(centavos: number, personas: PersonaId[]) {
  const ordenadas = [...personas].sort();
  const base = Math.floor(centavos / ordenadas.length);
  let resto = centavos - base * ordenadas.length;
  return ordenadas.map((persona) => {
    const extra = resto > 0 ? 1 : 0;
    resto -= extra;
    return [persona, base + extra] as const;
  });
}

export function calcularCuentas(
  gastos: GastoCalculo[],
  bonificados: BonificadoCalculo[]
): ResultadoCuentas {
  const pagado = new Map<PersonaId, number>();
  const parte = new Map<PersonaId, number>();
  const bonificadoPor = new Map(bonificados.map((b) => [b.persona, b.cubiertoPor]));

  for (const gasto of gastos) {
    const participantes = [...new Set(gasto.participantes)];
    if (gasto.montoCentavos <= 0 || participantes.length === 0) {
      continue;
    }

    sumar(pagado, gasto.pagadoPor, gasto.montoCentavos);

    const pagantes = participantes.filter((persona) => !bonificadoPor.has(persona));
    let aRepartir = 0;

    for (const [persona, centavos] of repartir(gasto.montoCentavos, participantes)) {
      if (!bonificadoPor.has(persona)) {
        sumar(parte, persona, centavos);
        continue;
      }
      const cubiertoPor = bonificadoPor.get(persona);
      if (cubiertoPor) {
        sumar(parte, cubiertoPor, centavos);
      } else {
        aRepartir += centavos;
      }
    }

    if (aRepartir > 0) {
      if (pagantes.length > 0) {
        for (const [persona, centavos] of repartir(aRepartir, pagantes)) {
          sumar(parte, persona, centavos);
        }
      } else {
        // Todos los del gasto son invitados de honor sin nadie que los cubra: lo
        // absorbe el que pagó.
        sumar(parte, gasto.pagadoPor, aRepartir);
      }
    }
  }

  const saldo = new Map<PersonaId, number>();
  for (const persona of new Set([...pagado.keys(), ...parte.keys()])) {
    saldo.set(persona, (pagado.get(persona) ?? 0) - (parte.get(persona) ?? 0));
  }

  return { pagado, parte, saldo, transferencias: calcularTransferencias(saldo) };
}

// Greedy: el que más debe le paga al que más le deben, hasta saldar. Da como mucho
// n-1 transferencias, que para un grupo de amigos es lo mínimo en la práctica.
export function calcularTransferencias(saldo: Map<PersonaId, number>): Transferencia[] {
  const deudores = [...saldo]
    .filter(([, centavos]) => centavos < 0)
    .map(([persona, centavos]) => ({ persona, centavos: -centavos }));
  const acreedores = [...saldo]
    .filter(([, centavos]) => centavos > 0)
    .map(([persona, centavos]) => ({ persona, centavos }));

  const porMonto = (a: { persona: string; centavos: number }, b: { persona: string; centavos: number }) =>
    b.centavos - a.centavos || a.persona.localeCompare(b.persona);

  const transferencias: Transferencia[] = [];
  deudores.sort(porMonto);
  acreedores.sort(porMonto);

  while (deudores.length > 0 && acreedores.length > 0) {
    const deudor = deudores[0];
    const acreedor = acreedores[0];
    const centavos = Math.min(deudor.centavos, acreedor.centavos);

    transferencias.push({ de: deudor.persona, a: acreedor.persona, centavos });
    deudor.centavos -= centavos;
    acreedor.centavos -= centavos;

    if (deudor.centavos === 0) deudores.shift();
    if (acreedor.centavos === 0) acreedores.shift();
    deudores.sort(porMonto);
    acreedores.sort(porMonto);
  }

  return transferencias;
}
