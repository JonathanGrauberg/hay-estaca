"use client";

import { useActionState } from "react";
import { X } from "lucide-react";
import { bonificar, quitarBonificado } from "@/lib/actions/gastos";

const selectClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none focus:border-primary";

interface BonificadosSectionProps {
  juntadaId: string;
  personas: { id: string; nombre: string; esInvitado: boolean }[];
  bonificados: { id: string; persona: string; cubiertoPor: string | null }[];
}

export function BonificadosSection({ juntadaId, personas, bonificados }: BonificadosSectionProps) {
  const [state, formAction, pending] = useActionState(bonificar.bind(null, juntadaId), undefined);
  const nombre = (id: string) => personas.find((persona) => persona.id === id)?.nombre ?? "?";

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        INVITADOS DE HONOR
      </h2>
      <p className="text-sm text-muted-foreground-2">
        No pagan su parte (cumpleaños, anda corto). Se reparte entre el resto o la cubre alguien.
      </p>

      {bonificados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {bonificados.map((bonificado) => (
            <li
              key={bonificado.id}
              className="flex items-center gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {nombre(bonificado.persona)}
                </p>
                <p className="truncate text-xs text-muted-foreground-2">
                  {bonificado.cubiertoPor
                    ? `Lo cubre ${nombre(bonificado.cubiertoPor)}`
                    : "Se reparte entre el resto"}
                </p>
              </div>
              <form action={quitarBonificado.bind(null, juntadaId, bonificado.id)}>
                <button
                  type="submit"
                  aria-label={`${nombre(bonificado.persona)} vuelve a pagar`}
                  className="text-muted-foreground-2 hover:text-primary"
                >
                  <X className="h-4 w-4" />
                </button>
              </form>
            </li>
          ))}
        </ul>
      )}

      <form action={formAction} className="flex flex-col gap-2">
        <div className="flex gap-2">
          <select name="persona" required defaultValue="" className={selectClass}>
            <option value="" disabled className="bg-card">
              No paga…
            </option>
            {personas.map((persona) => (
              <option key={persona.id} value={persona.id} className="bg-card">
                {persona.nombre}
                {persona.esInvitado ? " (invitado)" : ""}
              </option>
            ))}
          </select>
          <select name="cubiertoPor" defaultValue="" className={selectClass}>
            <option value="" className="bg-card">
              Entre todos
            </option>
            {personas
              .filter((persona) => !persona.esInvitado)
              .map((persona) => (
                <option key={persona.id} value={persona.id} className="bg-card">
                  Lo cubre {persona.nombre}
                </option>
              ))}
          </select>
        </div>
        <button
          type="submit"
          disabled={pending}
          className="rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Marcar invitado de honor"}
        </button>
        {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      </form>
    </section>
  );
}
