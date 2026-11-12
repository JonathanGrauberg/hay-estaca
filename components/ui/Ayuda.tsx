"use client";

import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";
import { cn } from "@/lib/utils";

interface AyudaProps {
  // Lo que explica (ej: "Cuentas · categorías") para lectores de pantalla.
  titulo: string;
  children: ReactNode;
  className?: string;
}

const ANCHO = 256;

// Un "?" que al tocarlo muestra la explicación. Reemplaza los
// textos de aclaración fijos que alargaban la pantalla.
export function Ayuda({ titulo, children, className }: AyudaProps) {
  // Dónde va el globito (fijo en la pantalla, para que no se corte contra el borde).
  const [lugar, setLugar] = useState<{ top: number; left: number } | null>(
    null,
  );
  const caja = useRef<HTMLSpanElement>(null);
  const abierta = lugar !== null;

  function alternar() {
    if (abierta || !caja.current) {
      setLugar(null);
      return;
    }
    const rect = caja.current.getBoundingClientRect();
    const ancho = Math.min(ANCHO, window.innerWidth - 16);
    setLugar({
      top: rect.bottom + 6,
      left: Math.min(
        Math.max(rect.left + rect.width / 2 - ancho / 2, 8),
        window.innerWidth - ancho - 8,
      ),
    });
  }

  useEffect(() => {
    if (!abierta) {
      return;
    }
    function afuera(evento: PointerEvent) {
      if (caja.current && !caja.current.contains(evento.target as Node)) {
        setLugar(null);
      }
    }
    const cerrar = () => setLugar(null);
    document.addEventListener("pointerdown", afuera);
    window.addEventListener("scroll", cerrar, true);
    return () => {
      document.removeEventListener("pointerdown", afuera);
      window.removeEventListener("scroll", cerrar, true);
    };
  }, [abierta]);

  return (
    <span
      ref={caja}
      className={cn("relative inline-flex align-middle", className)}
    >
      <button
        type="button"
        onClick={alternar}
        aria-label={`Ayuda: ${titulo}`}
        aria-expanded={abierta}
        className="flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground-2 hover:text-primary"
      >
        <CircleHelp className="h-4 w-4" />
      </button>
      {lugar && (
        <span
          role="tooltip"
          style={{
            top: lugar.top,
            left: lugar.left,
            width: Math.min(ANCHO, window.innerWidth - 16),
          }}
          className="fixed z-[60] rounded-lg border border-border bg-background px-3 py-2 text-left text-xs font-normal normal-case leading-relaxed tracking-normal text-muted-foreground shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}
