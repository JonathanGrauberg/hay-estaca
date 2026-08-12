"use client";

import { useActionState } from "react";
import { crearJuntada } from "@/lib/actions/juntadas";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

export function FormNuevaJuntada() {
  const [state, formAction, pending] = useActionState(crearJuntada, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className={labelClass}>
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          placeholder="Ej: Asado en lo de Facu"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="fecha" className={labelClass}>
            Fecha
          </label>
          <input id="fecha" name="fecha" type="date" required className={inputClass} />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="hora" className={labelClass}>
            Hora
          </label>
          <input id="hora" name="hora" type="time" required className={inputClass} />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ubicacion" className={labelClass}>
          Ubicación
        </label>
        <input
          id="ubicacion"
          name="ubicacion"
          type="text"
          required
          placeholder="Ej: Casa de Toto"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mensajeFomo" className={labelClass}>
          Mensaje FOMO <span className="text-muted-foreground-2">(opcional)</span>
        </label>
        <input
          id="mensajeFomo"
          name="mensajeFomo"
          type="text"
          placeholder="Ej: vaca abierta 🎂"
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Creando…" : "Crear juntada"}
      </button>
    </form>
  );
}
