"use client";

import {
  useActionState,
  useEffect,
  useRef,
  useState,
  useTransition,
} from "react";
import type { ReactNode } from "react";
import { Eye, Flame, Plus, Trash2, X } from "lucide-react";
import {
  borrarHistoria,
  marcarFomoVisto,
  marcarHistoriaVista,
  publicarHistoria,
} from "@/lib/actions/fotos";
import {
  AnilloHistorias,
  MAX_SEGMENTOS,
} from "@/components/fotos/AnilloHistorias";
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
  // Quiénes la vieron (solo se manda en las propias).
  vistas: string[];
  // Ya la vio (o es suya).
  vista: boolean;
}

interface HistoriasJuntadaProps {
  juntadaId: string;
  juntadaNombre: string;
  // Vacío si no va: las fotos no se mandan a quien no las puede ver.
  historias: HistoriaVista[];
  // Confirmó que va: puede ver y subir. Si no, al tocar ve el FOMO.
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

const tamanoCirculo = "h-16 w-16 sm:h-20 sm:w-20";

// Las historias son de la juntada: un solo círculo (como una cuenta de Instagram) que
// va dentro de la card de la juntada. El borde se parte en una porción por historia.
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
  // Desde el inicio arranca en la primera que no vio, como en Instagram.
  const [abierta, setAbierta] = useState<number | null>(() => {
    if (!abrirAlCargar || !voy || historias.length === 0) {
      return null;
    }
    const primeraSinVer = historias.findIndex((historia) => !historia.vista);
    return primeraSinVer === -1 ? 0 : primeraSinVer;
  });
  const [fomoAbierto, setFomoAbierto] = useState(
    abrirAlCargar && !voy && cantidad > 0,
  );

  if (!voy) {
    if (cantidad === 0) {
      return null;
    }
    return (
      <>
        <Circulo
          partes={cantidad}
          etiqueta={etiquetaCantidad(cantidad)}
          onClick={() => setFomoAbierto(true)}
        />
        {fomoAbierto && (
          <FomoHistoria
            juntadaId={juntadaId}
            juntadaNombre={juntadaNombre}
            cantidad={cantidad}
            mensajeFomo={mensajeFomo}
            cerrar={() => setFomoAbierto(false)}
          />
        )}
      </>
    );
  }

  if (historias.length === 0) {
    if (subida !== "abiertas") {
      return null;
    }
    return (
      <NuevaHistoria juntadaId={juntadaId}>
        {(preparando) => (
          <span className="flex flex-col items-center gap-1">
            <span
              className={cn(
                tamanoCirculo,
                "flex items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground-2 hover:border-primary hover:text-primary",
              )}
            >
              <Plus className="h-6 w-6" />
            </span>
            <span className="text-[11px] text-muted-foreground-2">
              {preparando ? "Preparando…" : "Subir historia"}
            </span>
          </span>
        )}
      </NuevaHistoria>
    );
  }

