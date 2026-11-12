import { requireUsuario } from "@/lib/auth";
import { Dados } from "@/components/juegos/Dados";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function DadosPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Dados" volverA="/juegos" />
      <Dados />
    </main>
  );
}
