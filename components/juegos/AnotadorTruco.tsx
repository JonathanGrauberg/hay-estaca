"use client";

import { useState, useSyncExternalStore } from "react";
import { CircleHelp, Minus, Plus, RotateCcw, X } from "lucide-react";
import {
  MITAD,
  PARTIDA_NUEVA,
  enLasBuenas,
  ganador,
  rayasPorCuadrado,
  sumar,
  valorFaltaEnvido,
  type Equipo,
  type Limite,
  type PartidaTruco,
} from "@/lib/juegos/truco";
import { CuadradoFosforos } from "@/components/juegos/Fosforos";
import { cn } from "@/lib/utils";

// La partida vive en el celular (localStorage): si alguien recarga o se le bloquea la
// pantalla, no se pierden los puntos. Es por dispositivo, no se comparte.
const STORAGE_KEY = "hayestaca:truco";
const listeners = new Set<() => void>();

// Respaldo en memoria para cuando localStorage no está disponible (modo privado).
let respaldo: string | null = null;

function leerGuardado() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? respaldo;
  } catch {
    return respaldo;
  }
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function guardar(partida: PartidaTruco) {
  respaldo = JSON.stringify(partida);
  try {
    window.localStorage.setItem(STORAGE_KEY, respaldo);
  } catch {
    // Sin storage: queda el respaldo en memoria mientras la pestaña esté abierta.
  }
  listeners.forEach((listener) => listener());
}

function parsear(crudo: string | null): PartidaTruco {
  if (!crudo) return PARTIDA_NUEVA;
  try {
    const p = JSON.parse(crudo) as Partial<PartidaTruco>;
    const limite: Limite = p.limite === 15 ? 15 : 30;
    const ok = (n: unknown) => (typeof n === "number" && n >= 0 ? Math.min(n, limite) : 0);
    return { nos: ok(p.nos), ellos: ok(p.ellos), limite };
  } catch {
    return PARTIDA_NUEVA;
  }
}

const NOMBRES: Record<Equipo, string> = { nos: "NOS", ellos: "ELLOS" };

function Columna({
  equipo,
  partida,
  onCambiar,
}: {
  equipo: Equipo;
  partida: PartidaTruco;
  onCambiar: (delta: number) => void;
}) {
  const puntos = partida[equipo];
  const cuadrados = rayasPorCuadrado(puntos, partida.limite);
  const conDivisoria = partida.limite === 30;
  const mitadCuadrados = MITAD / 5;

  return (
    <div className="flex flex-1 flex-col items-center gap-3">
      <p className="font-heading text-3xl tracking-wide text-primary">{NOMBRES[equipo]}</p>
      <p className="font-heading text-6xl leading-none text-foreground">{puntos}</p>
      <p className="h-4 text-[11px] font-semibold tracking-[0.15em] text-primary">
        {conDivisoria
          ? enLasBuenas(puntos, partida.limite)
            ? "EN LAS BUENAS"
            : "EN LAS MALAS"
          : ""}
      </p>

      <div className="flex flex-col items-center gap-1">
        {cuadrados.map((rayas, i) => (
          <div key={i} className="flex flex-col items-center">
            {conDivisoria && i === mitadCuadrados && (
              <div
                className="my-2 h-1 w-20 rounded-full bg-primary"
                aria-label="Divisoria malas y buenas"
              />
            )}
            <CuadradoFosforos rayas={rayas} />
          </div>
        ))}
      </div>

      <div className="mt-auto flex w-full gap-2 pt-2">
        <button
          type="button"
          onClick={() => onCambiar(-1)}
          aria-label={`Restar un punto a ${NOMBRES[equipo]}`}
          className="flex h-14 flex-1 items-center justify-center rounded-lg border-2 border-primary text-primary active:scale-95"
        >
          <Minus className="h-6 w-6" />
        </button>
        <button
          type="button"
          onClick={() => onCambiar(1)}
          aria-label={`Sumar un punto a ${NOMBRES[equipo]}`}
          className="flex h-14 flex-[2] items-center justify-center rounded-lg bg-primary text-primary-foreground active:scale-95"
        >
          <Plus className="h-7 w-7" />
        </button>
      </div>
    </div>
  );
}

