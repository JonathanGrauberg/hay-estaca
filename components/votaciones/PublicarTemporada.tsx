"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff, FlaskConical } from "lucide-react";
import {
  borrarTemporada,
  empezarPrueba,
  publicarTemporada,
  terminarPrueba,
  type ResultadoVotacion,
} from "@/lib/actions/votaciones";
import { cn } from "@/lib/utils";

const botonChico = "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60";

// Panel de los admin: publicar/ocultar y, mientras está oculta, ensayar la revelación.
export function PublicarTemporada({
  temporadaId,
  publicada,
  prueba,
  cerradaPorFecha,
}: {
  temporadaId: string;
  publicada: boolean;
  prueba: boolean;
  // Ya llegó la despedida: no hay más ensayo.
  cerradaPorFecha: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function correr(mensaje: string, accion: () => Promise<ResultadoVotacion>) {
    if (!window.confirm(mensaje)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if ("error" in resultado) setError(resultado.error);
    });
  }

  if (prueba) {
    return (
      <div className="flex flex-col gap-2 rounded-lg border-2 border-dashed border-amber-400/70 bg-amber-400/10 px-4 py-3">
        <div className="flex items-center gap-3">
          <FlaskConical className="h-5 w-5 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-foreground">Modo prueba</p>
            <p className="text-xs text-muted-foreground-2">
              La votación está cerrada como en la despedida: elijan quién revela cada sobre
              (tiene que ser admin, los demás no la ven) y ábranlos.
            </p>
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              correr(
                "¿Terminar la prueba? Se borran los votos de la prueba y los sobres se vuelven a tapar. Las categorías y quién revela cada una quedan.",
                () => terminarPrueba(temporadaId),
              )
            }
            className={cn(botonChico, "bg-amber-400 text-black")}
          >
            Terminar prueba
          </button>
        </div>
        {error && <p className="text-xs text-primary">{error}</p>}
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex flex-col gap-2 rounded-lg px-4 py-3",
        publicada ? "bg-card" : "border border-dashed border-primary/60 bg-primary/5",
      )}
    >
      <div className="flex items-center gap-3">
        {publicada ? (
          <Eye className="h-5 w-5 shrink-0 text-primary" />
        ) : (
          <EyeOff className="h-5 w-5 shrink-0 text-primary" />
        )}
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            {publicada ? "Publicada: la ven todos" : "Solo la ven los admin"}
          </p>
          <p className="text-xs text-muted-foreground-2">
            {publicada
              ? "Pueden proponer y votar."
              : 'Los demás ven "Los admin de las votaciones están preparando la encuesta".'}
          </p>
        </div>
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            correr(
              publicada
                ? "¿Ocultar las votaciones? Los demás vuelven a ver que las están preparando."
                : "¿Publicar las votaciones? Todos van a poder proponer categorías y votar.",
              () => publicarTemporada(temporadaId, !publicada),
            )
          }
          className={cn(
            botonChico,
            publicada
              ? "border border-border text-muted-foreground hover:text-foreground"
              : "bg-primary text-primary-foreground",
          )}
        >
          {publicada ? "Ocultar" : "Publicar"}
        </button>
      </div>

      {!publicada && !cerradaPorFecha && (
        <div className="flex items-center gap-3 border-t border-border pt-2">
          <FlaskConical className="h-5 w-5 shrink-0 text-amber-400" />
          <p className="min-w-0 flex-1 text-xs text-muted-foreground-2">
            Ensayen la despedida: voten entre los admin y prueben abrir los sobres. Al
            terminar se borran esos votos.
          </p>
          <button
            type="button"
            disabled={pending}
            onClick={() =>
              correr(
                "¿Probar la revelación? La votación se cierra hasta que terminen la prueba (la fecha no cambia).",
                () => empezarPrueba(temporadaId),
              )
            }
            className={cn(botonChico, "bg-amber-400 text-black")}
          >
            Probar
          </button>
        </div>
      )}

      {!publicada && (
        <button
          type="button"
          disabled={pending}
          onClick={() =>
            correr(
              "¿Borrar la temporada entera? Se van las categorías, propuestas y votos. No se puede deshacer.",
              () => borrarTemporada(temporadaId),
            )
          }
          className="self-start text-xs text-muted-foreground-2 underline-offset-2 hover:text-primary hover:underline"
        >
          Borrar temporada (para empezar de cero)
        </button>
      )}
      {error && <p className="text-xs text-primary">{error}</p>}
    </div>
  );
}
