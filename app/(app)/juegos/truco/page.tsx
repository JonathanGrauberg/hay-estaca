import { requireUsuario } from "@/lib/auth";
import { AnotadorTruco } from "@/components/juegos/AnotadorTruco";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function TrucoPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-4 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Truco" volverA="/juegos" />
      <AnotadorTruco />
    </main>
  );
}
