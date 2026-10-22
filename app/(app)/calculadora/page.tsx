import { requireUsuario } from "@/lib/auth";
import { Calculadora } from "@/components/calculadora/Calculadora";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function CalculadoraPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Calculadora" volverA="/" />
      <Calculadora />
    </main>
  );
}
