"use client";

import { useActionState } from "react";
import { guardarAlias } from "@/lib/actions/usuarios";

export function FormAlias({ aliasCvu }: { aliasCvu: string }) {
  const [state, formAction, pending] = useActionState(guardarAlias, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          name="aliasCvu"
          type="text"
          defaultValue={aliasCvu}
          autoCapitalize="none"
          autoCorrect="off"
          placeholder="Ej: facu.asado.mp"
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "…" : "Guardar"}
        </button>
      </div>
      {state && "error" in state && <p className="text-sm text-primary">{state.error}</p>}
      {state && "ok" in state && <p className="text-sm text-foreground">{state.ok}</p>}
    </form>
  );
}
