"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Flame, Lock, Plus, Trash2, X } from "lucide-react";
import { borrarHistoria, publicarHistoria } from "@/lib/actions/fotos";
import { actualizarAsistencia } from "@/lib/actions/asistencias";
import { prepararHistoria, subirPreparada } from "@/lib/fotos/subir";
import { cn } from "@/lib/utils";

export interface HistoriaVista {
  id: string;
  ruta: string;
  texto: string | null;
  autor: string;
  esMia: boolean;
  // "hace 2 h", armado en el servidor.
  hace: string;
}

interface HistoriasJuntadaProps {
  juntadaId: string;
  juntadaNombre: string;
  // Vacío si no va: las fotos no se mandan a quien no las puede ver.
  historias: HistoriaVista[];
  // Confirmó que va: puede ver y subir. Si no, ve el FOMO.
  voy: boolean;
  cantidad: number;
  // El FOMO de la última historia que lo tenga, o el de la juntada.
  mensajeFomo: string | null;
  // Se suben desde el día de la juntada hasta que termina.
  subida: "todavia" | "abiertas" | "terminada";
  // Se llegó desde una card con "¡Hay historia!": se abren solas.
  abrirAlCargar: boolean;
}

// Cuánto se queda cada historia en pantalla antes de pasar a la siguiente.
const SEGUNDOS_POR_HISTORIA = 6;

// Las historias son de la juntada (un solo círculo, como una cuenta de Instagram);
// abajo de cada una dice quién la subió.
export function HistoriasJuntada({
  juntadaId,
  juntadaNombre,
  historias,
  voy,
  cantidad,
  mensajeFomo,
  subida,
  abrirAlCargar,
}: HistoriasJuntadaProps) {
  const [abierta, setAbierta] = useState<number | null>(
    abrirAlCargar && voy && historias.length > 0 ? 0 : null
  );

  if (!voy) {
    if (cantidad === 0 && subida !== "abiertas") {
      return null;
    }
    return <Fomo juntadaId={juntadaId} cantidad={cantidad} mensajeFomo={mensajeFomo} />;
  }

  if (historias.length === 0 && subida === "terminada") {
    return null;
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        HISTORIAS · DURAN 24 HS
      </h2>
      <div className="flex items-start gap-4 px-1 py-1">
        {historias.length > 0 && (
          <button
            type="button"
            onClick={() => setAbierta(0)}
            className="flex w-20 shrink-0 flex-col items-center gap-1.5"
          >
            {/* Sin miniatura: la foto se ve recién al abrirla. */}
            <span className="anillo-historia block h-20 w-20 rounded-full p-[3px]">
              <span className="flex h-full w-full items-center justify-center rounded-full border-2 border-background bg-card">
                <Flame className="h-8 w-8 text-primary" />
              </span>
            </span>
            <span className="w-full truncate text-center text-xs font-semibold text-foreground">
              {juntadaNombre}
            </span>
            <span className="-mt-1 text-[11px] text-muted-foreground-2">
              {historias.length} {historias.length === 1 ? "historia" : "historias"}
            </span>
          </button>
        )}
        {subida === "abiertas" ? (
          <NuevaHistoria juntadaId={juntadaId} />
        ) : (
          <p className="self-center text-xs text-muted-foreground-2">
            {subida === "todavia"
              ? "Las historias se abren el día de la juntada."
              : "La juntada terminó: ya no se suben historias."}
          </p>
        )}
      </div>

      {abierta !== null && historias[abierta] && (
        <VisorHistorias
          juntadaNombre={juntadaNombre}
          historias={historias}
          indice={abierta}
          cambiar={setAbierta}
        />
      )}
    </section>
  );
}

