"use client";

import { useState, useSyncExternalStore } from "react";
import type { CSSProperties } from "react";
import { Cake } from "lucide-react";

interface CartelCumpleProps {
  // Día de hoy ("2026-5-15"): el cartel sale una vez por día en cada celu.
  clave: string;
  personas: { id: string; nombre: string }[];
  yoId: string | null;
}

const COLORES = ["#ffffff", "#ffd23f", "#3ec5ff", "#7cff6b", "#ff8fd8", "#1f1a17"];
const PAPELITOS = 70;
const BANDERINES = 14;

// Pseudo-azar fijo por índice: los papelitos quedan siempre iguales (sin Math.random
// en el render).
function azar(i: number, semilla: number) {
  const x = Math.sin(i * 12.9898 + semilla * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

function storageKey(clave: string) {
  return `hayestaca:cumple:${clave}`;
}

function yaLoVio(clave: string) {
  try {
    return window.localStorage.getItem(storageKey(clave)) === "1";
  } catch {
    return false;
  }
}

const nada = () => () => {};

function juntarNombres(nombres: string[]) {
  return nombres.length <= 1
    ? (nombres[0] ?? "")
    : `${nombres.slice(0, -1).join(", ")} y ${nombres[nombres.length - 1]}`;
}

// El cartel rojo de "¡Feliz cumple!" con guirnalda y papelitos. Sale al abrir la app el
// día del cumple, una vez por día en cada celu.
export function CartelCumple({ clave, personas, yoId }: CartelCumpleProps) {
  // En el servidor (y antes de leer el storage) cuenta como visto: no parpadea.
  const visto = useSyncExternalStore(
    nada,
    () => yaLoVio(clave),
    () => true,
  );
  const [cerrado, setCerrado] = useState(false);

  if (visto || cerrado || personas.length === 0) {
    return null;
  }

  const esMio = personas.some((p) => p.id === yoId);
  const nombres = juntarNombres(personas.map((p) => p.nombre));

  function cerrar() {
    try {
      window.localStorage.setItem(storageKey(clave), "1");
    } catch {
      // Sin storage: se cierra igual; al recargar vuelve a salir.
    }
    setCerrado(true);
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Feliz cumple ${nombres}`}
      className="fixed inset-0 z-[70] flex flex-col items-center justify-center overflow-hidden bg-primary px-6 text-center"
    >
      {/* Guirnalda de banderines arriba. */}
      <svg
        viewBox="0 0 400 70"
        preserveAspectRatio="none"
        className="guirnalda absolute inset-x-0 top-0 h-16 w-full sm:h-20"
        aria-hidden
      >
        <path
          d="M0 8 Q200 60 400 8"
          fill="none"
          stroke="#1f1a17"
          strokeWidth="2"
        />
        {Array.from({ length: BANDERINES }, (_, i) => {
          const t = (i + 0.5) / BANDERINES;
          const x = t * 400;
          // Altura de la curva en ese punto (la misma Q de arriba).
          const y = 8 + 2 * t * (1 - t) * 52;
          return (
            <path
              key={i}
              d={`M${x - 11} ${y} L${x + 11} ${y} L${x} ${y + 24} Z`}
              fill={COLORES[i % (COLORES.length - 1)]}
              stroke="#1f1a17"
              strokeWidth="1"
            />
          );
        })}
      </svg>

      {/* Papelitos que caen. */}
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {Array.from({ length: PAPELITOS }, (_, i) => (
          <span
            key={i}
            className="papelito"
            style={
              {
                left: `${azar(i, 1) * 100}%`,
                width: `${6 + azar(i, 2) * 6}px`,
                height: `${10 + azar(i, 3) * 8}px`,
                background: COLORES[Math.floor(azar(i, 4) * COLORES.length)],
                borderRadius: azar(i, 5) > 0.7 ? "50%" : "2px",
                animationDuration: `${3 + azar(i, 6) * 3}s`,
                animationDelay: `${-azar(i, 7) * 6}s`,
                "--deriva": `${(azar(i, 8) - 0.5) * 120}px`,
              } as CSSProperties
            }
          />
        ))}
      </div>

      <div className="relative flex max-w-sm flex-col items-center gap-4">
        <Cake className="cumple-torta h-16 w-16 text-white" strokeWidth={1.5} />
        <p className="font-heading text-6xl leading-none tracking-wide text-white sm:text-7xl">
          ¡FELIZ CUMPLE, {nombres.toUpperCase()}!
        </p>
        <p className="text-lg font-semibold text-white/90">
          Te lo deseamos todos los Estaqueros 🎉
        </p>
        <button
          type="button"
          onClick={cerrar}
          className="mt-4 rounded-full bg-white px-6 py-3 text-base font-bold text-primary active:scale-95"
        >
          {esMio
            ? "¡Gracias, Estaqueros!"
            : personas.length > 1
              ? "¡Que los cumplan felices!"
              : "¡Que los cumpla feliz!"}
        </button>
      </div>
    </div>
  );
}
