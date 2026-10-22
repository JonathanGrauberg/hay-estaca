"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import { agregarInvitado, borrarInvitado } from "@/lib/actions/juntadas";

interface InvitadosSectionProps {
  juntadaId: string;
  invitados: { id: string; nombre: string; traidoPor: string | null }[];
}

export function InvitadosSection({ juntadaId, invitados }: InvitadosSectionProps) {
  const [state, formAction, pending] = useActionState(
    agregarInvitado.bind(null, juntadaId),
    undefined
  );

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        INVITADOS
      </h2>
      <p className="text-sm text-muted-foreground-2">
        Amigos o familiares que vienen a esta juntada. Entran en las cuentas y los juegos.
      </p>

      {invitados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {invitados.map((invitado) => (
            <li key={invitado.id} className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">{invitado.nombre}</p>
                {invitado.traidoPor && (
                  <p className="truncate text-xs text-muted-foreground-2">
                    Lo sumó {invitado.traidoPor}
                  </p>
                )}
              </div>
              <form action={borrarInvitado.bind(null, juntadaId, invitado.id)}>
                <button
                  type="submit"
                  aria-label={`Sacar a ${invitado.nombre}`}
                  className="text-muted-foreground-2 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-1.5">
        <div className="flex gap-2">
          <input
            type="text"
            name="nombre"
            required
            placeholder="Ej: el primo de Facu"
            className="flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "…" : "Sumar"}
          </button>
        </div>
        {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      </form>
    </section>
  );
}
