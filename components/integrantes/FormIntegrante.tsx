"use client";

import { useActionState } from "react";
import type { CrearIntegranteState } from "@/lib/actions/usuarios";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

interface FormIntegranteProps {
  // crearIntegrante desde /perfil, o crearPrimerIntegrante desde /login con la base vacía.
  accion: (prevState: CrearIntegranteState, formData: FormData) => Promise<CrearIntegranteState>;
  labelBoton: string;
  labelPin: string;
}

export function FormIntegrante({ accion, labelBoton, labelPin }: FormIntegranteProps) {
  const [state, formAction, pending] = useActionState(accion, undefined);

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

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pin" className={labelClass}>
          {labelPin}
        </label>
        <input
          id="pin"
          name="pin"
          type="password"
          inputMode="numeric"
          autoComplete="new-password"
          pattern="\d{4}"
          maxLength={4}
          required
          placeholder="4 números"
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : labelBoton}
      </button>
    </form>
  );
}
