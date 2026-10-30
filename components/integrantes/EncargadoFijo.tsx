import { Coins } from "lucide-react";
import { cambiarEncargadoFijo } from "@/lib/actions/casaMoneda";
import { cn } from "@/lib/utils";

interface EncargadoFijoProps {
  userId: string;
  apodo: string;
  encargado: boolean;
}

// Encargado fijo de "la casa de la moneda": se hace cargo de las cuentas de cada
// juntada a la que confirma que va.
export function EncargadoFijo({ userId, apodo, encargado }: EncargadoFijoProps) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        CASA DE LA MONEDA
      </h2>
      <form
        action={cambiarEncargadoFijo.bind(null, userId, !encargado)}
        className="flex items-center gap-3 rounded-lg bg-card px-4 py-3"
      >
        <Coins
          className={cn("h-5 w-5 shrink-0", encargado ? "text-primary" : "text-muted-foreground-2")}
        />
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          {encargado
            ? `${apodo} es encargado: maneja las cuentas de las juntadas a las que va.`
            : `${apodo} no es encargado de las cuentas.`}
        </p>
        <button
          type="submit"
          className={cn(
            "shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold",
            encargado
              ? "border border-border text-muted-foreground hover:text-foreground"
              : "bg-primary text-primary-foreground"
          )}
        >
          {encargado ? "Sacar" : "Hacer encargado"}
        </button>
      </form>
    </section>
  );
}
