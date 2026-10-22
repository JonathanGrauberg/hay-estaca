"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";

export function BotonCopiar({ texto, label }: { texto: string; label: string }) {
  const [copiado, setCopiado] = useState(false);

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setCopiado(true);
      setTimeout(() => setCopiado(false), 1500);
    } catch {
      // Sin permiso de portapapeles (o http): queda el alias visible para copiar a mano.
    }
  }

  return (
    <button
      type="button"
      onClick={copiar}
      className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      {copiado ? <Check className="h-3.5 w-3.5 text-primary" /> : <Copy className="h-3.5 w-3.5" />}
      {copiado ? "Copiado" : label}
    </button>
  );
}
