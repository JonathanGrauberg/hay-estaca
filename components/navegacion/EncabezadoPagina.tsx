import Link from "next/link";
import type { ReactNode } from "react";
import { ArrowLeft } from "lucide-react";

interface EncabezadoPaginaProps {
  titulo: string;
  volverA?: string;
  // Acción a la derecha del título (ej: lápiz para editar).
  accion?: ReactNode;
}

export function EncabezadoPagina({ titulo, volverA, accion }: EncabezadoPaginaProps) {
  return (
    <div className="flex items-center gap-2">
      {volverA && (
        <Link
          href={volverA}
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
          aria-label="Volver"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
      )}
      <h1 className="min-w-0 flex-1 truncate text-xl font-semibold text-foreground">{titulo}</h1>
      {accion}
    </div>
  );
}
