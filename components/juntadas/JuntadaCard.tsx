import Link from "next/link";
import { Flame } from "lucide-react";
import { cn, formatFechaCorta } from "@/lib/utils";

export type JuntadaCardVariant = "destacada" | "proxima" | "pasada";

interface JuntadaCardProps {
  id: string;
  nombre: string;
  fecha: Date;
  hora: string;
  ubicacion?: string | null;
  mensajeFomo?: string | null;
  variant: JuntadaCardVariant;
  /** Solo se usa (y se muestra) cuando variant === "destacada". */
  confirmados?: number;
  totalMiembros?: number;
  invitados?: number;
  /** Tiene historias de las últimas 24 hs: borde que gira y cartel, y abre las historias. */
  hayHistoria?: boolean;
}

export function JuntadaCard({
  id,
  nombre,
  fecha,
  hora,
  ubicacion,
  mensajeFomo,
  variant,
  confirmados,
  totalMiembros,
  invitados = 0,
  hayHistoria = false,
}: JuntadaCardProps) {
  const destacada = variant === "destacada";
  const pasada = variant === "pasada";

  const detalle = [
    formatFechaCorta(fecha),
    !pasada ? `${hora}hs` : null,
    ubicacion || null,
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <Link
      href={hayHistoria ? `/juntadas/${id}?historias=1` : `/juntadas/${id}`}
      className={cn(
        "flex items-start justify-between gap-3 rounded-lg px-4 py-3 transition-colors",
        hayHistoria
          ? "borde-historia"
          : cn(
              "border-l-4 bg-card hover:bg-accent",
              destacada ? "border-l-primary" : "border-l-border",
              pasada && "opacity-50"
            )
      )}
    >
      <div className="min-w-0">
        <p className="truncate text-[15px] font-semibold text-foreground">{nombre}</p>
        <p className="mt-0.5 truncate text-sm text-muted-foreground">{detalle}</p>
        {mensajeFomo && (
          <p className="mt-1 truncate text-sm text-muted-foreground-2">{mensajeFomo}</p>
        )}
      </div>

      {hayHistoria && (
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary px-2.5 py-1 text-xs font-semibold text-primary-foreground">
          <Flame className="h-3.5 w-3.5" />
          ¡Hay historia!
        </span>
      )}

      {!hayHistoria && destacada && confirmados !== undefined && totalMiembros !== undefined && (
        <span className="shrink-0 rounded-full bg-primary/15 px-2.5 py-1 text-xs font-semibold text-primary">
          {confirmados} de {totalMiembros} ✓{invitados > 0 && ` +${invitados}`}
        </span>
      )}
    </Link>
  );
}
