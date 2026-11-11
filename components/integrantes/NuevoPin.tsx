"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { generarNuevoPin } from "@/lib/actions/usuarios";
import { CompartirAcceso } from "@/components/integrantes/CompartirAcceso";

// Solo para el admin: le genera un PIN nuevo a alguien que no sabe el suyo.
export function NuevoPin({ userId, apodo }: { userId: string; apodo: string }) {
  const [state, formAction, pending] = useActionState(
    generarNuevoPin.bind(null, userId),
    undefined
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">ACCESO</h2>
      {state && "pin" in state ? (
        <CompartirAcceso apodo={state.apodo} pin={state.pin} />
      ) : (
        <form
          action={formAction}
          onSubmit={(event) => {
            if (!window.confirm(`¿Generar un PIN nuevo para ${apodo}? El de ahora deja de andar.`)) {
              event.preventDefault();
            }
          }}
          className="flex flex-col gap-2"
        >
          <p className="text-sm text-muted-foreground">
            Si {apodo} no sabe su PIN, generale uno nuevo y mandáselo.
          </p>
          <button
            type="submit"
            disabled={pending}
            className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-foreground disabled:opacity-60"
          >
            <KeyRound className="h-4 w-4" />
            {pending ? "Generando…" : "Generar PIN nuevo"}
          </button>
          {state && "error" in state && <p className="text-sm text-primary">{state.error}</p>}
        </form>
      )}
    </section>
  );
}
