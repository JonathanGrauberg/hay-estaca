"use client";

import { useActionState } from "react";
import type { EstadoAsistencia } from "@/app/generated/prisma/enums";
import { actualizarAsistencia } from "@/lib/actions/asistencias";
import { cn } from "@/lib/utils";

const OPCIONES: { estado: EstadoAsistencia; label: string }[] = [
  { estado: "voy", label: "Voy" },
  { estado: "no_voy", label: "No voy" },
  { estado: "en_duda", label: "En duda" },
];

interface RsvpBotonesProps {
  juntadaId: string;
  // Lo que respondió el usuario logueado (null si todavía no respondió).
  estadoActual: EstadoAsistencia | null;
}

// Voy / No voy / En duda del usuario logueado. Se usa en el inicio (próxima juntada)
// y en el detalle de cada juntada.
export function RsvpBotones({ juntadaId, estadoActual }: RsvpBotonesProps) {
  const [state, formAction, pending] = useActionState(actualizarAsistencia, undefined);

  return (
    <div className="flex flex-col gap-2">
      <form action={formAction} className="flex gap-2">
        <input type="hidden" name="juntadaId" value={juntadaId} />
        {OPCIONES.map((opcion) => {
          const activo = estadoActual === opcion.estado;
          return (
            <button
              key={opcion.estado}
              type="submit"
              name="estado"
              value={opcion.estado}
              disabled={pending}
              className={cn(
                "flex-1 rounded-full px-3 py-2 text-sm font-semibold transition-colors disabled:opacity-60",
                activo
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground-2 hover:text-foreground"
              )}
            >
              {opcion.label}
            </button>
          );
        })}
      </form>
      {state?.error && <p className="text-sm text-primary">{state.error}</p>}
    </div>
  );
}
