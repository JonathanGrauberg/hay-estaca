"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CircleHelp, PencilLine, Radio } from "lucide-react";
import {
  anotarTruco,
  cambiarAnotadorTruco,
  revanchaTruco,
} from "@/lib/actions/truco";
import type { PartidaTrucoVista } from "@/lib/juegos/partida-truco";
import { ganador, type Equipo } from "@/lib/juegos/truco";
import { ColumnaTruco, ReglasTruco } from "@/components/juegos/AnotadorTruco";

// Cada cuánto preguntan los que miran. Sin websockets: alcanza y no suma librerías.
const CADA_MS = 1500;

interface PartidaEnVivoProps {
  inicial: PartidaTrucoVista;
  yoId: string;
  esAdmin: boolean;
  // Confirmó que va (o es admin): puede tomar el anotador si quedó libre.
  puedeTomar: boolean;
  // A quién se le puede pasar el anotador: los que van.
  candidatos: { id: string; nombre: string }[];
}

export function PartidaEnVivo({
  inicial,
  yoId,
  esAdmin,
  puedeTomar,
  candidatos,
}: PartidaEnVivoProps) {
  const router = useRouter();
  const [partida, setPartida] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [mostrarReglas, setMostrarReglas] = useState(false);
  const [cambiando, startCambio] = useTransition();
  // Toques del anotador que todavía no volvieron del servidor: mientras haya, el
  // polling no pisa lo que se ve.
  const pendientes = useRef(0);

  const soyAnotador = partida.anotador?.id === yoId;

  useEffect(() => {
    let vivo = true;
    async function consultar() {
      if (document.hidden || pendientes.current > 0) {
        return;
      }
      try {
        const respuesta = await fetch(`/api/truco/${inicial.id}`, {
          cache: "no-store",
        });
        if (respuesta.status === 404) {
          router.replace(`/juntadas/${inicial.juntadaId}/truco`);
          return;
        }
        if (!respuesta.ok || !vivo || pendientes.current > 0) {
          return;
        }
        const nueva = (await respuesta.json()) as PartidaTrucoVista;
        setPartida((actual) =>
          nueva.version >= actual.version ? nueva : actual,
        );
      } catch {
        // Sin señal: se reintenta en la próxima vuelta.
      }
    }
    const timer = setInterval(consultar, CADA_MS);
    document.addEventListener("visibilitychange", consultar);
    return () => {
      vivo = false;
      clearInterval(timer);
      document.removeEventListener("visibilitychange", consultar);
    };
  }, [inicial.id, inicial.juntadaId, router]);

  async function anotar(equipo: Equipo, delta: number) {
    setError(null);
    // Se ve al toque; el servidor confirma (y corrige si hace falta).
    setPartida((actual) => {
      const puntos = Math.min(
        Math.max(actual.puntos[equipo] + delta, 0),
        actual.limite,
      );
      const nuevos = { ...actual.puntos, [equipo]: puntos };
      return {
        ...actual,
        puntos: nuevos,
        terminada: nuevos.nos >= actual.limite || nuevos.ellos >= actual.limite,
      };
    });
    navigator.vibrate?.(15);
    pendientes.current += 1;
    const resultado = await anotarTruco(partida.id, equipo, delta);
    pendientes.current -= 1;
    if ("error" in resultado) {
      setError(resultado.error);
      router.refresh();
      return;
    }
    if (pendientes.current === 0) {
      setPartida(resultado);
    }
  }

  function pasarA(id: string) {
    setError(null);
    startCambio(async () => {
      const resultado = await cambiarAnotadorTruco(partida.id, id);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      const nuevo = candidatos.find((c) => c.id === id);
      setPartida((actual) => ({
        ...actual,
        anotador: nuevo ?? actual.anotador,
      }));
      router.refresh();
    });
  }

  const gano = ganador({
    nos: partida.puntos.nos,
    ellos: partida.puntos.ellos,
    limite: partida.limite,
  });
  const puedoTomarlo =
    !soyAnotador && (esAdmin || (puedeTomar && partida.anotador === null));

  return (
    <div className="flex flex-1 flex-col gap-4">
      <div className="flex items-center gap-2">
        <span className="rounded-full border-2 border-primary px-3 py-1 text-xs font-bold text-primary">
          A {partida.limite}
        </span>
        <p className="flex min-w-0 flex-1 items-center gap-1.5 text-xs text-muted-foreground">
          {soyAnotador ? (
            <>
              <PencilLine className="h-4 w-4 shrink-0 text-primary" />
              <span className="truncate">
                Anotás vos: los demás lo ven en vivo
              </span>
            </>
          ) : (
            <>
              <Radio className="h-4 w-4 shrink-0 animate-pulse text-primary" />
              <span className="truncate">
                En vivo ·{" "}
                {partida.anotador
                  ? `anota ${partida.anotador.nombre}`
                  : "sin anotador"}
              </span>
            </>
          )}
        </p>
        <button
          type="button"
          onClick={() => setMostrarReglas(true)}
          aria-label="Ver reglas"
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary"
        >
          <CircleHelp className="h-5 w-5" />
        </button>
      </div>

      <div className="relative flex flex-1 gap-3 rounded-lg border-2 border-primary/40 bg-card p-3">
        {(["nos", "ellos"] as const).map((equipo, i) => (
          <div key={equipo} className="contents">
            {i === 1 && (
              <div className="w-0.5 self-stretch rounded-full bg-primary/40" />
            )}
            <ColumnaTruco
              nombre={partida.nombres[equipo]}
              puntos={partida.puntos[equipo]}
              limite={partida.limite}
              jugadores={partida.jugadores[equipo]}
              onCambiar={
                soyAnotador ? (delta) => void anotar(equipo, delta) : undefined
              }
            />
          </div>
        ))}

        {gano && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 rounded-lg bg-background/90 px-4 text-center backdrop-blur-sm">
            <p className="font-heading text-5xl tracking-wide text-primary">
              ¡{partida.jugadores[gano].length > 1 ? "GANARON" : "GANÓ"}{" "}
              {partida.nombres[gano].toUpperCase()}!
            </p>
            <p className="font-heading text-3xl tracking-wide text-foreground">
              {partida.puntos[gano]} ·{" "}
              {partida.puntos[gano === "nos" ? "ellos" : "nos"]}
            </p>
            {partida.jugadores[gano].length > 0 && (
              <p className="text-sm text-muted-foreground">
                {partida.jugadores[gano].join(" · ")}
              </p>
            )}
            {soyAnotador && (
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => void anotar(gano, -1)}
                  className="rounded-full border-2 border-primary px-4 py-2 text-sm font-bold text-primary"
                >
                  Me equivoqué
                </button>
                <form action={revanchaTruco.bind(null, partida.id)}>
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-4 py-2 text-sm font-bold text-primary-foreground"
                  >
                    Revancha
                  </button>
                </form>
              </div>
            )}
          </div>
        )}
      </div>

      {error && <p className="text-sm text-primary">{error}</p>}

      {soyAnotador && candidatos.length > 1 && (
        <select
          value=""
          disabled={cambiando}
          onChange={(event) => event.target.value && pasarA(event.target.value)}
          aria-label="Pasarle el anotador a otro"
          className="self-center rounded-full border border-border bg-card px-3 py-1.5 text-xs text-muted-foreground outline-none focus:border-primary"
        >
          <option value="" className="bg-card">
            Pasarle el anotador a…
          </option>
          {candidatos
            .filter((c) => c.id !== yoId)
            .map((c) => (
              <option
                key={c.id}
                value={c.id}
                className="bg-card text-foreground"
              >
                {c.nombre}
              </option>
            ))}
        </select>
      )}

      {puedoTomarlo && (
        <button
          type="button"
          disabled={cambiando}
          onClick={() => pasarA(yoId)}
          className="self-center rounded-full border border-primary px-4 py-1.5 text-xs font-semibold text-primary disabled:opacity-60"
        >
          {partida.anotador
            ? `Tomar el anotador (ahora anota ${partida.anotador.nombre})`
            : "Hacerme cargo del anotador"}
        </button>
      )}

      {mostrarReglas && (
        <ReglasTruco
          partida={{
            nos: partida.puntos.nos,
            ellos: partida.puntos.ellos,
            limite: partida.limite,
          }}
          onCerrar={() => setMostrarReglas(false)}
        />
      )}
    </div>
  );
}
