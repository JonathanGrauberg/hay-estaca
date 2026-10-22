"use client";

import type { EstadoAsistencia } from "@/app/generated/prisma/enums";
import { Avatar } from "@/components/juntadas/Avatar";
import { RsvpBotones } from "@/components/juntadas/RsvpBotones";
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
  usuarioActualId: string;
}

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

export function AsistenciaPanel({ juntadaId, miembros, usuarioActualId }: AsistenciaPanelProps) {
  const quienSoy = miembros.find((miembro) => miembro.id === usuarioActualId) ?? null;

  return (
    <div className="flex flex-col gap-6">
      {quienSoy && (
        <section className="flex flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            TU ASISTENCIA
          </h2>
          <RsvpBotones juntadaId={juntadaId} estadoActual={quienSoy.estado} />
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
                  {miembro.id === usuarioActualId && (
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
