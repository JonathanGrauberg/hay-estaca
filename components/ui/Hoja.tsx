"use client";

import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

interface HojaProps {
  titulo: string;
  onCerrar: () => void;
  children: ReactNode;
}

// Un modal que en el celu sube desde abajo (como una hoja) y en la compu queda al medio.
// Así las cosas que se usan de a ratos no alargan la pantalla.
export function Hoja({ titulo, onCerrar, children }: HojaProps) {
  useEffect(() => {
    function alTeclear(evento: KeyboardEvent) {
      if (evento.key === "Escape") {
        onCerrar();
      }
    }
    document.addEventListener("keydown", alTeclear);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", alTeclear);
      document.body.style.overflow = overflow;
    };
  }, [onCerrar]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={titulo}
      className="fixed inset-0 z-50 flex flex-col justify-end bg-black/60 sm:items-center sm:justify-center"
    >
      <button
        type="button"
        aria-label="Cerrar"
        onClick={onCerrar}
        className="absolute inset-0 cursor-default"
      />
      <div className="relative flex max-h-[90dvh] w-full flex-col rounded-t-2xl bg-card sm:max-w-md sm:rounded-2xl">
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <button
            type="button"
            aria-label="Cerrar"
            onClick={onCerrar}
            className="text-muted-foreground-2 hover:text-foreground"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {titulo}
          </p>
        </div>
        <div className="overflow-y-auto px-4 pb-8 pt-4 sm:pb-4">{children}</div>
      </div>
    </div>
  );
}
