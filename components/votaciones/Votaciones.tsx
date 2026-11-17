"use client";

import { useState, useTransition } from "react";
import {
  Check,
  Lock,
  Mail,
  MailOpen,
  Plus,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  aprobarCategoria,
  borrarCategoria,
  cambiarApertura,
  proponerCategoria,
  votar,
  type ResultadoVotacion,
} from "@/lib/actions/votaciones";
import type {
  CategoriaVista,
  IntegranteVoto,
  VotacionesVista,
} from "@/lib/votaciones/datos";
import { Avatar } from "@/components/juntadas/Avatar";
import { Ayuda } from "@/components/ui/Ayuda";
import { Hoja } from "@/components/ui/Hoja";
import { cn } from "@/lib/utils";

const tituloSeccion =
  "text-xs font-semibold tracking-[0.15em] text-muted-foreground-2";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";

function fechaLarga(ymd: string) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(ymd));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

interface VotacionesProps {
  datos: VotacionesVista;
  yoId: string;
  esAdmin: boolean;
}

export function Votaciones({ datos, yoId, esAdmin }: VotacionesProps) {
  const { temporada, categorias, pendientes, integrantes } = datos;
  const [votando, setVotando] = useState<CategoriaVista | null>(null);
  const [proponiendo, setProponiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const porId = new Map(integrantes.map((i) => [i.id, i]));
  const total = integrantes.length;
  const misVotos = categorias.filter((c) => c.miVoto).length;

  function correr(accion: () => Promise<ResultadoVotacion>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if ("error" in resultado) {
        setError(resultado.error);
      }
    });
  }

  if (temporada.abierta) {
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 rounded-lg border-l-4 border-l-primary bg-card px-4 py-4 text-center">
          <Trophy className="h-8 w-8 text-primary" />
          <p className="font-heading text-3xl tracking-wide text-foreground">
            ¡SE ABRIERON LOS RESULTADOS {temporada.anio}!
          </p>
          <p className="text-sm text-muted-foreground">
            Tocá cada sobre para ver quién ganó. Quién votó a quién sigue siendo
            secreto.
          </p>
        </div>
        {categorias.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground-2">
            Esta temporada no tuvo categorías.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {categorias.map((categoria) => (
              <Sobre key={categoria.id} categoria={categoria} porId={porId} />
            ))}
          </ul>
        )}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <Lock className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Los resultados se abren el {fechaLarga(temporada.apertura)}
          </p>
          <p className="text-xs text-muted-foreground-2">
            {temporada.diasQueFaltan === 1
              ? "Falta 1 día"
              : `Faltan ${temporada.diasQueFaltan} días`}{" "}
            · votaste {misVotos} de {categorias.length}
          </p>
        </div>
        <Ayuda titulo="Votaciones">
          Votás a uno por categoría (a vos mismo no). Podés cambiar tu voto
          hasta la apertura. Nadie ve los resultados antes, ni el admin, y quién
          votó a quién no se ve nunca: solo cuántos votos sacó cada uno.
        </Ayuda>
      </div>

      {esAdmin && <EditarApertura temporadaId={temporada.id} apertura={temporada.apertura} />}

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className={cn(tituloSeccion, "flex-1")}>CATEGORÍAS {temporada.anio}</h2>
          <button
            type="button"
            onClick={() => setProponiendo(true)}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            {esAdmin ? "Categoría" : "Proponer"}
          </button>
        </div>
        {categorias.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
            Todavía no hay categorías.{" "}
            {esAdmin
              ? "Agregá una o aprobá las que propongan."
              : 'Proponé una, tipo "El más tomador".'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
            {categorias.map((categoria) => {
              const elegido = categoria.miVoto ? porId.get(categoria.miVoto) : null;
              return (
                <li
                  key={categoria.id}
                  className="flex items-center gap-3 rounded-lg bg-card px-4 py-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {categoria.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground-2">
                      {categoria.votaron} de {total} votaron
                      {elegido && (
                        <>
                          {" · "}
                          <span className="text-foreground">
                            tu voto: {elegido.apodo || elegido.nombre}
                          </span>
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setVotando(categoria)}
                    className={cn(
                      "shrink-0 rounded-full px-3 py-1 text-xs font-semibold",
                      elegido
                        ? "border border-border text-muted-foreground hover:text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {elegido ? "Cambiar" : "Votar"}
                  </button>
                  {esAdmin && (
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => {
                        if (
                          window.confirm(
                            `¿Sacar "${categoria.nombre}"? Se pierden sus ${categoria.votaron} votos.`,
                          )
                        ) {
                          correr(() => borrarCategoria(categoria.id));
                        }
                      }}
                      aria-label={`Sacar ${categoria.nombre}`}
                      className="shrink-0 text-muted-foreground-2 hover:text-primary"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pendientes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={tituloSeccion}>
            {esAdmin ? "PROPUESTAS PARA APROBAR" : "PROPUESTAS (ESPERAN AL ADMIN)"}
          </h2>
          <ul className="flex flex-col gap-2">
            {pendientes.map((propuesta) => (
              <li
                key={propuesta.id}
                className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{propuesta.nombre}</p>
                  {propuesta.propuestaPor && (
                    <p className="text-xs text-muted-foreground-2">
                      la propuso {propuesta.mia ? "vos" : propuesta.propuestaPor}
                    </p>
                  )}
                </div>
                {esAdmin && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => correr(() => aprobarCategoria(propuesta.id))}
                    aria-label={`Aprobar ${propuesta.nombre}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                )}
                {(esAdmin || propuesta.mia) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => correr(() => borrarCategoria(propuesta.id))}
                    aria-label={`Descartar ${propuesta.nombre}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground-2 hover:text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="text-sm text-primary">{error}</p>}

      {votando && (
        <Hoja titulo={votando.nombre} onCerrar={() => setVotando(null)}>
          <ElegirVoto
            categoria={votando}
            integrantes={integrantes.filter((i) => i.id !== yoId)}
            listo={() => setVotando(null)}
          />
        </Hoja>
      )}

      {proponiendo && (
        <Hoja
          titulo={esAdmin ? "Nueva categoría" : "Proponer categoría"}
          onCerrar={() => setProponiendo(false)}
        >
          <FormPropuesta
            temporadaId={temporada.id}
            esAdmin={esAdmin}
            listo={() => setProponiendo(false)}
          />
        </Hoja>
      )}
    </div>
  );
}

function ElegirVoto({
  categoria,
  integrantes,
  listo,
}: {
  categoria: CategoriaVista;
  integrantes: IntegranteVoto[];
  listo: () => void;
}) {
  const [elegido, setElegido] = useState(categoria.miVoto);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!elegido) return;
    setError(null);
    startTransition(async () => {
      const resultado = await votar(categoria.id, elegido);
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
        Voto secreto. Lo podés cambiar hasta la apertura.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {integrantes.map((integrante) => {
          const marcado = elegido === integrante.id;
          return (
            <li key={integrante.id}>
              <button
                type="button"
                onClick={() => setElegido(integrante.id)}
                aria-pressed={marcado}
                className={cn(
                  "flex w-full flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors",
                  marcado
                    ? "border-primary bg-primary/10"
                    : "border-transparent hover:bg-accent",
                )}
              >
                <Avatar
                  nombre={integrante.nombre}
                  apodo={integrante.apodo}
                  avatarUrl={integrante.avatarUrl}
                  className={cn(
                    "h-12 w-12",
                    marcado ? "border-primary text-primary" : "border-border text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "w-full truncate text-center text-xs",
                    marcado ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {integrante.apodo || integrante.nombre}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="button"
        disabled={!elegido || pending || elegido === categoria.miVoto}
        onClick={confirmar}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Votando…" : categoria.miVoto ? "Cambiar mi voto" : "Votar"}
      </button>
    </div>
  );
}

function FormPropuesta({
  temporadaId,
  esAdmin,
  listo,
}: {
  temporadaId: string;
  esAdmin: boolean;
  listo: () => void;
}) {
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await proponerCategoria(temporadaId, texto);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      listo();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            enviar();
          }
        }}
        maxLength={60}
        autoFocus
        placeholder='Ej: "El que más veces se quedó dormido"'
        aria-label="Categoría"
        className={inputClass}
      />
      {!esAdmin && (
        <p className="text-xs text-muted-foreground-2">
          Aparece para votar cuando la apruebe el admin.
        </p>
      )}
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="button"
        disabled={pending || !texto.trim()}
        onClick={enviar}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : esAdmin ? "Agregar" : "Proponer"}
      </button>
    </div>
  );
}

function EditarApertura({ temporadaId, apertura }: { temporadaId: string; apertura: string }) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!abierto) {
    return (
      <button
        type="button"
        onClick={() => setAbierto(true)}
        className="-mt-4 self-end text-xs text-muted-foreground-2 underline-offset-2 hover:text-foreground hover:underline"
      >
        Cambiar la fecha de apertura
      </button>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const resultado = await cambiarApertura(temporadaId, formData);
          if ("error" in resultado) {
            setError(resultado.error);
            return;
          }
          setAbierto(false);
        });
      }}
      className="-mt-2 flex flex-col gap-2 rounded-lg bg-card px-4 py-3"
    >
      <div className="flex gap-2">
        <input
          type="date"
          name="apertura"
          defaultValue={apertura}
          aria-label="Fecha de apertura"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-primary">{error}</p>}
    </form>
  );
}

// Después de la apertura: un sobre cerrado por categoría que se abre al tocarlo.
function Sobre({
  categoria,
  porId,
}: {
  categoria: CategoriaVista;
  porId: Map<string, IntegranteVoto>;
}) {
  const [abierto, setAbierto] = useState(false);
  const resultados = categoria.resultados ?? [];
  const maximo = resultados[0]?.votos ?? 0;
  const ganadores = resultados.filter((r) => r.votos === maximo && maximo > 0);
  const resto = resultados.filter((r) => r.votos < maximo).slice(0, 3);
  const nombre = (id: string) => {
    const persona = porId.get(id);
    return persona ? persona.apodo || persona.nombre : "Ex integrante";
  };

  if (!abierto) {
    return (
      <li>
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="flex w-full items-center gap-3 rounded-lg border-2 border-dashed border-primary/50 bg-card px-4 py-5 text-left transition-colors hover:border-primary"
        >
          <Mail className="h-7 w-7 shrink-0 text-primary" />
          <span className="min-w-0 flex-1">
            <span className="block text-base font-semibold text-foreground">
              {categoria.nombre}
            </span>
            <span className="block text-xs text-muted-foreground-2">
              Tocá para abrir · {categoria.votaron} votos
            </span>
          </span>
        </button>
      </li>
    );
  }

  return (
    <li className="sobre-abierto flex flex-col gap-3 rounded-lg border-2 border-primary bg-card px-4 py-4">
      <div className="flex items-center gap-2">
        <MailOpen className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground">
          {categoria.nombre}
        </p>
      </div>
      {ganadores.length === 0 ? (
        <p className="text-sm text-muted-foreground-2">Nadie votó en esta.</p>
      ) : (
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="flex justify-center gap-3">
            {ganadores.map((g) => {
              const persona = porId.get(g.id);
              return persona ? (
                <Avatar
                  key={g.id}
                  nombre={persona.nombre}
                  apodo={persona.apodo}
                  avatarUrl={persona.avatarUrl}
                  className="h-20 w-20 border-primary text-xl text-primary"
                />
              ) : null;
            })}
          </div>
          <p className="font-heading text-4xl leading-none tracking-wide text-primary">
            {ganadores.map((g) => nombre(g.id).toUpperCase()).join(" Y ")}
          </p>
          <p className="text-sm text-muted-foreground">
            {ganadores.length > 1 ? "Empate con " : ""}
            {maximo} {maximo === 1 ? "voto" : "votos"}
          </p>
        </div>
      )}
      {resto.length > 0 && (
        <ul className="flex flex-col gap-1 border-t border-border pt-2">
          {resto.map((r) => (
            <li key={r.id} className="flex justify-between text-sm text-muted-foreground">
              <span>{nombre(r.id)}</span>
              <span>
                {r.votos} {r.votos === 1 ? "voto" : "votos"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
  );
}