function Reglas({ partida, onCerrar }: { partida: PartidaTruco; onCerrar: () => void }) {
  const falta = valorFaltaEnvido(partida);
  const fila = "flex justify-between gap-4 border-b border-primary/20 py-1.5";

  return (
    <div
      className="fixed inset-0 z-20 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
      onClick={onCerrar}
    >
      <div
        className="max-h-[85vh] w-full max-w-md overflow-y-auto rounded-lg border-2 border-primary bg-card p-5"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="mb-3 flex items-center justify-between">
          <h2 className="font-heading text-3xl tracking-wide text-primary">REGLAS</h2>
          <button
            type="button"
            onClick={onCerrar}
            aria-label="Cerrar reglas"
            className="text-primary"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <h3 className="mt-2 text-xs font-semibold tracking-[0.15em] text-primary">
          ENVIDO (QUERIDO)
        </h3>
        <ul className="text-sm text-foreground">
          <li className={fila}>
            <span>Envido</span>
            <span>2</span>
          </li>
          <li className={fila}>
            <span>Real envido</span>
            <span>3</span>
          </li>
          <li className={fila}>
            <span>Envido + envido</span>
            <span>4</span>
          </li>
          <li className={fila}>
            <span>Envido + real envido</span>
            <span>5</span>
          </li>
          <li className={fila}>
            <span>Falta envido</span>
            <span className="text-primary">
              {falta === "partido" ? "el partido" : `${falta} (ahora)`}
            </span>
          </li>
        </ul>
        <p className="mt-1 text-xs text-foreground/80">
          Falta envido: si el que va ganando está en las malas se juega el partido; si no, vale lo
          que le falta para ganar.
        </p>

        <h3 className="mt-4 text-xs font-semibold tracking-[0.15em] text-primary">
          TRUCO (QUERIDO)
        </h3>
        <ul className="text-sm text-foreground">
          <li className={fila}>
            <span>Truco</span>
            <span>2</span>
          </li>
          <li className={fila}>
            <span>Retruco</span>
            <span>3</span>
          </li>
          <li className={fila}>
            <span>Vale cuatro</span>
            <span>4</span>
          </li>
        </ul>

        <h3 className="mt-4 text-xs font-semibold tracking-[0.15em] text-primary">
          NO QUIERO: EL RIVAL SUMA LO ANTERIOR
        </h3>
        <ul className="text-sm text-foreground">
          <li className={fila}>
            <span>Truco no querido</span>
            <span>1</span>
          </li>
          <li className={fila}>
            <span>Retruco no querido</span>
            <span>2</span>
          </li>
          <li className={fila}>
            <span>Vale cuatro no querido</span>
            <span>3</span>
          </li>
          <li className={fila}>
            <span>Envido no querido</span>
            <span>1</span>
          </li>
        </ul>
      </div>
    </div>
  );
}

export function AnotadorTruco() {
  const crudo = useSyncExternalStore(subscribe, leerGuardado, () => null);
  const partida = parsear(crudo);
  const [mostrarReglas, setMostrarReglas] = useState(false);
  const gano = ganador(partida);

  function cambiar(equipo: Equipo, delta: number) {
    guardar(sumar(partida, equipo, delta));
  }

  function cambiarLimite(limite: Limite) {
    if (limite === partida.limite) return;
    if (
      (partida.nos > 0 || partida.ellos > 0) &&
      !window.confirm(`¿Pasar a ${limite}? Se reinicia la partida.`)
    ) {
      return;
    }
    guardar({ ...PARTIDA_NUEVA, limite });
  }

  function reiniciar() {
    if (window.confirm("¿Arrancar una partida nueva? Se borran los puntos.")) {
      guardar({ ...PARTIDA_NUEVA, limite: partida.limite });
    }
  }

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex rounded-full border-2 border-primary p-0.5">
          {([30, 15] as const).map((limite) => (
            <button
              key={limite}
              type="button"
              onClick={() => cambiarLimite(limite)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-bold",
                partida.limite === limite ? "bg-primary text-primary-foreground" : "text-primary",
              )}
            >
              A {limite}
            </button>
          ))}
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setMostrarReglas(true)}
            aria-label="Ver reglas"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary text-primary"
          >
            <CircleHelp className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={reiniciar}
            aria-label="Partida nueva"
            className="flex h-9 w-9 items-center justify-center rounded-full border-2 border-primary text-primary"
          >
            <RotateCcw className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="relative flex flex-1 gap-3 rounded-lg border-2 border-primary/40 bg-card p-3">
        <Columna equipo="nos" partida={partida} onCambiar={(d) => cambiar("nos", d)} />
        <div className="w-0.5 self-stretch rounded-full bg-primary/40" />
        <Columna equipo="ellos" partida={partida} onCambiar={(d) => cambiar("ellos", d)} />

        {gano && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/90 backdrop-blur-sm">
            <p className="font-heading text-6xl tracking-wide text-primary">
              {gano === "nos" ? "¡GANAMOS!" : "¡GANARON ELLOS!"}
            </p>
            <p className="font-heading text-3xl tracking-wide text-foreground">
              {gano === "nos" ? "NOS" : "ELLOS"} {partida[gano]} ·{" "}
              {gano === "nos" ? partida.ellos : partida.nos}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => cambiar(gano, -1)}
                className="rounded-full border-2 border-primary px-4 py-2 text-sm font-bold text-primary"
              >
                Me equivoqué
              </button>
              <button
                type="button"
                onClick={() => guardar({ ...PARTIDA_NUEVA, limite: partida.limite })}
                className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
              >
                Otra partida
              </button>
            </div>
          </div>
        )}
      </div>

      {mostrarReglas && <Reglas partida={partida} onCerrar={() => setMostrarReglas(false)} />}
    </div>
  );
}
