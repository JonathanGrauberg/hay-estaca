import { requireUsuario } from "@/lib/auth";
import { Afinador } from "@/components/juegos/Afinador";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function AfinadorPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Afinador" volverA="/juegos" />
      <Afinador />
    </main>
  );
}
