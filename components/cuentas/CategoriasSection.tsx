"use client";

import { useActionState, useOptimistic, useState, useTransition } from "react";
import { Check, Pencil, Plus, Trash2, X } from "lucide-react";
import {
  borrarCategoria,
  crearCategorias,
  marcarEnCategoria,
  marcarTodosEnCategoria,
  renombrarCategoria,
  type RenombrarCategoriaState,
} from "@/lib/actions/gastos";
import type { CategoriaVista } from "@/lib/cuentas/datos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { cn } from "@/lib/utils";

const SUGERENCIAS = ["Comida", "Bebida", "Picada", "Extras"];

interface PersonaChip {
  id: string;
  nombre: string;
  esInvitado: boolean;
  // Confirmó que va (o es invitado de la juntada).
  va: boolean;
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
    undefined,
  );
  const existentes = new Set(categorias.map((c) => c.nombre.toLowerCase()));
  const sugerencias = SUGERENCIAS.filter(
    (s) => !existentes.has(s.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-3">
      {editable && (
        <form action={formAction} className="flex flex-col gap-2">
          <div className="flex gap-2">
            <input
              name="nombres"
              type="text"
              placeholder="Nueva categoría (ej: comida, bebida)"
              aria-label="Nueva categoría"
              className="min-w-0 flex-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
            />
            <button
              type="submit"
              disabled={pending}
              className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              <Plus className="h-4 w-4" />
              Agregar categoría
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
          {state?.error && (
            <p className="text-sm text-primary">{state.error}</p>
          )}
        </form>
      )}

      {categorias.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
          Todavía no hay categorías. Agregá una (comida, bebida o lo que haya
          habido) y tildá quién entra en cada una. Sin categorías, cada gasto se
          divide entre los que elijas al cargarlo.
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

// El nombre con un lápiz para renombrar (ej: "Carne" → "Comida"). Solo cambia el
// nombre: los gastos y los tildados no se tocan.
function NombreCategoria({
  juntadaId,
  categoria,
  editable,
}: {
  juntadaId: string;
  categoria: CategoriaVista;
  editable: boolean;
}) {
  const [editando, setEditando] = useState(false);
  const [state, formAction, pending] = useActionState(
    async (prev: RenombrarCategoriaState, formData: FormData) => {
      const resultado = await renombrarCategoria(
        juntadaId,
        categoria.id,
        prev,
        formData,
      );
      if (resultado && "ok" in resultado) {
        setEditando(false);
      }
      return resultado;
    },
    undefined,
  );

  if (!editando) {
    return (
      <div className="flex min-w-0 items-center gap-1.5">
        <p className="truncate text-sm font-semibold text-foreground">
          {categoria.nombre}
        </p>
        {editable && (
          <button
            type="button"
            onClick={() => setEditando(true)}
            aria-label={`Renombrar ${categoria.nombre}`}
            className="shrink-0 text-muted-foreground-2 hover:text-primary"
          >
            <Pencil className="h-3.5 w-3.5" />
          </button>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="flex flex-col gap-1">
      <div className="flex items-center gap-1.5">
        <input
          name="nombre"
          type="text"
          defaultValue={categoria.nombre}
          maxLength={40}
          autoFocus
          aria-label="Nuevo nombre"
          className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1 text-sm text-foreground outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={pending}
          aria-label="Guardar nombre"
          className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground disabled:opacity-60"
        >
          <Check className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => setEditando(false)}
          aria-label="Cancelar"
          className="shrink-0 text-muted-foreground-2 hover:text-foreground"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
      {state && "error" in state && (
        <p className="text-xs text-primary">{state.error}</p>
      )}
    </form>
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
    (_actual: Set<string>, nuevos: Set<string>) => nuevos,
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

  // Se muestran los que van y los que ya estén tildados; al resto (no confirmó) se lo
  // suma desde el desplegable.
  const visibles = personas.filter(
    (p) => tildados.has(p.id) || (editable && p.va),
  );
  const otros = editable
    ? personas.filter((p) => !tildados.has(p.id) && !p.va)
    : [];
  const porCabeza =
    categoria.totalCentavos > 0 && tildados.size > 0
      ? ` · ${formatearPesos(Math.ceil(categoria.totalCentavos / tildados.size))} c/u`
      : "";

  return (
    <li className="flex flex-col gap-2 rounded-lg bg-card px-4 py-3">
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <NombreCategoria
            juntadaId={juntadaId}
            categoria={categoria}
            editable={editable}
          />
          <p className="text-xs text-muted-foreground-2">
            {tildados.size} {tildados.size === 1 ? "persona" : "personas"}
            {categoria.totalCentavos > 0 &&
              ` · ${formatearPesos(categoria.totalCentavos)}`}
            {porCabeza}
          </p>
        </div>
        {editable && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              onClick={() =>
                marcarTodos(personas.filter((p) => p.va).map((p) => p.id))
              }
              className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground-2 hover:text-foreground"
            >
              Los que van
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
                editable ? "cursor-pointer" : "cursor-default",
              )}
            >
              <span
                className={cn(
                  "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                  marcado
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border",
                )}
              >
                {marcado && <Check className="h-3 w-3" strokeWidth={3} />}
              </span>
              <span className="truncate">
                {persona.nombre}
                {persona.esInvitado && (
                  <span className="text-muted-foreground-2"> · inv.</span>
                )}
              </span>
            </button>
          );
        })}
      </div>

      {visibles.length === 0 && (
        <p className="text-xs text-muted-foreground-2">
          Nadie confirmó que va todavía. Cuando confirmen se suman solos.
        </p>
      )}

      {otros.length > 0 && (
        <select
          value=""
          onChange={(event) =>
            event.target.value && alternar(event.target.value)
          }
          aria-label={`Sumar a alguien a ${categoria.nombre}`}
          className="self-start rounded-md border border-border bg-card px-2 py-1 text-xs text-muted-foreground outline-none focus:border-primary"
        >
          <option value="" className="bg-card">
            + Sumar a alguien que no confirmó
          </option>
          {otros.map((persona) => (
            <option
              key={persona.id}
              value={persona.id}
              className="bg-card text-foreground"
            >
              {persona.nombre}
            </option>
          ))}
        </select>
      )}
    </li>
  );
}
