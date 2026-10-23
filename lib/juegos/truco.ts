// Anotador de truco: lógica pura (sin React) para poder probarla suelta.

export type Equipo = "nos" | "ellos";
export type Limite = 15 | 30;

export interface PartidaTruco {
  nos: number;
  ellos: number;
  limite: Limite;
}

export const PARTIDA_NUEVA: PartidaTruco = { nos: 0, ellos: 0, limite: 30 };

// Cada cuadrado de fósforos son 5 puntos: 4 rayas para los lados y la 5ta en diagonal.
export const PUNTOS_POR_CUADRADO = 5;

// A 30 se juega en "malas" hasta 15 y en "buenas" de 15 a 30. A 15 no hay malas ni buenas.
export const MITAD = 15;

export function sumar(partida: PartidaTruco, equipo: Equipo, delta: number): PartidaTruco {
  const puntos = Math.min(Math.max(partida[equipo] + delta, 0), partida.limite);
  return { ...partida, [equipo]: puntos };
}

export function ganador(partida: PartidaTruco): Equipo | null {
  if (partida.nos >= partida.limite) return "nos";
  if (partida.ellos >= partida.limite) return "ellos";
  return null;
}

// Rayas de cada cuadrado para un equipo: [5, 5, 3, 0, 0, 0] = 13 puntos a 30.
export function rayasPorCuadrado(puntos: number, limite: Limite) {
  const cuadrados = limite / PUNTOS_POR_CUADRADO;
  return Array.from({ length: cuadrados }, (_, i) =>
    Math.min(Math.max(puntos - i * PUNTOS_POR_CUADRADO, 0), PUNTOS_POR_CUADRADO)
  );
}

export function enLasBuenas(puntos: number, limite: Limite) {
  return limite === 30 && puntos >= MITAD;
}

// Cuánto vale la falta envido ahora. A 30: si el que va ganando todavía está en las
// malas, se juega el partido; si no, vale lo que le falta para llegar a 30. A 15:
// lo que le falta al que va ganando para llegar a 15.
export function valorFaltaEnvido(partida: PartidaTruco): number | "partido" {
  const lider = Math.max(partida.nos, partida.ellos);
  if (partida.limite === 30 && lider < MITAD) return "partido";
  return partida.limite - lider;
}
