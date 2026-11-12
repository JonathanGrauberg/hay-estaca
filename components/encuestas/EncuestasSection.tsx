"use client";

import { useCallback, useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  ListChecks,
  Lock,
  LockOpen,
  Plus,
  ShoppingBag,
  Trash2,
  Vote,
  Wallet,
  X,
} from "lucide-react";
import {
  borrarEncuesta,
  cerrarEncuesta,
  crearEncuesta,
  encargarCompra,
  pasarOpcionACuentas,
  votarEncuesta,
  type ResultadoEncuesta,
} from "@/lib/actions/encuestas";
import type { EncuestaVista, PersonaEncuesta } from "@/lib/encuestas/datos";
import { Ayuda } from "@/components/ui/Ayuda";
import { Hoja } from "@/components/ui/Hoja";
import { cn } from "@/lib/utils";

// Cada cuánto se actualizan los votos de los demás.
const CADA_MS = 3000;
const MAX_OPCIONES = 12;

const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const botonPrimario =
  "flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60";

type HojaAbierta =
  | {
      tipo: "crear";
      soloDe: {
        opcionId: string;
        texto: string;
        votantes: PersonaEncuesta[];
      } | null;
    }
  | { tipo: "votar"; encuestaId: string }
  | { tipo: "opcion"; encuestaId: string; opcionId: string }
  | { tipo: "faltan"; encuestaId: string };

interface EncuestasSectionProps {
  juntadaId: string;
  inicial: EncuestaVista[];
  // Va a la juntada (o es admin): crea encuestas y usa las acciones de cada opción.
  puedeCrear: boolean;
  cuentasAbiertas: boolean;
}

export function EncuestasSection({
  juntadaId,
  inicial,
  puedeCrear,
  cuentasAbiertas,
}: EncuestasSectionProps) {
  const [encuestas, setEncuestas] = useState(inicial);
  const [hoja, setHoja] = useState<HojaAbierta | null>(null);
  const cerrarHoja = useCallback(() => setHoja(null), []);

  const actualizar = useCallback(async () => {
    try {
      const respuesta = await fetch(`/api/juntadas/${juntadaId}/encuestas`, {
        cache: "no-store",
      });
      if (respuesta.ok) {
        setEncuestas((await respuesta.json()) as EncuestaVista[]);
      }
    } catch {
      // Sin señal: se reintenta en la próxima vuelta.
    }
  }, [juntadaId]);

  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) {
        void actualizar();
      }
    }, CADA_MS);
    return () => clearInterval(timer);
  }, [actualizar]);

  const encuesta =
    hoja && hoja.tipo !== "crear"
      ? encuestas.find((e) => e.id === hoja.encuestaId)
      : undefined;

  return (
    <section className="flex flex-col gap-2">
      <div className="flex items-center gap-2">
        <h2 className="flex-1 text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          ENCUESTAS
        </h2>
        <Ayuda titulo="Encuestas">
          Como las de WhatsApp: votan los que van. Tocá el número de una opción
          para ver quién la eligió y, por ejemplo, preguntarle solo a esos
          (&quot;¿cuántas promos?&quot;), pasarlos a las cuentas o encargarle a
          alguien la compra.
        </Ayuda>
        {puedeCrear && (
          <button
            type="button"
            onClick={() => setHoja({ tipo: "crear", soloDe: null })}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            Encuesta
          </button>
        )}
      </div>

      {encuestas.length === 0 ? (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
          Todavía no hay encuestas.
        </p>
      ) : (
        <ul className="flex flex-col gap-2">
          {encuestas.map((e) => (
            <TarjetaEncuesta
              key={e.id}
              encuesta={e}
              abrir={setHoja}
              actualizar={actualizar}
            />
          ))}
        </ul>
      )}

      {hoja?.tipo === "crear" && (
        <Hoja
          titulo={hoja.soloDe ? "Segunda vuelta" : "Crear una encuesta"}
          onCerrar={cerrarHoja}
        >
          <FormEncuesta
            juntadaId={juntadaId}
            soloDe={hoja.soloDe}
            listo={() => {
              cerrarHoja();
              void actualizar();
            }}
          />
        </Hoja>
      )}

      {hoja?.tipo === "votar" && encuesta && (
        <Hoja titulo={encuesta.pregunta} onCerrar={cerrarHoja}>
          <FormVoto
            encuesta={encuesta}
            listo={() => {
              cerrarHoja();
              void actualizar();
            }}
          />
        </Hoja>
      )}

      {hoja?.tipo === "opcion" && encuesta && (
        <DetalleOpcion
          encuesta={encuesta}
          opcionId={hoja.opcionId}
          puedeCrear={puedeCrear}
          cuentasAbiertas={cuentasAbiertas}
          cerrar={cerrarHoja}
          segundaVuelta={(soloDe) => setHoja({ tipo: "crear", soloDe })}
        />
      )}

      {hoja?.tipo === "faltan" && encuesta && (
        <Hoja titulo="Faltan votar" onCerrar={cerrarHoja}>
          <ListaPersonas personas={encuesta.faltan} vacio="Ya votaron todos." />
        </Hoja>
      )}
    </section>
  );
}