// Para el que no confirmó que va: cuántas se está perdiendo y el botón para ir.
function Fomo({
  juntadaId,
  cantidad,
  mensajeFomo,
}: {
  juntadaId: string;
  cantidad: number;
  // El FOMO de la última historia que lo tenga, o el de la juntada.
  mensajeFomo: string | null;
}) {
  const [state, formAction, pending] = useActionState(actualizarAsistencia, undefined);

  return (
    <section className="flex items-center gap-4 rounded-lg border border-dashed border-primary/60 bg-primary/5 px-4 py-3">
      <span
        className={cn(
          "flex h-16 w-16 shrink-0 items-center justify-center rounded-full",
          cantidad > 0 ? "anillo-historia p-[3px]" : "border-2 border-border"
        )}
      >
        <span className="flex h-full w-full items-center justify-center rounded-full bg-card">
          {cantidad > 0 ? (
            <Lock className="h-6 w-6 text-primary" />
          ) : (
            <Flame className="h-6 w-6 text-muted-foreground-2" />
          )}
        </span>
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5">
        <p className="text-sm font-semibold text-foreground">
          {cantidad > 0
            ? `Te estás perdiendo ${cantidad} ${cantidad === 1 ? "historia" : "historias"}`
            : "Las historias son solo para los que van"}
        </p>
        <p className="text-xs text-muted-foreground">
          {mensajeFomo || "Lo que pasa en la juntada lo ven los que van. Confirmá y enterate."}
        </p>
        <form action={formAction}>
          <input type="hidden" name="juntadaId" value={juntadaId} />
          <button
            type="submit"
            name="estado"
            value="voy"
            disabled={pending}
            className="rounded-full bg-primary px-4 py-1.5 text-xs font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "…" : "¡Voy!"}
          </button>
        </form>
        {state?.error && <p className="text-xs text-primary">{state.error}</p>}
      </div>
    </section>
  );
}

