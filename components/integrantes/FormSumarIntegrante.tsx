"use client";

import { useActionState } from "react";
import { crearIntegrante } from "@/lib/actions/usuarios";
import { CompartirAcceso } from "@/components/integrantes/CompartirAcceso";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

// Solo para el admin: suma a alguien y le muestra el PIN generado para compartírselo.
export function FormSumarIntegrante() {
  const [state, formAction, pending] = useActionState(crearIntegrante, undefined);
  const acceso = state && "pin" in state ? state : null;

  return (
    <div className="flex flex-col gap-4">
      {acceso && <CompartirAcceso apodo={acceso.apodo} pin={acceso.pin} />}

      {/* key: después de sumar a alguien el form vuelve a quedar vacío. */}
      <form key={acceso?.pin} action={formAction} className="flex flex-col gap-4">
        <div className="flex gap-3">
          <div className="flex flex-1 flex-col gap-1.5">
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
          <div className="flex flex-1 flex-col gap-1.5">
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

        {state && "error" in state && <p className="text-sm text-primary">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Sumando…" : "Sumar y generar PIN"}
        </button>
      </form>
    </div>
  );
}
