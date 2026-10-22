"use client";

import { Square, SquareCheck, Trash2 } from "lucide-react";
import type { TipoChecklistItem } from "@/app/generated/prisma/enums";
import { Avatar } from "@/components/juntadas/Avatar";
import {
  asignarChecklistItem,
  borrarChecklistItem,
  desasignarChecklistItem,
  togglearChecklistItem,
} from "@/lib/actions/checklist";
import { cn } from "@/lib/utils";

export interface ChecklistItemConAsignado {
  id: string;
  descripcion: string;
  completado: boolean;
  tipo: TipoChecklistItem;
  asignadoA: { id: string; nombre: string; apodo: string; avatarUrl: string | null } | null;
}

interface ChecklistItemRowProps {
  juntadaId: string;
  item: ChecklistItemConAsignado;
  miembros: { id: string; nombre: string; apodo: string }[];
  usuarioActualId: string;
}

export function ChecklistItemRow({ juntadaId, item, miembros, usuarioActualId }: ChecklistItemRowProps) {
  const esGrupal = item.tipo === "grupal";
  const esElAsignado = esGrupal && item.asignadoA !== null && item.asignadoA.id === usuarioActualId;
  const puedeTogglear = esGrupal && esElAsignado;

  return (
    <li className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5">
      {esGrupal && (
        <form action={togglearChecklistItem.bind(null, juntadaId, item.id, !item.completado)}>
          <button
            type="submit"
            disabled={!puedeTogglear}
            aria-label={item.completado ? "Marcar como pendiente" : "Marcar como completado"}
            title={
              item.asignadoA === null
                ? "Asigná el item antes de poder tildarlo"
                : !esElAsignado
                  ? `Solo ${item.asignadoA.apodo} puede tildar este item`
                  : undefined
            }
            className={cn(
              item.completado ? "text-primary" : "text-muted-foreground-2",
              !puedeTogglear && "cursor-not-allowed opacity-40"
            )}
          >
            {item.completado ? <SquareCheck className="h-5 w-5" /> : <Square className="h-5 w-5" />}
          </button>
        </form>
      )}

      <div className="min-w-0 flex-1">
        <p
          className={cn(
            "text-sm text-foreground",
            item.completado && "text-muted-foreground-2 line-through"
          )}
        >
          {item.descripcion}
        </p>

        {esGrupal &&
          (item.asignadoA ? (
            <div className="mt-1 flex items-center gap-1.5">
              <Avatar
                nombre={item.asignadoA.nombre}
                apodo={item.asignadoA.apodo}
                avatarUrl={item.asignadoA.avatarUrl}
                className="h-6 w-6 shrink-0 border border-border text-[9px] text-muted-foreground-2"
              />
              <span className="text-xs text-muted-foreground-2">{item.asignadoA.apodo}</span>
              {esElAsignado && (
                <form action={desasignarChecklistItem.bind(null, juntadaId, item.id)}>
                  <button
                    type="submit"
                    className="text-xs text-muted-foreground-2 underline hover:text-primary"
                  >
                    Desasignarme
                  </button>
                </form>
              )}
            </div>
          ) : (
            <form action={asignarChecklistItem.bind(null, juntadaId, item.id)} className="mt-1">
              <select
                name="userId"
                defaultValue=""
                onChange={(event) => event.currentTarget.form?.requestSubmit()}
                className="rounded-md border border-border bg-card px-2 py-1 text-xs text-foreground outline-none focus:border-primary"
              >
                <option value="" disabled className="bg-card text-muted-foreground-2">
                  Asignar a…
                </option>
                {miembros.map((miembro) => (
                  <option key={miembro.id} value={miembro.id} className="bg-card text-foreground">
                    {miembro.apodo || miembro.nombre}
                  </option>
                ))}
              </select>
            </form>
          ))}
      </div>

      <form
        action={borrarChecklistItem.bind(null, juntadaId, item.id)}
        onSubmit={(event) => {
          if (!window.confirm(`¿Borrar "${item.descripcion}"?`)) {
            event.preventDefault();
          }
        }}
      >
        <button
          type="submit"
          aria-label="Borrar item"
          className="text-muted-foreground-2 hover:text-primary"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </form>
    </li>
  );
}