function NuevaHistoria({ juntadaId }: { juntadaId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<{ blob: Blob; preview: string } | null>(null);
  const [texto, setTexto] = useState("");
  const [fomo, setFomo] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    if (foto) {
      URL.revokeObjectURL(foto.preview);
    }
    setFoto(null);
    setTexto("");
    setFomo("");
    setError(null);
  }

  function elegida(archivo: File) {
    setError(null);
    startTransition(async () => {
      try {
        // Se arma ya en vertical: la vista previa es exactamente lo que se va a subir.
        const blob = await prepararHistoria(archivo);
        setFoto({ blob, preview: URL.createObjectURL(blob) });
      } catch (e) {
        setError(e instanceof Error ? e.message : "No se pudo leer la foto.");
      }
    });
  }

  function publicar() {
    if (!foto) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const subida = await subirPreparada(foto.blob, { tipo: "historia", juntadaId });
      const resultado =
        "error" in subida ? subida : await publicarHistoria(juntadaId, subida.key, texto, fomo);
      if (resultado && "error" in resultado) {
        setError(resultado.error);
      } else {
        cerrar();
      }
    });
  }

  return (
    <>
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          const archivo = event.target.files?.[0];
          event.target.value = "";
          if (archivo) {
            elegida(archivo);
          }
        }}
      />
      <button
        type="button"
        disabled={pending && !foto}
        onClick={() => input.current?.click()}
        className="flex w-20 shrink-0 flex-col items-center gap-1.5 disabled:opacity-60"
      >
        <span className="flex h-20 w-20 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground-2 hover:border-primary hover:text-primary">
          <Plus className="h-6 w-6" />
        </span>
        <span className="text-xs text-muted-foreground-2">
          {pending && !foto ? "Preparando…" : "Subir"}
        </span>
      </button>
      {error && !foto && <p className="self-center text-xs text-primary">{error}</p>}

      {foto && (
        <div className="fixed inset-0 z-50 flex flex-col items-center bg-black">
          <div className="flex w-full max-w-md items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cancelar"
              className="text-white/70 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="text-sm font-semibold text-white">Nueva historia</p>
            <span className="w-6" />
          </div>
          <div className="flex min-h-0 w-full flex-1 items-center justify-center px-4">
            {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
            <img
              src={foto.preview}
              alt=""
              className="aspect-[9/16] max-h-full max-w-full rounded-lg object-cover"
            />
          </div>
          <div className="flex w-full max-w-md flex-col gap-2 p-4">
            <input
              type="text"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              maxLength={140}
              placeholder="Escribí algo (opcional)"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
            />
            <input
              type="text"
              value={fomo}
              onChange={(event) => setFomo(event.target.value)}
              maxLength={140}
              placeholder="FOMO para los que no vinieron (opcional)"
              aria-label="Mensaje para los que no vinieron"
              className="w-full rounded-md border border-primary/40 bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
            />
            {error && <p className="text-sm text-primary">{error}</p>}
            <button
              type="button"
              onClick={publicar}
              disabled={pending}
              className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
            >
              {pending ? "Subiendo…" : "Publicar historia"}
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function VisorHistorias({
  juntadaNombre,
  historias,
  indice,
  cambiar,
}: {
  juntadaNombre: string;
  historias: HistoriaVista[];
  indice: number;
  cambiar: (indice: number | null) => void;
}) {
  const historia = historias[indice];
  const [pending, startTransition] = useTransition();

  // Pasa sola a la siguiente; después de la última se cierra.
  useEffect(() => {
    const timer = setTimeout(
      () => cambiar(indice + 1 < historias.length ? indice + 1 : null),
      SEGUNDOS_POR_HISTORIA * 1000
    );
    return () => clearTimeout(timer);
  }, [indice, historias.length, cambiar]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      {/* Siempre vertical 9:16, del alto de la pantalla (o del ancho en celulares angostos). */}
      <div className="relative aspect-[9/16] max-h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black sm:rounded-xl">
        {/* eslint-disable-next-line @next/next/no-img-element -- link firmado de R2 que vence */}
        <img src={historia.ruta} alt="" className="absolute inset-0 h-full w-full object-cover" />

        <div className="absolute inset-x-0 top-0 flex flex-col gap-3 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-3">
          <div className="flex gap-1">
            {historias.map((h, i) => (
              <span key={h.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  key={i === indice ? `${h.id}-activa` : h.id}
                  className={cn(
                    "block h-full bg-white",
                    i < indice ? "w-full" : i === indice ? "historia-progreso" : "w-0"
                  )}
                  style={i === indice ? { animationDuration: `${SEGUNDOS_POR_HISTORIA}s` } : undefined}
                />
              </span>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-white">{juntadaNombre}</p>
              <p className="text-xs text-white/70">{historia.hace}</p>
            </div>
            {historia.esMia && (
              <button
                type="button"
                disabled={pending}
                onClick={() => {
                  if (window.confirm("¿Borrar tu historia?")) {
                    startTransition(async () => {
                      await borrarHistoria(historia.id);
                      cambiar(null);
                    });
                  }
                }}
                aria-label="Borrar historia"
                className="relative z-10 text-white/80 hover:text-primary"
              >
                <Trash2 className="h-5 w-5" />
              </button>
            )}
            <button
              type="button"
              onClick={() => cambiar(null)}
              aria-label="Cerrar"
              className="relative z-10 text-white/80 hover:text-white"
            >
              <X className="h-6 w-6" />
            </button>
          </div>
        </div>

        {/* Tocar a la izquierda vuelve, a la derecha avanza. */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => cambiar(Math.max(0, indice - 1))}
          className="absolute bottom-0 left-0 top-20 w-1/3"
        />
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => cambiar(indice + 1 < historias.length ? indice + 1 : null)}
          className="absolute bottom-0 right-0 top-20 w-2/3"
        />

        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-col items-center gap-2 bg-gradient-to-t from-black/70 to-transparent px-4 pb-6 pt-12">
          {historia.texto && (
            <p className="max-w-[90%] rounded-lg bg-black/50 px-3 py-2 text-center text-sm text-white">
              {historia.texto}
            </p>
          )}
          <p className="text-xs text-white/80">Subida por {historia.autor}</p>
        </div>
      </div>
    </div>
  );
}
