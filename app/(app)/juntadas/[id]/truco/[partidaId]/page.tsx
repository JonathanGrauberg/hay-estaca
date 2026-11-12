import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { borrarPartidaTruco } from "@/lib/actions/truco";
import { leerPartidaTruco, puedeAnotar } from "@/lib/juegos/partida-truco";
import { participantesTruco } from "@/lib/juegos/participantes-truco";
import { puedeModificarJuntada } from "@/lib/juntadas/permisos";
import { PartidaEnVivo } from "@/components/juegos/PartidaEnVivo";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";
import { FormConfirmar } from "@/components/ui/FormConfirmar";

export const dynamic = "force-dynamic";

export default async function PartidaTrucoPage({
  params,
}: PageProps<"/juntadas/[id]/truco/[partidaId]">) {
  const usuario = await requireUsuario();
  const { id, partidaId } = await params;

  const partida = await leerPartidaTruco(partidaId);
  if (!partida || partida.juntadaId !== id) {
    notFound();
  }
  const [{ anotadores }, puedeTomar] = await Promise.all([
    participantesTruco(id, usuario),
    puedeModificarJuntada(id, usuario),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-4 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina
        titulo="Truco"
        volverA={`/juntadas/${id}/truco`}
        accion={
          puedeAnotar(partida, usuario) && (
            <FormConfirmar
              action={borrarPartidaTruco.bind(null, partida.id)}
              mensaje="¿Borrar esta partida? Se pierden los puntos."
            >
              <button
                type="submit"
                aria-label="Borrar partida"
                className="flex h-8 w-8 items-center justify-center text-muted-foreground-2 hover:text-primary"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </FormConfirmar>
          )
        }
      />
      <PartidaEnVivo
        inicial={partida}
        yoId={usuario.id}
        esAdmin={usuario.esAdmin}
        puedeTomar={puedeTomar}
        candidatos={anotadores}
      />
    </main>
  );
}
