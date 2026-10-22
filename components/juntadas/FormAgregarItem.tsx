"use client";

import { useActionState } from "react";
import type { TipoChecklistItem } from "@/app/generated/prisma/enums";
import { crearChecklistItem } from "@/lib/actions/checklist";

interface FormAgregarItemProps {
  juntadaId: string;
  tipo: TipoChecklistItem;
}

export function FormAgregarItem({ juntadaId, tipo }: FormAgregarItemProps) {
  const [state, formAction, pending] = useActionState(
    crearChecklistItem.bind(null, juntadaId, tipo),
    undefined
  );

  return (
    <form action={formAction} className="flex flex-col gap-1.5">
      <div className="flex gap-2">
        <input
          type="text"
          name="descripcion"
          required
          placeholder={tipo === "grupal" ? "Ej: Hielo" : "Ej: Traé tu propia silla"}
          className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "…" : "Agregar"}
        </button>
      </div>
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
    </form>
  );
}
