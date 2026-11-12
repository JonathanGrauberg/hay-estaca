import { requireUsuario } from "@/lib/auth";
import { AnotadorTruco } from "@/components/juegos/AnotadorTruco";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function TrucoPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-4 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Truco" volverA="/juegos" />
      <p className="-mt-2 text-xs text-muted-foreground-2">
        Este anotador queda solo en tu celu. Para que todos lo vean en vivo,
        armá la partida desde la juntada (Truco).
      </p>
      <AnotadorTruco />
    </main>
  );
}
