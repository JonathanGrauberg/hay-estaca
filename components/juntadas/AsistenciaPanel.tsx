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

// La lista de la juntada: primero los que van, y aparte los que todavía no.
const GRUPOS: { titulo: string; estado: EstadoAsistencia | null }[] = [
  { titulo: "EN DUDA", estado: "en_duda" },
  { titulo: "NO VAN", estado: "no_voy" },
  { titulo: "SIN RESPONDER", estado: null },
];

export function AsistenciaPanel({ juntadaId, miembros, usuarioActualId }: AsistenciaPanelProps) {
  const quienSoy = miembros.find((miembro) => miembro.id === usuarioActualId) ?? null;
  const van = miembros.filter((miembro) => miembro.estado === "voy");
  const nombre = (miembro: MiembroConAsistencia) => miembro.apodo || miembro.nombre;

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
          VAN · {van.length}
        </h2>
        {van.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
            Todavía nadie confirmó.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {van.map((miembro) => (
              <li
                key={miembro.id}
                className="flex items-center gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-2.5"
              >
                <Avatar
                  nombre={miembro.nombre}
                  apodo={miembro.apodo}
                  avatarUrl={miembro.avatarUrl}
                  className="h-9 w-9 shrink-0 border-primary text-xs text-primary"
                />
                <p className="min-w-0 flex-1 truncate text-sm font-medium text-foreground">
                  {nombre(miembro)}
                  {miembro.id === usuarioActualId && (
                    <span className="text-muted-foreground-2"> (vos)</span>
                  )}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {GRUPOS.map((grupo) => {
        const enGrupo = miembros.filter((miembro) => miembro.estado === grupo.estado);
        if (enGrupo.length === 0) {
          return null;
        }
        return (
          <section key={grupo.titulo} className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
              {grupo.titulo} · {enGrupo.length}
            </h2>
            <ul className="flex flex-wrap gap-1.5">
              {enGrupo.map((miembro) => (
                <li
                  key={miembro.id}
                  className={cn(
                    "rounded-full bg-card px-3 py-1 text-xs",
                    miembro.id === usuarioActualId
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground"
                  )}
                >
                  {nombre(miembro)}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
