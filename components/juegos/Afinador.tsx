"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Mic, MicOff } from "lucide-react";
import {
  CUERDAS,
  cents,
  cuerdaMasCercana,
  detectarFrecuencia,
  notaMasCercana,
  type Cuerda,
} from "@/lib/juegos/afinador";
import { Ayuda } from "@/components/ui/Ayuda";
import { cn } from "@/lib/utils";

// Cada cuánto se escucha (ms) y cuántas lecturas se promedian (mediana) para que la
// aguja no tiemble.
const CADA_MS = 70;
const LECTURAS = 5;
// Cuánto se aguanta sin nota antes de volver a "tocá una cuerda".
const SIN_NOTA_MS = 1200;
// ±cents en los que ya cuenta como afinada.
const AFINADA = 5;

type Estado = "apagado" | "prendiendo" | "escuchando";

function mediana(valores: number[]) {
  const orden = [...valores].sort((a, b) => a - b);
  return orden[Math.floor(orden.length / 2)];
}

export function Afinador() {
  const [estado, setEstado] = useState<Estado>("apagado");
  const [error, setError] = useState<string | null>(null);
  // null = automático (reconoce la cuerda que suena).
  const [elegida, setElegida] = useState<Cuerda | null>(null);
  const [frecuencia, setFrecuencia] = useState<number | null>(null);
  const audio = useRef<{ ctx: AudioContext; stream: MediaStream; reloj: number } | null>(null);

  function apagar() {
    if (audio.current) {
      window.clearInterval(audio.current.reloj);
      audio.current.stream.getTracks().forEach((pista) => pista.stop());
      void audio.current.ctx.close();
      audio.current = null;
    }
    setFrecuencia(null);
    setEstado("apagado");
  }

  useEffect(() => () => apagar(), []);

  async function prender() {
    setError(null);
    setEstado("prendiendo");
    try {
      // Sin los filtros de llamada: le borran el sonido a la guitarra.
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
      });
      const Ctx =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      const ctx = new Ctx();
      await ctx.resume();
      const analizador = ctx.createAnalyser();
      analizador.fftSize = 4096;
      ctx.createMediaStreamSource(stream).connect(analizador);
      const datos = new Float32Array(analizador.fftSize);
      const ultimas: number[] = [];
      let ultimaNota = 0;

      const reloj = window.setInterval(() => {
        analizador.getFloatTimeDomainData(datos);
        const f = detectarFrecuencia(datos, ctx.sampleRate);
        const ahora = Date.now();
        if (f) {
          ultimaNota = ahora;
          ultimas.push(f);
          if (ultimas.length > LECTURAS) ultimas.shift();
          setFrecuencia(mediana(ultimas));
        } else if (ahora - ultimaNota > SIN_NOTA_MS) {
          ultimas.length = 0;
          setFrecuencia(null);
        }
      }, CADA_MS);

      audio.current = { ctx, stream, reloj };
      setEstado("escuchando");
    } catch (e) {
      setEstado("apagado");
      const nombre = e instanceof DOMException ? e.name : "";
      setError(
        nombre === "NotAllowedError"
          ? "Hay que darle permiso al micrófono (en la configuración del navegador)."
          : "No se pudo usar el micrófono.",
      );
    }
  }

  const objetivo = frecuencia ? (elegida ?? cuerdaMasCercana(frecuencia)) : elegida;
  const desvio = frecuencia && objetivo ? cents(frecuencia, objetivo.frecuencia) : null;
  const afinada = desvio !== null && Math.abs(desvio) <= AFINADA;
  // Muy lejos (eligió una cuerda y está tocando otra): no se marca alta/baja fina.
  const lejos = desvio !== null && Math.abs(desvio) > 100;
  const aguja = desvio === null ? 0 : Math.max(-50, Math.min(50, desvio));

  return (
    <div className="flex flex-col gap-5">
      <div className="flex items-start gap-2 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Tocá una cuerda al aire cerca del celu. En <b className="text-foreground">Auto</b>{" "}
          reconoce cuál es; si no, elegila abajo.
        </p>
        <Ayuda titulo="Afinador">
          Afinación estándar: 6.ª Mi (82,41 Hz), 5.ª La (110 Hz), 4.ª Re (146,83 Hz), 3.ª Sol
          (196 Hz), 2.ª Si (246,94 Hz) y 1.ª Mi (329,63 Hz). Si la aguja está a la izquierda,
          la cuerda está baja: apretá la clavija. A la derecha, aflojala. Con ruido alrededor
          cuesta más. El audio no se graba ni sale del celu.
        </Ayuda>
      </div>

      <section
        className={cn(
          "flex flex-col items-center gap-4 rounded-lg border-2 bg-card px-4 py-6 transition-colors",
          afinada ? "border-emerald-500" : "border-transparent",
        )}
      >
        <div className="flex items-baseline gap-2">
          <p
            className={cn(
              "font-heading text-8xl leading-none tracking-wide transition-colors",
              afinada ? "text-emerald-500" : objetivo ? "text-foreground" : "text-muted-foreground-2",
            )}
          >
            {objetivo ? objetivo.nombre.toUpperCase() : "—"}
          </p>
          {objetivo && (
            <p className="text-lg font-semibold text-muted-foreground">{objetivo.numero}.ª</p>
          )}
        </div>

        {/* Aguja: -50 a +50 cents. */}
        <div className="relative h-14 w-full max-w-xs">
          <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 rounded-full bg-secondary" />
          <div className="absolute left-1/2 top-1/2 h-6 w-[10%] -translate-x-1/2 -translate-y-1/2 rounded bg-emerald-500/25" />
          {[-50, -25, 0, 25, 50].map((marca) => (
            <div
              key={marca}
              className={cn(
                "absolute top-1/2 w-px -translate-y-1/2 bg-muted-foreground-2",
                marca === 0 ? "h-10" : "h-4",
              )}
              style={{ left: `${50 + marca}%` }}
            />
          ))}
          <div
            className={cn(
              "absolute top-0 h-full w-1.5 -translate-x-1/2 rounded-full transition-[left] duration-100",
              desvio === null ? "bg-muted-foreground-2/40" : afinada ? "bg-emerald-500" : "bg-primary",
            )}
            style={{ left: `${50 + aguja}%` }}
          />
        </div>
        <div className="flex w-full max-w-xs justify-between text-xs text-muted-foreground-2">
          <span>Baja</span>
          <span>Alta</span>
        </div>

        <p
          className={cn(
            "flex min-h-7 items-center gap-1.5 text-center text-lg font-semibold",
            afinada ? "text-emerald-500" : "text-foreground",
          )}
        >
          {estado !== "escuchando"
            ? "Prendé el afinador"
            : desvio === null
              ? "Tocá una cuerda…"
              : afinada
                ? (
                    <>
                      <Check className="h-5 w-5" /> ¡Afinada!
                    </>
                  )
                : lejos
                  ? `Suena un ${notaMasCercana(frecuencia!)}: ¿es la ${objetivo!.numero}.ª?`
                  : desvio < 0
                    ? "Está baja: apretá un poco"
                    : "Está alta: aflojá un poco"}
        </p>
        {frecuencia && desvio !== null && (
          <p className="-mt-3 text-xs text-muted-foreground-2">
            {frecuencia.toFixed(1)} Hz · {desvio > 0 ? "+" : ""}
            {Math.round(desvio)} cents
          </p>
        )}
      </section>

      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">CUERDA</p>
        <div className="grid grid-cols-7 gap-1.5">
          <button
            type="button"
            onClick={() => setElegida(null)}
            aria-pressed={elegida === null}
            className={cn(
              "rounded-lg py-2.5 text-xs font-bold",
              elegida === null ? "bg-primary text-primary-foreground" : "bg-card text-muted-foreground",
            )}
          >
            Auto
          </button>
          {CUERDAS.map((cuerda) => {
            const activa =
              elegida?.numero === cuerda.numero ||
              (elegida === null && objetivo?.numero === cuerda.numero);
            return (
              <button
                key={cuerda.numero}
                type="button"
                onClick={() => setElegida(cuerda)}
                aria-pressed={elegida?.numero === cuerda.numero}
                aria-label={`${cuerda.numero}.ª cuerda, ${cuerda.nombre}`}
                className={cn(
                  "flex flex-col items-center rounded-lg py-1.5",
                  elegida?.numero === cuerda.numero
                    ? "bg-primary text-primary-foreground"
                    : activa
                      ? "bg-primary/15 text-foreground ring-1 ring-primary"
                      : "bg-card text-muted-foreground",
                )}
              >
                <span className="text-sm font-bold">{cuerda.nombre}</span>
                <span className="text-[10px] opacity-75">{cuerda.numero}.ª</span>
              </button>
            );
          })}
        </div>
      </div>

      {error && <p className="text-sm text-primary">{error}</p>}
      {estado === "escuchando" ? (
        <button
          type="button"
          onClick={apagar}
          className="flex items-center justify-center gap-2 rounded-full border border-border px-4 py-3 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          <MicOff className="h-4 w-4" />
          Apagar
        </button>
      ) : (
        <button
          type="button"
          disabled={estado === "prendiendo"}
          onClick={prender}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-bold text-primary-foreground active:scale-95 disabled:opacity-60"
        >
          <Mic className="h-5 w-5" />
          {estado === "prendiendo" ? "Prendiendo…" : "Prender afinador"}
        </button>
      )}
    </div>
  );
}
