"use client";

import { useActionState, useState, useTransition } from "react";
import { Plus, X } from "lucide-react";
import {
  crearCategoriaDesdeGasto,
  type GuardarGastoState,
} from "@/lib/actions/gastos";
import type { PersonaCuentas } from "@/lib/cuentas/datos";
import { formatearPesos, parsearMonto } from "@/lib/cuentas/dinero";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";
const chip =
  "rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors";
const chipActivo = "border-primary bg-primary/15 text-foreground";
const chipInactivo =
  "border-border bg-card text-muted-foreground hover:text-foreground";

interface FormGastoProps {
  juntadaId: string;
  // guardarGasto con juntadaId y gastoId (o null) ya bindeados.
  accion: (
    prevState: GuardarGastoState,
    formData: FormData,
  ) => Promise<GuardarGastoState>;
  personas: Pick<
    PersonaCuentas,
    "id" | "nombre" | "esInvitado" | "vaPorDefecto"
  >[];
  categorias: { id: string; nombre: string; cantidad: number }[];
  valores: {
    concepto: string;
    monto: string;
    pagadoPor: string;
    // "" = entre personas elegidas a mano.
    categoria: string;
    participantes: string[];
  };
  labelBoton: string;
}

export function FormGasto({
  juntadaId,
  accion,
  personas,
  categorias: categoriasIniciales,
  valores,
  labelBoton,
}: FormGastoProps) {
  const [state, formAction, pending] = useActionState(accion, undefined);
  const [monto, setMonto] = useState(valores.monto);
  const [categorias, setCategorias] = useState(categoriasIniciales);
  const [categoria, setCategoria] = useState(valores.categoria);
  const [participantes, setParticipantes] = useState(
    new Set(valores.participantes),
  );
  const [creando, setCreando] = useState(false);
  const [nueva, setNueva] = useState("");
  const [errorNueva, setErrorNueva] = useState<string | null>(null);
  const [creandoPending, startCrear] = useTransition();

  function crearNueva() {
    setErrorNueva(null);
    startCrear(async () => {
      const resultado = await crearCategoriaDesdeGasto(juntadaId, nueva);
      if ("error" in resultado) {
        setErrorNueva(resultado.error);
        return;
      }
      setCategorias((actuales) => [...actuales, resultado]);
      setCategoria(resultado.id);
      setCreando(false);
      setNueva("");
    });
  }

  const elegida = categorias.find((c) => c.id === categoria);
  const cantidad = elegida ? elegida.cantidad : participantes.size;
  const montoCentavos = parsearMonto(monto);
  const porCabeza =
    montoCentavos && cantidad > 0
      ? formatearPesos(Math.ceil(montoCentavos / cantidad))
      : null;

  function alternar(id: string) {
    setParticipantes((actuales) => {
      const nuevos = new Set(actuales);
      if (nuevos.has(id)) {
        nuevos.delete(id);
      } else {
        nuevos.add(id);
      }
      return nuevos;
    });
  }

  const atajos = [
    {
      label: "Los que van",
      ids: personas.filter((p) => p.vaPorDefecto).map((p) => p.id),
    },
    { label: "Todos", ids: personas.map((p) => p.id) },
    { label: "Nadie", ids: [] },
  ];

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex gap-3">
        <div className="flex flex-[3] flex-col gap-1.5">
          <label htmlFor="concepto" className={labelClass}>
            Qué se compró
          </label>
          <input
            id="concepto"
            name="concepto"
            type="text"
            required={!elegida}
            defaultValue={valores.concepto}
            placeholder={elegida ? `${elegida.nombre} (opcional)` : "Ej: Carne"}
            className={inputClass}
          />
        </div>
        <div className="flex flex-[2] flex-col gap-1.5">
          <label htmlFor="monto" className={labelClass}>
            Monto
          </label>
          <input
            id="monto"
            name="monto"
            type="text"
            inputMode="decimal"
            required
            value={monto}
            onChange={(event) => setMonto(event.target.value)}
            placeholder="12.500"
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="pagadoPor" className={labelClass}>
          Quién pagó
        </label>
        <select
          id="pagadoPor"
          name="pagadoPor"
          required
          defaultValue={valores.pagadoPor}
          className={inputClass}
        >
          {personas.map((persona) => (
            <option key={persona.id} value={persona.id} className="bg-card">
              {persona.nombre}
              {persona.esInvitado ? " (invitado)" : ""}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-2">
        <p className={labelClass}>¿En qué categoría va?</p>
        <input type="hidden" name="categoria" value={categoria} />
        <div className="flex flex-wrap gap-2">
          {categorias.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setCategoria(c.id)}
              aria-pressed={categoria === c.id}
              className={cn(
                chip,
                categoria === c.id ? chipActivo : chipInactivo,
              )}
            >
              {c.nombre}
              <span className="ml-1 text-xs opacity-70">· {c.cantidad}</span>
            </button>
          ))}
          <button
            type="button"
            onClick={() => setCategoria("")}
            aria-pressed={categoria === ""}
            className={cn(chip, categoria === "" ? chipActivo : chipInactivo)}
          >
            Elegir personas a mano
          </button>
          {!creando && (
            <button
              type="button"
              onClick={() => setCreando(true)}
              className={cn(
                chip,
                "border-dashed border-border text-muted-foreground-2 hover:border-primary hover:text-primary",
              )}
            >
              <Plus className="mr-1 inline h-3.5 w-3.5" />
              Nueva categoría
            </button>
          )}
        </div>
        {creando && (
          <div className="flex flex-col gap-1">
            <div className="flex gap-2">
              <input
                type="text"
                value={nueva}
                onChange={(event) => setNueva(event.target.value)}
                onKeyDown={(event) => {
                  // Enter crea la categoría, no manda el gasto.
                  if (event.key === "Enter") {
                    event.preventDefault();
                    crearNueva();
                  }
                }}
                maxLength={40}
                autoFocus
                placeholder="Ej: bebida, picada, hielo"
                aria-label="Nombre de la categoría nueva"
                className={cn(inputClass, "min-w-0 flex-1")}
              />
              <button
                type="button"
                onClick={crearNueva}
                disabled={creandoPending}
                className="shrink-0 rounded-full bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
              >
                {creandoPending ? "…" : "Crear"}
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreando(false);
                  setNueva("");
                  setErrorNueva(null);
                }}
                aria-label="Cancelar"
                className="shrink-0 text-muted-foreground-2 hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <p className="text-xs text-muted-foreground-2">
              Arranca con los que van tildados. Quién entra se cambia en la
              pantalla de cuentas.
            </p>
            {errorNueva && <p className="text-xs text-primary">{errorNueva}</p>}
          </div>
        )}
        {elegida && (
          <p className="text-sm text-muted-foreground">
            {porCabeza
              ? `Se divide entre los ${cantidad} tildados en ${elegida.nombre} · ${porCabeza} c/u aprox.`
              : `Se divide entre los ${cantidad} tildados en ${elegida.nombre}.`}
          </p>
        )}
      </div>

      {!elegida && (
        <fieldset className="flex flex-col gap-2">
          <div className="flex items-center justify-between gap-2">
            <legend className={labelClass}>Entre quiénes se divide</legend>
            <div className="flex gap-1">
              {atajos.map((atajo) => (
                <button
                  key={atajo.label}
                  type="button"
                  onClick={() => setParticipantes(new Set(atajo.ids))}
                  className="rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground-2 hover:text-foreground"
                >
                  {atajo.label}
                </button>
              ))}
            </div>
          </div>
          <p className="text-xs text-muted-foreground-2">
            Sacá al que se llevó su bebida, o dejá solo a los que armaron la
            promo.
          </p>
          <div className="grid grid-cols-2 gap-2">
            {personas.map((persona) => {
              const marcado = participantes.has(persona.id);
              return (
                <label
                  key={persona.id}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                    marcado
                      ? "border-primary bg-primary/10 text-foreground"
                      : "border-border bg-card text-muted-foreground-2",
                  )}
                >
                  <input
                    type="checkbox"
                    name="participantes"
                    value={persona.id}
                    checked={marcado}
                    onChange={() => alternar(persona.id)}
                    className="accent-primary"
                  />
                  <span className="truncate">
                    {persona.nombre}
                    {persona.esInvitado && (
                      <span className="text-muted-foreground-2"> · inv.</span>
                    )}
                  </span>
                </label>
              );
            })}
          </div>
          <p className="text-sm text-muted-foreground">
            {porCabeza
              ? `${participantes.size} personas · ${porCabeza} c/u aprox.`
              : `${participantes.size} personas`}
          </p>
        </fieldset>
      )}

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : labelBoton}
      </button>
    </form>
  );
}