function ListaPersonas({
  personas,
  vacio,
}: {
  personas: PersonaEncuesta[];
  vacio: string;
}) {
  if (personas.length === 0) {
    return <p className="text-sm text-muted-foreground-2">{vacio}</p>;
  }
  return (
    <ul className="flex flex-wrap gap-1.5">
      {personas.map((persona) => (
        <li
          key={persona.id}
          className="rounded-full bg-secondary px-3 py-1 text-sm text-foreground"
        >
          {persona.nombre}
        </li>
      ))}
    </ul>
  );
}

function TarjetaEncuesta({
  encuesta,
  abrir,
  actualizar,
}: {
  encuesta: EncuestaVista;
  abrir: (hoja: HojaAbierta) => void;
  actualizar: () => Promise<void>;
}) {
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const maximo = Math.max(
    0,
    ...encuesta.opciones.map((o) => o.votantes.length),
  );
  const totalVotos = encuesta.opciones.reduce(
    (suma, o) => suma + o.votantes.length,
    0,
  );

  function correr(accion: () => Promise<ResultadoEncuesta>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      await actualizar();
    });
  }

  return (
    <li className="flex flex-col gap-2.5 rounded-lg bg-card px-4 py-3">
      <div className="flex items-start gap-2">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {encuesta.pregunta}
          </p>
          <p className="text-xs text-muted-foreground-2">
            {encuesta.segundaVueltaDe
              ? `Solo los que eligieron "${encuesta.segundaVueltaDe.opcion}"`
              : encuesta.multiple
                ? "Se puede elegir más de una"
                : "Elegí una"}
            {encuesta.creadaPor && ` · de ${encuesta.creadaPor}`}
            {encuesta.cerrada && " · cerrada"}
          </p>
        </div>
        {encuesta.administro && (
          <div className="flex shrink-0 gap-1">
            <button
              type="button"
              disabled={pending}
              onClick={() =>
                correr(() => cerrarEncuesta(encuesta.id, !encuesta.cerrada))
              }
              aria-label={
                encuesta.cerrada ? "Reabrir encuesta" : "Cerrar encuesta"
              }
              title={encuesta.cerrada ? "Reabrir" : "Cerrar la votación"}
              className="flex h-7 w-7 items-center justify-center text-muted-foreground-2 hover:text-primary"
            >
              {encuesta.cerrada ? (
                <LockOpen className="h-4 w-4" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
            </button>
            <button
              type="button"
              disabled={pending}
              onClick={() => {
                if (window.confirm("¿Borrar la encuesta y sus votos? Si tiene segunda vuelta, se borra también.")) {
                  correr(() => borrarEncuesta(encuesta.id));
                }
              }}
              aria-label="Borrar encuesta"
              className="flex h-7 w-7 items-center justify-center text-muted-foreground-2 hover:text-primary"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        )}
      </div>

      <ul className="flex flex-col gap-2">
        {encuesta.opciones.map((opcion) => {
          const votos = opcion.votantes.length;
          const mia = encuesta.misVotos.includes(opcion.id);
          const gana = encuesta.cerrada && votos > 0 && votos === maximo;
          return (
            <li key={opcion.id} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <span
                  className={cn(
                    "flex h-4 w-4 shrink-0 items-center justify-center rounded-full border",
                    mia
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {mia && <Check className="h-3 w-3" strokeWidth={3} />}
                </span>
                <span
                  className={cn(
                    "min-w-0 flex-1 truncate text-sm",
                    gana
                      ? "font-semibold text-foreground"
                      : "text-muted-foreground",
                  )}
                >
                  {opcion.texto}
                </span>
                {/* Tocar el número (o pasarle el mouse) muestra quién la eligió. */}
                <button
                  type="button"
                  onClick={() =>
                    abrir({
                      tipo: "opcion",
                      encuestaId: encuesta.id,
                      opcionId: opcion.id,
                    })
                  }
                  title={
                    votos > 0
                      ? opcion.votantes.map((v) => v.nombre).join(", ")
                      : "Nadie todavía"
                  }
                  aria-label={`${votos} votos para ${opcion.texto}: ver quiénes`}
                  className="min-w-8 rounded-full bg-secondary px-2 py-0.5 text-center text-sm font-semibold text-foreground hover:bg-primary hover:text-primary-foreground"
                >
                  {votos}
                </button>
              </div>
              <div className="ml-6 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div
                  className={cn(
                    "h-full rounded-full transition-[width] duration-500",
                    mia || gana ? "bg-primary" : "bg-primary/40",
                  )}
                  style={{
                    width:
                      totalVotos > 0 ? `${(votos / totalVotos) * 100}%` : 0,
                  }}
                />
              </div>
            </li>
          );
        })}
      </ul>

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => abrir({ tipo: "faltan", encuestaId: encuesta.id })}
          className="min-w-0 flex-1 truncate text-left text-xs text-muted-foreground-2 hover:text-foreground"
        >
          {encuesta.votaron} {encuesta.votaron === 1 ? "votó" : "votaron"}
          {encuesta.faltan.length > 0 &&
            !encuesta.cerrada &&
            ` · faltan ${encuesta.faltan.length}`}
        </button>
        {encuesta.puedoVotar && (
          <button
            type="button"
            onClick={() => abrir({ tipo: "votar", encuestaId: encuesta.id })}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold",
              encuesta.misVotos.length > 0
                ? "border border-border text-muted-foreground hover:text-foreground"
                : "bg-primary text-primary-foreground",
            )}
          >
            <Vote className="h-3.5 w-3.5" />
            {encuesta.misVotos.length > 0 ? "Cambiar voto" : "Votar"}
          </button>
        )}
      </div>
      {error && <p className="text-xs text-primary">{error}</p>}
    </li>
  );
}

