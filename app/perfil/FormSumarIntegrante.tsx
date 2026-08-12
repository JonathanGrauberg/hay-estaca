"use client";

import { useActionState } from "react";
import { crearIntegrante } from "@/lib/actions/usuarios";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

export function FormSumarIntegrante() {
  const [state, formAction, pending] = useActionState(crearIntegrante, undefined);

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
          placeholder="Ej: Facundo"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="apodo" className={labelClass}>
          Apodo
        </label>
        <input
          id="apodo"
          name="apodo"
          type="text"
          required
          placeholder="Ej: Facu"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="telefono" className={labelClass}>
          Teléfono <span className="text-muted-foreground-2">(opcional)</span>
        </label>
        <input
          id="telefono"
          name="telefono"
          type="tel"
          placeholder="Ej: +5491122334455"
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Sumando…" : "Sumar integrante"}
      </button>
    </form>
  );
}
