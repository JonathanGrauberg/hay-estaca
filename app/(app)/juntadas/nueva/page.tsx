import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { crearJuntada } from "@/lib/actions/juntadas";
import { FormJuntada } from "@/components/juntadas/FormJuntada";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function NuevaJuntadaPage() {
  await requireUsuario();

  const miembros = await prisma.user.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Nueva juntada" volverA="/juntadas" />
      <FormJuntada accion={crearJuntada} miembros={miembros} labelBoton="Crear juntada" />
    </main>
  );
}
