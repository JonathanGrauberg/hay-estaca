"use client";

import { useActionState } from "react";
import { cambiarPin } from "@/lib/actions/auth";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

export function FormCambiarPin() {
  const [state, formAction, pending] = useActionState(cambiarPin, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="pinActual" className={labelClass}>
            PIN actual
          </label>
          <input
            id="pinActual"
            name="pinActual"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="\d{4}"
            maxLength={4}
            required
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="pinNuevo" className={labelClass}>
            PIN nuevo
          </label>
          <input
            id="pinNuevo"
            name="pinNuevo"
            type="password"
            inputMode="numeric"
            autoComplete="new-password"
            pattern="\d{4}"
            maxLength={4}
            required
            className={inputClass}
          />
        </div>
      </div>

      {state && "error" in state && <p className="text-sm text-primary">{state.error}</p>}
      {state && "ok" in state && <p className="text-sm text-foreground">{state.ok}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : "Cambiar PIN"}
      </button>
    </form>
  );
}
