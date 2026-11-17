"use client";

import { useState, useTransition } from "react";
import { crearTemporada } from "@/lib/actions/votaciones";

// El admin arranca la temporada eligiendo el día de la despedida (la apertura).
export function CrearTemporada({ anioSugerido }: { anioSugerido: number }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const resultado = await crearTemporada(formData);
          if ("error" in resultado) {
            setError(resultado.error);
          }
        });
      }}
      className="flex flex-col gap-3 rounded-lg bg-card px-4 py-4"
    >
      <p className="text-sm font-semibold text-foreground">
        Arrancar la temporada {anioSugerido}
      </p>
      <label htmlFor="apertura" className="text-xs text-muted-foreground">
        ¿Qué día se abren los resultados? (la despedida de año)
      </label>
      <input
        id="apertura"
        type="date"
        name="apertura"
        required
        defaultValue={`${anioSugerido}-12-20`}
        className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
      />
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Creando…" : "Arrancar"}
      </button>
    </form>
  );
}
