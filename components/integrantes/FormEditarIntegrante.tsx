"use client";

import { useActionState } from "react";
import type { EditarIntegranteState } from "@/lib/actions/usuarios";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

interface FormEditarIntegranteProps {
  // editarIntegrante con el id del integrante ya bindeado.
  accion: (prevState: EditarIntegranteState, formData: FormData) => Promise<EditarIntegranteState>;
  valores: { nombre: string; apodo: string; telefono: string };
}

export function FormEditarIntegrante({ accion, valores }: FormEditarIntegranteProps) {
  const [state, formAction, pending] = useActionState(accion, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
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
            defaultValue={valores.nombre}
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
            defaultValue={valores.apodo}
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
          defaultValue={valores.telefono}
          placeholder="Ej: +5491122334455"
          className={inputClass}
        />
      </div>

      {state && "error" in state && <p className="text-sm text-primary">{state.error}</p>}
      {state && "ok" in state && <p className="text-sm text-foreground">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Guardar"}
      </button>
    </form>
  );
}