  return (
    <>
      <div className="relative">
        <Circulo
          partes={historias.length}
          etiqueta={etiquetaCantidad(historias.length)}
          onClick={() => setAbierta(0)}
        />
        {subida === "abiertas" && (
          <div className="absolute right-0 top-[calc(4rem-1.5rem)] sm:top-[calc(5rem-1.5rem)]">
            <NuevaHistoria juntadaId={juntadaId}>
              {(preparando) => (
                <span
                  aria-label="Subir historia"
                  className={cn(
                    "flex h-6 w-6 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground",
                    preparando && "animate-pulse",
                  )}
                >
                  <Plus className="h-3.5 w-3.5" strokeWidth={3} />
                </span>
              )}
            </NuevaHistoria>
          </div>
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
    </>
  );
}

function etiquetaCantidad(cantidad: number) {
  return `${cantidad} ${cantidad === 1 ? "historia" : "historias"}`;
}

function Circulo({
  partes,
  etiqueta,
  onClick,
}: {
  partes: number;
  etiqueta: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex shrink-0 flex-col items-center gap-1"
    >
      <AnilloHistorias partes={partes} className={tamanoCirculo} />
      <span className="text-[11px] font-semibold text-foreground">
        {etiqueta}
      </span>
    </button>
  );
}

// Lo que ve el que no confirmó que va al tocar el círculo: una "historia" con el FOMO.
function FomoHistoria({
  juntadaId,
  juntadaNombre,
  cantidad,
  mensajeFomo,
  cerrar,
}: {
  juntadaId: string;
  juntadaNombre: string;
  cantidad: number;
  mensajeFomo: string | null;
  cerrar: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    actualizarAsistencia,
    undefined,
  );
  const segmentos = Math.min(cantidad, MAX_SEGMENTOS);

  // Ya vio el FOMO: el inicio no se lo vuelve a ofrecer (hasta que haya historias nuevas).
  useEffect(() => {
    void marcarFomoVisto(juntadaId);
  }, [juntadaId]);

  return (
    <MarcoHistoria>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/40 via-black to-brasa/30" />
      {/* z-10: el bloque del medio ocupa toda la pantalla y tapaba la cruz. */}
      <div className="absolute inset-x-0 top-0 z-10 flex flex-col gap-3 px-3 pt-3">
        <div className="flex gap-1">
          {Array.from({ length: segmentos }, (_, i) => (
            <span key={i} className="h-0.5 flex-1 rounded-full bg-white/30" />
          ))}
        </div>
        <div className="flex items-center gap-3">
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-white">
            {juntadaNombre}
          </p>
          <button
            type="button"
            onClick={cerrar}
            aria-label="Cerrar"
            className="text-white/80 hover:text-white"
          >
            <X className="h-6 w-6" />
          </button>
        </div>
      </div>

      <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 px-8 text-center">
        <Flame className="fueguito h-16 w-16 text-primary" />
        <p className="font-heading text-4xl leading-tight tracking-wide text-white">
          {mensajeFomo || "Te lo estás perdiendo"}
        </p>
        <p className="text-sm text-white/80">
          Necesitás estar en la juntada para ver las historias.
          <br />
          Hay {etiquetaCantidad(cantidad)} esperándote.
        </p>
        <form action={formAction}>
          <input type="hidden" name="juntadaId" value={juntadaId} />
          <button
            type="submit"
            name="estado"
            value="voy"
            disabled={pending}
            className="rounded-full bg-primary px-8 py-3 text-base font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "…" : "¡Voy!"}
          </button>
        </form>
        {state?.error && <p className="text-sm text-primary">{state.error}</p>}
      </div>
    </MarcoHistoria>
  );
}

// Pantalla completa negra con el cuadro vertical 9:16, del alto de la pantalla (o del
// ancho en celulares angostos).
function MarcoHistoria({ children }: { children: ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black">
      <div className="relative aspect-[9/16] max-h-full w-full max-w-[min(100vw,calc(100dvh*9/16))] overflow-hidden bg-black sm:rounded-xl">
        {children}
      </div>
    </div>
  );
}

function NuevaHistoria({
  juntadaId,
  children,
}: {
  juntadaId: string;
  // El botón que abre la galería: el círculo punteado o el "+" chiquito.
  children: (preparando: boolean) => ReactNode;
}) {
  const input = useRef<HTMLInputElement>(null);
  const [foto, setFoto] = useState<{ blob: Blob; preview: string } | null>(
    null,
  );
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
      const subida = await subirPreparada(foto.blob, {
        tipo: "historia",
        juntadaId,
      });
      const resultado =
        "error" in subida
          ? subida
          : await publicarHistoria(juntadaId, subida.key, texto, fomo);
      if (resultado && "error" in resultado) {
        setError(resultado.error);
      } else {
        cerrar();
      }
    });
  }

  return (
    <div className="relative">
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
        className="block disabled:opacity-60"
      >
        {children(pending && !foto)}
      </button>
      {error && !foto && (
        <p className="absolute right-0 top-full z-10 mt-1 w-40 rounded-md bg-card px-2 py-1 text-right text-[11px] text-primary shadow">
          {error}
        </p>
      )}

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
    </div>
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
  // Con la lista de vistas abierta la historia queda en pausa; al cerrarla arranca de
  // nuevo (reinicio cambia la key de la barra y vuelve a armar el timer).
  const [verVistas, setVerVistas] = useState(false);
  const [reinicio, setReinicio] = useState(0);
  const marcadas = useRef(new Set<string>());

  // Pasa sola a la siguiente; después de la última se cierra.
  useEffect(() => {
    if (verVistas) {
      return;
    }
    const timer = setTimeout(
      () => cambiar(indice + 1 < historias.length ? indice + 1 : null),
      SEGUNDOS_POR_HISTORIA * 1000,
    );
    return () => clearTimeout(timer);
  }, [indice, historias.length, cambiar, verVistas, reinicio]);

  // Cuenta como vista al abrirla (una vez por historia; las propias no cuentan).
  useEffect(() => {
    if (!historia.esMia && !marcadas.current.has(historia.id)) {
      marcadas.current.add(historia.id);
      void marcarHistoriaVista(historia.id);
    }
  }, [historia.id, historia.esMia]);

  return (
    <MarcoHistoria>
      {/* eslint-disable-next-line @next/next/no-img-element -- link firmado de R2 que vence */}
      <img
        src={historia.ruta}
        alt=""
        className="absolute inset-0 h-full w-full object-cover"
      />

      <div className="absolute inset-x-0 top-0 flex flex-col gap-3 bg-gradient-to-b from-black/60 to-transparent px-3 pb-8 pt-3">
        <div className="flex gap-1">
          {historias.map((h, i) => (
            <span
              key={h.id}
              className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30"
            >
              <span
                key={i === indice ? `${h.id}-activa-${reinicio}` : h.id}
                className={cn(
                  "block h-full bg-white",
                  i < indice
                    ? "w-full"
                    : i === indice
                      ? "historia-progreso"
                      : "w-0",
                )}
                style={
                  i === indice
                    ? {
                        animationDuration: `${SEGUNDOS_POR_HISTORIA}s`,
                        animationPlayState: verVistas ? "paused" : "running",
                      }
                    : undefined
                }
              />
            </span>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">
              {juntadaNombre}
            </p>
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
        onClick={() =>
          cambiar(indice + 1 < historias.length ? indice + 1 : null)
        }
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

      {/* Quién la vio: solo en las propias, como en Instagram. */}
      {historia.esMia && (
        <button
          type="button"
          onClick={() => setVerVistas(true)}
          className="absolute bottom-4 left-4 z-10 flex items-center gap-1.5 rounded-full bg-black/50 px-3 py-1.5 text-xs font-semibold text-white"
        >
          <Eye className="h-4 w-4" />
          {historia.vistas.length}
        </button>
      )}

      {verVistas && (
        <div className="absolute inset-0 z-20 flex flex-col justify-end bg-black/50">
          <button
            type="button"
            aria-label="Cerrar vistas"
            onClick={() => {
              setVerVistas(false);
              setReinicio((n) => n + 1);
            }}
            className="flex-1"
          />
          <div className="flex max-h-[60%] flex-col gap-3 rounded-t-2xl bg-card px-4 pb-6 pt-4">
            <div className="flex items-center gap-2">
              <Eye className="h-4 w-4 text-primary" />
              <p className="flex-1 text-sm font-semibold text-foreground">
                {historia.vistas.length === 0
                  ? "Nadie la vio todavía"
                  : `La vi${historia.vistas.length === 1 ? "o" : "eron"} ${historia.vistas.length}`}
              </p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => {
                  setVerVistas(false);
                  setReinicio((n) => n + 1);
                }}
                className="text-muted-foreground-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {historia.vistas.length > 0 && (
              <ul className="flex flex-col gap-2 overflow-y-auto">
                {historia.vistas.map((nombre) => (
                  <li key={nombre} className="text-sm text-foreground">
                    {nombre}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </MarcoHistoria>
  );
}
