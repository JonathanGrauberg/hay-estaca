"use client";

import { useActionState, useState } from "react";
import type { EstadoAsistencia } from "@/app/generated/prisma/enums";
import { actualizarAsistencia } from "@/lib/actions/asistencias";
import { Avatar } from "@/components/juntadas/Avatar";
import { cn } from "@/lib/utils";

export interface MiembroConAsistencia {
  id: string;
  nombre: string;
  apodo: string;
  avatarUrl: string | null;
  estado: EstadoAsistencia | null;
}

interface AsistenciaPanelProps {
  juntadaId: string;
  miembros: MiembroConAsistencia[];
}

const OPCIONES: { estado: EstadoAsistencia; label: string }[] = [
  { estado: "voy", label: "Voy" },
  { estado: "no_voy", label: "No voy" },
  { estado: "en_duda", label: "En duda" },
];

function labelEstado(estado: EstadoAsistencia | null) {
  switch (estado) {
    case "voy":
      return "Voy";
    case "no_voy":
      return "No voy";
    case "en_duda":
      return "En duda";
    default:
      return "Sin responder";
  }
}

function colorEstado(estado: EstadoAsistencia | null) {
  return estado === "voy" ? "text-primary" : "text-muted-foreground-2";
}

export function AsistenciaPanel({ juntadaId, miembros }: AsistenciaPanelProps) {
  // TODO: reemplazar por auth real cuando la implementemos. Por ahora "quién sos" es
  // un selector a mano en el cliente, sin persistir entre sesiones ni verificar nada.
  const [quienSoyId, setQuienSoyId] = useState<string | null>(null);
  const [state, formAction, pending] = useActionState(actualizarAsistencia, undefined);

  const quienSoy = miembros.find((miembro) => miembro.id === quienSoyId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          ¿QUIÉN SOS?
        </h2>
        <div className="flex gap-4 overflow-x-auto px-1 py-1">
          {miembros.map((miembro) => (
            <button
              key={miembro.id}
              type="button"
              onClick={() => setQuienSoyId(miembro.id)}
              className="flex shrink-0 flex-col items-center gap-1.5"
            >
              <Avatar
                nombre={miembro.nombre}
                apodo={miembro.apodo}
                avatarUrl={miembro.avatarUrl}
                className={cn(
                  miembro.id === quienSoyId
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground-2"
                )}
              />
              <span className="max-w-14 truncate text-xs text-muted-foreground-2">
                {miembro.apodo || miembro.nombre}
              </span>
            </button>
          ))}
        </div>
      </section>

      {quienSoy && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            TU ASISTENCIA
          </h2>
          <form action={formAction} className="flex gap-2">
            <input type="hidden" name="juntadaId" value={juntadaId} />
            <input type="hidden" name="userId" value={quienSoy.id} />
            {OPCIONES.map((opcion) => {
              const activo = quienSoy.estado === opcion.estado;
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
                      : "bg-card text-muted-foreground-2 hover:text-foreground"
                  )}
                >
                  {opcion.label}
                </button>
              );
            })}
          </form>
          {state?.error && <p className="text-sm text-primary">{state.error}</p>}
        </section>
      )}

      <section className="flex flex-col gap-2">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          INTEGRANTES
        </h2>
        <ul className="flex flex-col gap-2">
          {miembros.map((miembro) => (
            <li
              key={miembro.id}
              className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5"
            >
              <Avatar
                nombre={miembro.nombre}
                apodo={miembro.apodo}
                avatarUrl={miembro.avatarUrl}
                className="h-9 w-9 shrink-0 border-border text-xs text-muted-foreground-2"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {miembro.apodo}
                  {miembro.id === quienSoyId && (
                    <span className="text-muted-foreground-2"> (vos)</span>
                  )}
                </p>
              </div>
              <span className={cn("shrink-0 text-xs font-semibold", colorEstado(miembro.estado))}>
                {labelEstado(miembro.estado)}
              </span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
