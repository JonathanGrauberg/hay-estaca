"use client";

import { useState } from "react";
import { Fueguito } from "@/components/marca/Fueguito";

// Caen unas brasas, se prende el fueguito, se corre a la izquierda y aparece
// "ESTAQUEROS 2026". Va una vez por sesión del navegador (al abrir la app) y se
// saltea tocándola. Toda la animación es CSS (globals.css).
//
// Se renderiza en el servidor para que tape la pantalla desde el primer frame; si ya
// se vio en esta sesión, la oculta el script de bienvenidaScript.ts antes de pintar.

// Posición horizontal (en px desde el centro), demora y tamaño de cada brasa.
const BRASAS = [
  { x: -46, demora: 0, tamano: 6 },
  { x: 28, demora: 0.12, tamano: 5 },
  { x: -14, demora: 0.25, tamano: 7 },
  { x: 52, demora: 0.35, tamano: 4 },
  { x: -32, demora: 0.45, tamano: 5 },
  { x: 8, demora: 0.55, tamano: 6 },
  { x: 38, demora: 0.62, tamano: 4 },
];

export function Bienvenida() {
  const [salteada, setSalteada] = useState(false);
  const anio = new Date().getFullYear();

  if (salteada) {
    return null;
  }

  return (
    <div
      id="bienvenida"
      onClick={() => setSalteada(true)}
      className="bienvenida fixed inset-0 z-[100] flex items-center justify-center bg-background"
      aria-hidden="true"
    >
      <div className="relative flex items-center">
        {BRASAS.map((brasa, i) => (
          <span
            key={i}
            className="brasa absolute left-1/2 top-1/2 rounded-full"
            style={{
              width: brasa.tamano,
              height: brasa.tamano,
              marginLeft: brasa.x,
              animationDelay: `${brasa.demora}s`,
            }}
          />
        ))}

        <Fueguito className="bienvenida-fuego h-16 w-12 shrink-0 sm:h-20 sm:w-16" />

        <div className="bienvenida-texto overflow-hidden whitespace-nowrap">
          <p className="pl-3 font-heading text-5xl leading-none tracking-wide text-foreground sm:text-7xl">
            ESTAQUEROS
          </p>
          <p className="pl-3 font-heading text-xl leading-none tracking-[0.3em] text-primary sm:text-2xl">
            {anio}
          </p>
        </div>
      </div>
    </div>
  );
}
