import type { CSSProperties } from "react";
import { Flame } from "lucide-react";
import { cn } from "@/lib/utils";

// Más segmentos que esto ya no se distinguen: el borde queda partido en este máximo.
const MAX_SEGMENTOS = 20;

// El círculo de historias de una juntada: borde girando, partido en una porción por
// historia (como Instagram), y el fueguito en el medio (sin miniatura).
export function AnilloHistorias({
  partes,
  className,
}: {
  partes: number;
  className?: string;
}) {
  const segmentos = Math.max(1, Math.min(partes, MAX_SEGMENTOS));
  const estilo = {
    "--partes": segmentos,
    // Con una sola historia el borde va entero; con más, cortes más finos cuantos más hay.
    "--hueco": segmentos > 1 ? `${segmentos > 8 ? 4 : 7}deg` : "0deg",
  } as CSSProperties;

  return (
    <span className={cn("relative block shrink-0", className)}>
      <span
        className="anillo-segmentos absolute inset-0 rounded-full"
        style={estilo}
      />
      <span className="absolute inset-[3px] flex items-center justify-center rounded-full border-2 border-card bg-background">
        <Flame className="h-1/2 w-1/2 max-h-8 max-w-8 text-primary" />
      </span>
    </span>
  );
}

export { MAX_SEGMENTOS };
