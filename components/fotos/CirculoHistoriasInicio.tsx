"use client";

import { useState } from "react";
import Link from "next/link";
import { CalendarDays, Flame, X } from "lucide-react";
import { AnilloHistorias } from "@/components/fotos/AnilloHistorias";

interface CirculoHistoriasInicioProps {
  juntadaId: string;
  nombre: string;
  cantidad: number;
  // Si va, al tocar elige entre ver la historia o la juntada. Si no, va directo a la
  // juntada y ahí le sale el FOMO.
  voy: boolean;
}

// Un círculo de la fila "HISTORIAS" del inicio.
export function CirculoHistoriasInicio({
  juntadaId,
  nombre,
  cantidad,
  voy,
}: CirculoHistoriasInicioProps) {
  const [menu, setMenu] = useState(false);

  const contenido = (
    <>
      <AnilloHistorias partes={cantidad} className="h-16 w-16" />
      <span className="w-full truncate text-center text-xs text-muted-foreground">
        {nombre}
      </span>
    </>
  );
  const clases = "flex w-20 shrink-0 flex-col items-center gap-1.5";

  if (!voy) {
    return (
      <Link href={`/juntadas/${juntadaId}?historias=1`} className={clases}>
        {contenido}
      </Link>
    );
  }

  return (
    <>
      <button type="button" onClick={() => setMenu(true)} className={clases}>
        {contenido}
      </button>

      {menu && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={() => setMenu(false)}
            className="absolute inset-0"
          />
          <div className="relative flex w-full flex-col gap-2 rounded-t-2xl bg-card px-4 pb-8 pt-4 sm:max-w-sm sm:rounded-2xl sm:pb-4">
            <div className="flex items-center gap-2">
              <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
                {nombre}
              </p>
              <button
                type="button"
                aria-label="Cerrar"
                onClick={() => setMenu(false)}
                className="text-muted-foreground-2 hover:text-foreground"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <Link
              href={`/juntadas/${juntadaId}?historias=1`}
              className="flex items-center gap-3 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
            >
              <Flame className="h-5 w-5" />
              Ver {cantidad === 1 ? "historia" : `historias (${cantidad})`}
            </Link>
            <Link
              href={`/juntadas/${juntadaId}`}
              className="flex items-center gap-3 rounded-lg border border-border px-4 py-3 text-sm font-semibold text-foreground hover:bg-accent"
            >
              <CalendarDays className="h-5 w-5 text-primary" />
              Ver juntada
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
