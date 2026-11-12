import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { puedeModificarJuntada } from "@/lib/juntadas/permisos";
import { participantesTruco } from "@/lib/juegos/participantes-truco";
import { FormPartidaTruco } from "@/components/juegos/FormPartidaTruco";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export default async function NuevaPartidaTrucoPage({
  params,
}: PageProps<"/juntadas/[id]/truco/nueva">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const juntada = await prisma.juntada.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!juntada) {
    notFound();
  }
  if (!(await puedeModificarJuntada(id, usuario))) {
    redirect(`/juntadas/${id}/truco`);
  }
  const { personas, anotadores } = await participantesTruco(id, usuario);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina
        titulo="Armar partida"
        volverA={`/juntadas/${id}/truco`}
      />
      <FormPartidaTruco
        juntadaId={id}
        personas={personas}
        anotadores={anotadores}
        yoId={usuario.id}
      />
    </main>
  );
}
