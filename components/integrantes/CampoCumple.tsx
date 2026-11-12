"use client";

import { useState } from "react";
import { MESES, diasDelMes } from "@/lib/cumples";

const selectClass =
  "rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

// Día y mes del cumple (sin año). Manda "cumpleDia" y "cumpleMes".
export function CampoCumple({
  dia,
  mes,
}: {
  dia?: number | null;
  mes?: number | null;
}) {
  const [mesElegido, setMesElegido] = useState(mes ?? 0);
  const [diaElegido, setDiaElegido] = useState(dia ?? 0);
  const tope = mesElegido ? diasDelMes(mesElegido) : 31;

  return (
    <div className="flex flex-col gap-1.5">
      <p className="text-sm font-medium text-foreground">
        Cumpleaños <span className="text-muted-foreground-2">(opcional)</span>
      </p>
      <div className="flex gap-2">
        <select
          name="cumpleDia"
          value={diaElegido}
          onChange={(event) => setDiaElegido(Number(event.target.value))}
          aria-label="Día del cumple"
          className={`${selectClass} w-24`}
        >
          <option value={0} className="bg-card">
            Día
          </option>
          {Array.from({ length: tope }, (_, i) => i + 1).map((d) => (
            <option key={d} value={d} className="bg-card">
              {d}
            </option>
          ))}
        </select>
        <select
          name="cumpleMes"
          value={mesElegido}
          onChange={(event) => {
            const nuevo = Number(event.target.value);
            setMesElegido(nuevo);
            if (nuevo && diaElegido > diasDelMes(nuevo)) {
              setDiaElegido(diasDelMes(nuevo));
            }
          }}
          aria-label="Mes del cumple"
          className={`${selectClass} flex-1`}
        >
          <option value={0} className="bg-card">
            Mes
          </option>
          {MESES.map((nombre, i) => (
            <option key={nombre} value={i + 1} className="bg-card">
              {nombre[0].toUpperCase() + nombre.slice(1)}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
}
