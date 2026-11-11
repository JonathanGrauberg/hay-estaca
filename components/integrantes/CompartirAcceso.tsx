"use client";

import { useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

interface CompartirAccesoProps {
  apodo: string;
  pin: string;
}

// El PIN recién generado, con el mensaje listo para mandarle por privado. Se muestra
// una sola vez: en la base solo queda el hash.
export function CompartirAcceso({ apodo, pin }: CompartirAccesoProps) {
  const [copiado, setCopiado] = useState(false);

  function mensaje() {
    return [
      `¡Hola ${apodo}! Ya tenés tu acceso a ¡Hay peña!, la app de los Estaqueros.`,
      "",
      `Entrá acá: ${window.location.origin}`,
      `Tocá tu nombre y poné este PIN: ${pin}`,
      "",
      'Después lo podés cambiar por uno tuyo en "Yo". Y si la agregás a la pantalla de inicio queda como una app.',
    ].join("\n");
  }

  async function compartir() {
    const texto = mensaje();
    // En el celular abre el menú de compartir (WhatsApp, etc.); en la compu, copia.
    if (navigator.share) {
      try {
        await navigator.share({ text: texto });
        return;
      } catch {
        // Canceló el menú: no hacemos nada.
        return;
      }
    }
    await copiar();
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(mensaje());
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin portapapeles: el PIN queda a la vista para pasarlo a mano.
    }
  }

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">PIN de {apodo}</p>
          <p className="text-xs text-muted-foreground">
            Pasáselo ahora: después no se vuelve a ver.
          </p>
        </div>
        <p className="shrink-0 font-heading text-4xl tracking-[0.2em] text-primary">{pin}</p>
      </div>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={compartir}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
        >
          <Share2 className="h-4 w-4" />
          Compartir
        </button>
        <button
          type="button"
          onClick={copiar}
          className="flex items-center justify-center gap-1.5 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-foreground"
        >
          {copiado ? <Check className="h-4 w-4 text-primary" /> : <Copy className="h-4 w-4" />}
          {copiado ? "Copiado" : "Copiar texto"}
        </button>
      </div>
    </div>
  );
}
