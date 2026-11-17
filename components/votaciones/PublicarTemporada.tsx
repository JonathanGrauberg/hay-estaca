"use client";

import { useState, useTransition } from "react";
import { Eye, EyeOff } from "lucide-react";
import { publicarTemporada } from "@/lib/actions/votaciones";
import { cn } from "@/lib/utils";

// Solo el admin: mientras no se publica, los demás ven "la están preparando".
export function PublicarTemporada({
  temporadaId,
  publicada,
}: {
  temporadaId: string;
  publicada: boolean;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function cambiar() {
    const mensaje = publicada
      ? "¿Ocultar las votaciones? Los demás vuelven a ver que las están preparando."
      : "¿Publicar las votaciones? Todos van a poder proponer categorías y votar.";
    if (!window.confirm(mensaje)) return;
    setError(null);
    startTransition(async () => {
      const resultado = await publicarTemporada(temporadaId, !publicada);
      if ("error" in resultado) setError(resultado.error);
    });
  }

  return (
    <div
      className={cn(
        "flex items-center gap-3 rounded-lg px-4 py-3",
        publicada ? "bg-card" : "border border-dashed border-primary/60 bg-primary/5",
      )}
    >
      {publicada ? (
        <Eye className="h-5 w-5 shrink-0 text-primary" />
      ) : (
        <EyeOff className="h-5 w-5 shrink-0 text-primary" />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          {publicada ? "Publicada: la ven todos" : "Solo la ves vos"}
        </p>
        <p className="text-xs text-muted-foreground-2">
          {publicada
            ? "Pueden proponer y votar."
            : 'Los demás ven "Los admin de las votaciones están preparando la encuesta".'}
        </p>
        {error && <p className="text-xs text-primary">{error}</p>}
      </div>
      <button
        type="button"
        disabled={pending}
        onClick={cambiar}
        className={cn(
          "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold disabled:opacity-60",
          publicada
            ? "border border-border text-muted-foreground hover:text-foreground"
            : "bg-primary text-primary-foreground",
        )}
      >
        {publicada ? "Ocultar" : "Publicar"}
      </button>
    </div>
  );
}
