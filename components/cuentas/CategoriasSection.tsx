"use client";

import { useActionState, useOptimistic, useTransition } from "react";
import { Check, Plus, Trash2 } from "lucide-react";
import {
  borrarCategoria,
  crearCategorias,
  marcarEnCategoria,
  marcarTodosEnCategoria,
} from "@/lib/actions/gastos";
import type { CategoriaVista } from "@/lib/cuentas/datos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { cn } from "@/lib/utils";

const SUGERENCIAS = ["Comida", "Bebida", "Picada", "Extras"];

interface PersonaChip {
  id: string;
  nombre: string;
  esInvitado: boolean;
}

interface CategoriasSectionProps {
  juntadaId: string;
  categorias: CategoriaVista[];
  personas: PersonaChip[];
  // Categorías con gastos cargados: no se pueden borrar.
  conGastos: string[];
  // false cuando las cuentas ya se dividieron.
  editable: boolean;
}

export function CategoriasSection({
  juntadaId,
  categorias,
  personas,
  conGastos,
  editable,
}: CategoriasSectionProps) {
  const [state, formAction, pending] = useActionState(
    crearCategorias.bind(null, juntadaId),
    undefined
  );
  const existentes = new Set(categorias.map((c) => c.nombre.toLowerCase()));
  const sugerencias = SUGERENCIAS.filter((s) => !existentes.has(s.toLowerCase()));

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              name="nombres"
              type="text"
              placeholder="Ej: comida, bebidas, picada, extras"
              aria-label="Qué dividimos"
              className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Agregar
            </button>
          </div>
          {sugerencias.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {sugerencias.map((sugerencia) => (
                <button
                  key={sugerencia}
                  type="submit"
                  name="nombres"
                  value={sugerencia}
                  disabled={pending}
                  className="rounded-full bg-secondary px-3 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
                >
                  + {sugerencia}
                </button>
              ))}
            </div>
          )}
          {state?.error && <p className="text-sm text-primary">{state.error}</p>}
        </form>
      )}

      {categorias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
          Todavía no hay nada para dividir. Agregá comida, bebida o lo que haya habido, y
          tildá quién participó de cada cosa.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {categorias.map((categoria) => (
            <CategoriaCard
              key={categoria.id}
              juntadaId={juntadaId}
              categoria={categoria}
              personas={personas}
              borrable={editable && !conGastos.includes(categoria.id)}
              editable={editable}
            />
          ))}
        </ul>
      )}
    </div>
  );
}

function CategoriaCard({
  juntadaId,
  categoria,
  personas,
  borrable,
  editable,
}: {
  juntadaId: string;
  categoria: CategoriaVista;
  personas: PersonaChip[];
  borrable: boolean;
  editable: boolean;
}) {
  const [, startTransition] = useTransition();
  const [tildados, cambiarTildados] = useOptimistic(
    new Set(categoria.participantes),
    (_actual: Set<string>, nuevos: Set<string>) => nuevos
  );

  function alternar(persona: string) {
    const incluido = !tildados.has(persona);
    const nuevos = new Set(tildados);
    if (incluido) {
      nuevos.add(persona);
    } else {
      nuevos.delete(persona);
    }
    startTransition(async () => {
      cambiarTildados(nuevos);
      await marcarEnCategoria(juntadaId, categoria.id, persona, incluido);
    });
  }

  function marcarTodos(ids: string[]) {
    startTransition(async () => {
      cambiarTildados(new Set(ids));
      await marcarTodosEnCategoria(juntadaId, categoria.id, ids);
    });
  }

  const visibles = editable ? personas : personas.filter((p) => tildados.has(p.id));
  const porCabeza =
    categoria.totalCentavos > 0 && tildados.size > 0
      ? ` · ${formatearPesos(Math.ceil(categoria.totalCentavos / tildados.size))} c/u`
      : "";

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-foreground">{categoria.nombre}</p>
          <p className="text-xs text-muted-foreground-2">
            {tildados.size} {tildados.size === 1 ? "persona" : "personas"}
            {categoria.totalCentavos > 0 && ` · ${formatearPesos(categoria.totalCentavos)}`}
            {porCabeza}
          </p>
        </div>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() => marcarTodos(personas.map((p) => p.id))}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground-2 hover:text-foreground"
            >
              Todos
            </button>
            <button
              type="button"
              onClick={() => marcarTodos([])}
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground-2 hover:text-foreground"
            >
              Nadie
            </button>
          </div>
        )}
        {borrable && (
          <form action={borrarCategoria.bind(null, juntadaId, categoria.id)}>
            <button
              type="submit"
              aria-label={`Borrar ${categoria.nombre}`}
              className="flex h-7 w-7 items-center justify-center text-muted-foreground-2 hover:text-primary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </form>
        )}
      </div>

      <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
        {visibles.map((persona) => {
          const marcado = tildados.has(persona.id);
          return (
            <button
              key={persona.id}
              type="button"
              disabled={!editable}
              onClick={() => alternar(persona.id)}
              aria-pressed={marcado}
              className={cn(
                "flex items-center gap-2 rounded-md border px-2.5 py-1.5 text-left text-sm transition-colors",
                marcado
                  ? "border-primary bg-primary/10 text-foreground"
                  : "border-border text-muted-foreground-2",
                editable ? "cursor-pointer" : "cursor-default"
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                  marcado ? "border-primary bg-primary text-primary-foreground" : "border-border"
                )}
              >
                {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="truncate">
                {persona.nombre}
                {persona.esInvitado && <span className="text-muted-foreground-2"> · inv.</span>}
              </span>
            </button>
          );
        })}
      </div>
    </li>
  );
}
