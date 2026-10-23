import { Dices, HelpCircle, Shuffle, Spade, Users } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { CardSeccion } from "@/components/inicio/CardSeccion";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function JuegosPage() {
  await requireUsuario();

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina titulo="Juegos" />

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-3">
        <CardSeccion icon={Spade} titulo="Truco" detalle="Anotador con fósforos" href="/juegos/truco" />
        <CardSeccion icon={HelpCircle} titulo="¿Quién soy?" detalle="Próximamente" />
        <CardSeccion icon={Dices} titulo="Dado" detalle="Próximamente" />
        <CardSeccion icon={Shuffle} titulo="Ruleta" detalle="Próximamente" />
        <CardSeccion icon={Users} titulo="Equipos" detalle="Próximamente" />
      </section>
    </main>
  );
}