function FormEncuesta({
  juntadaId,
  soloDe,
  listo,
}: {
  juntadaId: string;
  soloDe: {
    opcionId: string;
    texto: string;
    votantes: PersonaEncuesta[];
  } | null;
  listo: () => void;
}) {
  const [opciones, setOpciones] = useState(["", ""]);
  const [multiple, setMultiple] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cambiarOpcion(i: number, texto: string) {
    setOpciones((actuales) => {
      const nuevas = actuales.map((o, j) => (j === i ? texto : o));
      // Como en WhatsApp: al escribir en la última aparece otra vacía.
      if (
        i === nuevas.length - 1 &&
        texto.trim() &&
        nuevas.length < MAX_OPCIONES
      ) {
        nuevas.push("");
      }
      return nuevas;
    });
  }

  function quitar(i: number) {
    setOpciones((actuales) => actuales.filter((_, j) => j !== i));
  }

  function enviar(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const resultado = await crearEncuesta(juntadaId, formData);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      listo();
    });
  }

  return (
    <form action={enviar} className="flex flex-col gap-5">
      {soloDe && (
        <div className="flex flex-col gap-1.5 rounded-lg bg-secondary px-3 py-2">
          <input type="hidden" name="soloDeOpcionId" value={soloDe.opcionId} />
          <p className="text-xs text-muted-foreground">
            La votan solo los que eligieron &quot;{soloDe.texto}&quot;:
          </p>
          <p className="text-sm text-foreground">
            {soloDe.votantes.map((v) => v.nombre).join(" · ")}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-1.5">
        <label
          htmlFor="pregunta"
          className="text-sm font-semibold text-foreground"
        >
          Pregunta
        </label>
        <input
          id="pregunta"
          name="pregunta"
          type="text"
          required
          maxLength={140}
          autoFocus
          placeholder={
            soloDe
              ? "Ej: ¿Cuántas promos compramos?"
              : "Ej: ¿Quién se suma a la promo de fernet?"
          }
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-foreground">Opciones</p>
        {opciones.map((opcion, i) => (
          <div key={i} className="flex items-center gap-2">
            <input
              name="opcion"
              type="text"
              value={opcion}
              maxLength={60}
              onChange={(event) => cambiarOpcion(i, event.target.value)}
              placeholder={
                i === 0
                  ? soloDe
                    ? "Ej: 1 promo"
                    : "Ej: Me sumo"
                  : i === 1
                    ? soloDe
                      ? "Ej: 2 promos"
                      : "Ej: Paso"
                    : "Añadí otra"
              }
              aria-label={`Opción ${i + 1}`}
              className={inputClass}
            />
            {opciones.length > 2 && (
              <button
                type="button"
                onClick={() => quitar(i)}
                aria-label={`Quitar opción ${i + 1}`}
                className="shrink-0 text-muted-foreground-2 hover:text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        ))}
      </div>

      <label className="flex cursor-pointer items-center justify-between gap-3">
        <span className="text-sm text-foreground">
          Permitir varias respuestas
        </span>
        <input
          type="checkbox"
          name="multiple"
          checked={multiple}
          onChange={(event) => setMultiple(event.target.checked)}
          className="peer sr-only"
        />
        <span
          aria-hidden
          className={cn(
            "relative h-6 w-11 shrink-0 rounded-full transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-primary",
            multiple ? "bg-primary" : "bg-secondary",
          )}
        >
          <span
            className={cn(
              "absolute top-0.5 h-5 w-5 rounded-full bg-white transition-[left]",
              multiple ? "left-[1.375rem]" : "left-0.5",
            )}
          />
        </span>
      </label>

      {error && <p className="text-sm text-primary">{error}</p>}

      <button type="submit" disabled={pending} className={botonPrimario}>
        {pending ? "Creando…" : "Crear encuesta"}
      </button>
    </form>
  );
}

function FormVoto({
  encuesta,
  listo,
}: {
  encuesta: EncuestaVista;
  listo: () => void;
}) {
  const [elegidas, setElegidas] = useState(new Set(encuesta.misVotos));
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function alternar(id: string) {
    setElegidas((actuales) => {
      if (!encuesta.multiple) {
        return new Set(actuales.has(id) ? [] : [id]);
      }
      const nuevas = new Set(actuales);
      if (nuevas.has(id)) {
        nuevas.delete(id);
      } else {
        nuevas.add(id);
      }
      return nuevas;
    });
  }

  function votar(ids: string[]) {
    setError(null);
    startTransition(async () => {
      const resultado = await votarEncuesta(encuesta.id, ids);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      navigator.vibrate?.(20);
      listo();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground-2">
        {encuesta.multiple ? "Elegí una o más" : "Elegí una"}
      </p>
      <ul className="flex flex-col gap-2">
        {encuesta.opciones.map((opcion) => {
          const marcada = elegidas.has(opcion.id);
          return (
            <li key={opcion.id}>
              <button
                type="button"
                onClick={() => alternar(opcion.id)}
                aria-pressed={marcada}
                className={cn(
                  "flex w-full items-center gap-3 rounded-lg border px-3 py-3 text-left text-sm transition-colors",
                  marcada
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border text-muted-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-5 w-5 shrink-0 items-center justify-center border",
                    encuesta.multiple ? "rounded-sm" : "rounded-full",
                    marcada
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border",
                  )}
                >
                  {marcada && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">{opcion.texto}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="button"
        disabled={pending || elegidas.size === 0}
        onClick={() => votar([...elegidas])}
        className={botonPrimario}
      >
        {pending ? "Votando…" : "Votar"}
      </button>
      {encuesta.misVotos.length > 0 && (
        <button
          type="button"
          disabled={pending}
          onClick={() => votar([])}
          className="text-sm text-muted-foreground-2 hover:text-foreground"
        >
          Sacar mi voto
        </button>
      )}
    </div>
  );
}

// Quién eligió una opción y qué hacer con esa gente.
function DetalleOpcion({
  encuesta,
  opcionId,
  puedeCrear,
  cuentasAbiertas,
  cerrar,
  segundaVuelta,
}: {
  encuesta: EncuestaVista;
  opcionId: string;
  puedeCrear: boolean;
  cuentasAbiertas: boolean;
  cerrar: () => void;
  segundaVuelta: (soloDe: {
    opcionId: string;
    texto: string;
    votantes: PersonaEncuesta[];
  }) => void;
}) {
  const [accion, setAccion] = useState<"cuentas" | "compra" | null>(null);
  const [texto, setTexto] = useState("");
  const [encargado, setEncargado] = useState("");
  const [mensaje, setMensaje] = useState<{ ok: boolean; texto: string } | null>(
    null,
  );
  const [pending, startTransition] = useTransition();
  const router = useRouter();
  const opcion = encuesta.opciones.find((o) => o.id === opcionId);
  if (!opcion) {
    return null;
  }
  const { votantes } = opcion;

  function elegir(nueva: "cuentas" | "compra") {
    setAccion(accion === nueva ? null : nueva);
    setTexto("");
    setEncargado(votantes[0]?.id ?? "");
    setMensaje(null);
  }

  function correr(fn: () => Promise<ResultadoEncuesta>, ok: string) {
    setMensaje(null);
    startTransition(async () => {
      const resultado = await fn();
      if ("error" in resultado) {
        setMensaje({ ok: false, texto: resultado.error });
        return;
      }
      setAccion(null);
      setMensaje({ ok: true, texto: ok });
      // El checklist y el resumen de cuentas de la juntada cambian.
      router.refresh();
    });
  }

  const botonAccion =
    "flex w-full items-center gap-3 rounded-lg border border-border px-4 py-3 text-left text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50";

  return (
    <Hoja titulo={opcion.texto} onCerrar={cerrar}>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            {votantes.length === 1
              ? "LA ELIGIÓ"
              : `LA ELIGIERON (${votantes.length})`}
          </p>
          <ListaPersonas personas={votantes} vacio="Nadie la eligió todavía." />
        </div>

        {puedeCrear && votantes.length > 0 && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
              CON ESTA GENTE
            </p>
            <button
              type="button"
              onClick={() =>
                segundaVuelta({
                  opcionId: opcion.id,
                  texto: opcion.texto,
                  votantes,
                })
              }
              className={botonAccion}
            >
              <ListChecks className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                Preguntarle solo a estos
                <span className="block text-xs font-normal text-muted-foreground-2">
                  Ej: ¿cuántas promos compramos?
                </span>
              </span>
            </button>

            <button
              type="button"
              disabled={!cuentasAbiertas}
              onClick={() => elegir("cuentas")}
              className={botonAccion}
            >
              <Wallet className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                Pasar a cuentas
                <span className="block text-xs font-normal text-muted-foreground-2">
                  {cuentasAbiertas
                    ? "Crea una categoría con ellos tildados"
                    : "Las cuentas ya se dividieron"}
                </span>
              </span>
            </button>
            {accion === "cuentas" && (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={texto}
                  onChange={(event) => setTexto(event.target.value)}
                  maxLength={40}
                  autoFocus
                  placeholder="Nombre de la categoría (ej: Fernet)"
                  aria-label="Nombre de la categoría"
                  className={inputClass}
                />
                <button
                  type="button"
                  disabled={pending || !texto.trim()}
                  onClick={() =>
                    correr(
                      () => pasarOpcionACuentas(opcion.id, texto),
                      `Listo: en las cuentas quedó "${texto.trim()}" con ${votantes.length} tildados. Cuando alguien cargue el gasto, elegí esa categoría.`,
                    )
                  }
                  className="shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                >
                  Crear
                </button>
              </div>
            )}

            <button
              type="button"
              onClick={() => elegir("compra")}
              className={botonAccion}
            >
              <ShoppingBag className="h-5 w-5 shrink-0 text-primary" />
              <span className="min-w-0 flex-1">
                ¿Quién la compra?
                <span className="block text-xs font-normal text-muted-foreground-2">
                  Queda en el checklist, asignado a esa persona
                </span>
              </span>
            </button>
            {accion === "compra" && (
              <div className="flex flex-col gap-2">
                <select
                  value={encargado}
                  onChange={(event) => setEncargado(event.target.value)}
                  aria-label="Quién la compra"
                  className={inputClass}
                >
                  {votantes.map((persona) => (
                    <option
                      key={persona.id}
                      value={persona.id}
                      className="bg-card"
                    >
                      {persona.nombre}
                    </option>
                  ))}
                </select>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={texto}
                    onChange={(event) => setTexto(event.target.value)}
                    maxLength={120}
                    autoFocus
                    placeholder="Qué compra (ej: 2 promos de fernet)"
                    aria-label="Qué hay que comprar"
                    className={inputClass}
                  />
                  <button
                    type="button"
                    disabled={pending || !texto.trim() || !encargado}
                    onClick={() =>
                      correr(
                        () => encargarCompra(opcion.id, encargado, texto),
                        `Listo: quedó en el checklist para ${votantes.find((v) => v.id === encargado)?.nombre ?? "el encargado"}.`,
                      )
                    }
                    className="shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
                  >
                    Asignar
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {mensaje && (
          <p
            className={cn(
              "rounded-lg px-3 py-2 text-sm",
              mensaje.ok ? "bg-primary/10 text-foreground" : "text-primary",
            )}
          >
            {mensaje.texto}
          </p>
        )}
      </div>
    </Hoja>
  );
}
