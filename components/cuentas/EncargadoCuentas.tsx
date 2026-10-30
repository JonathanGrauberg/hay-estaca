import { Coins, TriangleAlert } from "lucide-react";
import { hacermeCargo } from "@/lib/actions/casaMoneda";
import type { EncargadoCuentas as Encargado } from "@/lib/cuentas/encargado";

interface EncargadoCuentasProps {
  juntadaId: string;
  encargado: Encargado | null;
}

// Quién maneja "la casa de la moneda" en esta juntada, o el aviso de que falta.
export function EncargadoCuentas({ juntadaId, encargado }: EncargadoCuentasProps) {
  if (encargado) {
    return (
      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <Coins className="h-4 w-4 shrink-0 text-primary" />
        <span>
          Casa de la moneda:{" "}
          <span className="font-semibold text-foreground">{encargado.nombre}</span>
        </span>
      </p>
    );
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border border-primary/50 bg-primary/10 px-4 py-3">
      <TriangleAlert className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-foreground">
          Che, falta encargado de la casa de la moneda
        </p>
        <p className="text-xs text-muted-foreground">
          Ningún encargado confirmó que va. Alguien tiene que dividir y cerrar las cuentas.
        </p>
      </div>
      <form action={hacermeCargo.bind(null, juntadaId)}>
        <button
          type="submit"
          className="shrink-0 rounded-full bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground"
        >
          Me hago cargo
        </button>
      </form>
    </div>
  );
}
