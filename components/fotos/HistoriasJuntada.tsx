"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { Flame, Plus, Trash2, X } from "lucide-react";
import { borrarHistoria, publicarHistoria } from "@/lib/actions/fotos";
import { subirFoto } from "@/lib/fotos/subir";
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
  historias: HistoriaVista[];
  // Confirmó que va: puede ver y subir. Si no, solo ve cuántas hay (el FOMO).
  voy: boolean;
  cantidadOcultas: number;
}

// Cuánto se queda cada historia en pantalla antes de pasar a la siguiente.
const SEGUNDOS_POR_HISTORIA = 6;

export function HistoriasJuntada({ juntadaId, historias, voy, cantidadOcultas }: HistoriasJuntadaProps) {
  const [abierta, setAbierta] = useState<number | null>(null);

  if (!voy) {
    if (cantidadOcultas === 0) {
      return null;
    }
    return (
      <div className="flex items-center gap-3 rounded-lg border border-dashed border-primary/50 px-4 py-3">
        <Flame className="h-5 w-5 shrink-0 text-primary" />
        <p className="text-sm text-muted-foreground">
          Hay {cantidadOcultas} {cantidadOcultas === 1 ? "historia" : "historias"} de esta juntada.
          Solo las ven los que van: confirmá que vas si no querés perdértelas.
        </p>
      </div>
    );
  }

  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        HISTORIAS · DURAN 24 HS
      </h2>
      <div className="flex gap-3 overflow-x-auto px-1 py-1">
        <NuevaHistoria juntadaId={juntadaId} />
        {historias.map((historia, i) => (
          <button
            key={historia.id}
            type="button"
            onClick={() => setAbierta(i)}
            className="flex w-16 shrink-0 flex-col items-center gap-1.5"
          >
            <span className="block h-16 w-16 overflow-hidden rounded-full border-2 border-primary p-0.5">
              {/* eslint-disable-next-line @next/next/no-img-element -- link firmado de R2 que vence */}
              <img src={historia.ruta} alt="" loading="lazy" className="h-full w-full rounded-full object-cover" />
            </span>
            <span className="w-full truncate text-center text-xs text-muted-foreground-2">
              {historia.autor}
            </span>
          </button>
        ))}
      </div>

      {abierta !== null && historias[abierta] && (
        <VisorHistorias
          historias={historias}
          indice={abierta}
          cambiar={setAbierta}
        />
      )}
    </section>
  );
}

function NuevaHistoria({ juntadaId }: { juntadaId: string }) {
  const input = useRef<HTMLInputElement>(null);
  const [archivo, setArchivo] = useState<{ file: File; preview: string } | null>(null);
  const [texto, setTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cerrar() {
    if (archivo) {
      URL.revokeObjectURL(archivo.preview);
    }
    setArchivo(null);
    setTexto("");
    setError(null);
  }

  function publicar() {
    if (!archivo) {
      return;
    }
    setError(null);
    startTransition(async () => {
      const subida = await subirFoto(archivo.file, { tipo: "historia", juntadaId }, 1440);
      const resultado =
        "error" in subida ? subida : await publicarHistoria(juntadaId, subida.key, texto);
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
          const file = event.target.files?.[0];
          event.target.value = "";
          if (file) {
            setArchivo({ file, preview: URL.createObjectURL(file) });
          }
        }}
      />
      <button
        type="button"
        onClick={() => input.current?.click()}
        className="flex w-16 shrink-0 flex-col items-center gap-1.5"
      >
        <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground-2 hover:border-primary hover:text-primary">
          <Plus className="h-5 w-5" />
        </span>
        <span className="text-xs text-muted-foreground-2">Subir</span>
      </button>

      {archivo && (
        <div className="fixed inset-0 z-50 flex flex-col bg-black">
          <div className="flex items-center justify-between px-4 py-3">
            <button
              type="button"
              onClick={cerrar}
              aria-label="Cancelar"
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-6 w-6" />
            </button>
            <p className="text-sm font-semibold text-foreground">Nueva historia</p>
            <span className="w-6" />
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- vista previa local (blob:) */}
          <img src={archivo.preview} alt="" className="min-h-0 flex-1 object-contain" />
          <div className="mx-auto flex w-full max-w-md flex-col gap-2 p-4">
            <input
              type="text"
              value={texto}
              onChange={(event) => setTexto(event.target.value)}
              maxLength={140}
              placeholder="Escribí algo (opcional)"
              className="w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
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
  historias,
  indice,
  cambiar,
}: {
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
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex gap-1 px-3 pt-3">
        {historias.map((h, i) => (
          <span key={h.id} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/25">
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

      <div className="flex items-center gap-3 px-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">{historia.autor}</p>
          <p className="text-xs text-white/60">{historia.hace}</p>
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
            className="text-white/70 hover:text-primary"
          >
            <Trash2 className="h-5 w-5" />
          </button>
        )}
        <button
          type="button"
          onClick={() => cambiar(null)}
          aria-label="Cerrar"
          className="text-white/70 hover:text-white"
        >
          <X className="h-6 w-6" />
        </button>
      </div>

      <div className="relative min-h-0 flex-1">
        {/* eslint-disable-next-line @next/next/no-img-element -- link firmado de R2 que vence */}
        <img src={historia.ruta} alt="" className="h-full w-full object-contain" />
        {/* Tocar a la izquierda vuelve, a la derecha avanza. */}
        <button
          type="button"
          aria-label="Anterior"
          onClick={() => cambiar(Math.max(0, indice - 1))}
          className="absolute inset-y-0 left-0 w-1/3"
        />
        <button
          type="button"
          aria-label="Siguiente"
          onClick={() => cambiar(indice + 1 < historias.length ? indice + 1 : null)}
          className="absolute inset-y-0 right-0 w-2/3"
        />
        {historia.texto && (
          <p className="pointer-events-none absolute inset-x-0 bottom-6 mx-auto w-fit max-w-[90%] rounded-lg bg-black/60 px-3 py-2 text-center text-sm text-white">
            {historia.texto}
          </p>
        )}
      </div>
    </div>
  );
}
