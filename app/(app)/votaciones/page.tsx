import { Hourglass, Vote } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { esAdminVotaciones, hoyArgentina, leerVotaciones } from "@/lib/votaciones/datos";
import { CrearTemporada } from "@/components/votaciones/CrearTemporada";
import { PublicarTemporada } from "@/components/votaciones/PublicarTemporada";
import { Votaciones } from "@/components/votaciones/Votaciones";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function VotacionesPage() {
  const usuario = await requireUsuario();
  const datos = await leerVotaciones(usuario.id);
  const esAdmin = esAdminVotaciones(usuario);
  const anioActual = Number(hoyArgentina().slice(0, 4));
  // Pasada la despedida del año, los admin ya pueden arrancar la del año que viene.
  const puedeArrancar =
    esAdmin &&
    (!datos ||
      (datos.temporada.cerrada && !datos.temporada.prueba && datos.temporada.anio <= anioActual));

  // Mientras el admin la prepara (o no hay temporada), el resto ve solo el cartel.
  if (!esAdmin && (!datos || !datos.temporada.publicada)) {
    return (
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
        <EncabezadoPagina titulo="Votaciones" />
        <EmptyState
          icon={Hourglass}
          title="Los admin de las votaciones están preparando la encuesta"
          description="Cuando esté lista vas a poder proponer categorías y votar en secreto hasta la despedida de año."
        />
      </main>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina titulo={datos ? `Votaciones ${datos.temporada.anio}` : "Votaciones"} />

      {puedeArrancar && (
        <CrearTemporada anioSugerido={datos ? datos.temporada.anio + 1 : anioActual} />
      )}

      {datos && esAdmin && (
        <PublicarTemporada
          temporadaId={datos.temporada.id}
          publicada={datos.temporada.publicada}
          prueba={datos.temporada.prueba}
          cerradaPorFecha={datos.temporada.cerrada && !datos.temporada.prueba}
        />
      )}

      {datos ? (
        <Votaciones
          datos={datos}
          yoId={usuario.id}
          esAdmin={esAdmin}
          esAdminGrupo={usuario.esAdmin}
        />
      ) : (
        <EmptyState
          icon={Vote}
          title="Todavía no hay temporada"
          description="Arrancala arriba. Hasta que la publiquen, solo la ven los admin."
        />
      )}
    </main>
  );
}
