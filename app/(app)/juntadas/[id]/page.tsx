import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil, Spade, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { formatFechaLarga } from "@/lib/utils";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { encargadoDeJuntada } from "@/lib/cuentas/encargado";
import { desdeHistoriasVigentes, haceCuanto, rutaFoto } from "@/lib/fotos";
import { r2Configurado } from "@/lib/r2";
import { estadoHistorias } from "@/lib/juntadas/horario";
import { HistoriasJuntada } from "@/components/fotos/HistoriasJuntada";
import { EncuestasSection } from "@/components/encuestas/EncuestasSection";
import { leerEncuestas } from "@/lib/encuestas/datos";
import { EncargadoCuentas } from "@/components/cuentas/EncargadoCuentas";
import { AsistenciaPanel } from "@/components/juntadas/AsistenciaPanel";
import { ChecklistSection } from "@/components/juntadas/ChecklistSection";
import { InvitadosSection } from "@/components/juntadas/InvitadosSection";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

// La asistencia se actualiza en vivo cuando alguien responde, así que esta página
// se renderiza siempre en el servidor por request, nunca estática.
export const dynamic = "force-dynamic";

const usuarioBasico = {
  select: { id: true, nombre: true, apodo: true, avatarUrl: true },
} as const;

export default async function JuntadaDetallePage({
  params,
  searchParams,
}: PageProps<"/juntadas/[id]">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const desde = desdeHistoriasVigentes();
  const [juntada, miembros, checklistItems, encargado, historias, encuestas] =
    await Promise.all([
      prisma.juntada.findUnique({
        where: { id },
        include: {
          asistencias: true,
          anfitrion: usuarioBasico,
          invitados: {
            orderBy: { createdAt: "asc" },
            include: {
              traidoPor: usuarioBasico,
              _count: { select: { gastosPagados: true } },
            },
          },
          gastos: { select: { montoCentavos: true } },
          partidasTruco: { select: { terminadaAt: true } },
        },
      }),
      prisma.user.findMany({ orderBy: { nombre: "asc" }, ...usuarioBasico }),
      prisma.checklistItem.findMany({
        where: { juntadaId: id },
        orderBy: { createdAt: "asc" },
        include: { asignadoA: usuarioBasico },
      }),
      encargadoDeJuntada(id),
      prisma.historia.findMany({
        where: { juntadaId: id, createdAt: { gte: desde } },
        orderBy: { createdAt: "asc" },
        include: {
          autor: { select: { id: true, nombre: true, apodo: true } },
          vistas: {
            where: { soloFomo: false },
            orderBy: { vistaAt: "desc" },
            select: {
              userId: true,
              user: { select: { nombre: true, apodo: true } },
            },
          },
        },
      }),
      leerEncuestas(id, usuario),
    ]);

  if (!juntada) {
    notFound();
  }

  const estadoPorUserId = new Map(
    juntada.asistencias.map((asistencia) => [
      asistencia.userId,
      asistencia.estado,
    ]),
  );

  const miembrosConAsistencia = miembros.map((miembro) => ({
    ...miembro,
    estado: estadoPorUserId.get(miembro.id) ?? null,
  }));

  const miembrosBasicos = miembros.map((miembro) => ({
    id: miembro.id,
    nombre: miembro.nombre,
    apodo: miembro.apodo,
  }));

  const invitados = juntada.invitados.map((invitado) => ({
    id: invitado.id,
    nombre: invitado.nombre,
    traidoPor: invitado.traidoPor
      ? invitado.traidoPor.apodo || invitado.traidoPor.nombre
      : null,
    pagoGastos: invitado._count.gastosPagados > 0,
  }));

  const voy = estadoPorUserId.get(usuario.id) === "voy";
  // Los que no van (salvo el admin) solo miran: ver lib/juntadas/permisos.ts.
  const soloLectura = !voy && !usuario.esAdmin;
  const historiasVista = voy
    ? historias.map((historia) => ({
        id: historia.id,
        ruta: rutaFoto(historia.key),
        texto: historia.texto,
        autor: historia.autor.apodo || historia.autor.nombre,
        esMia: historia.autor.id === usuario.id,
        hace: haceCuanto(historia.createdAt),
        vista:
          historia.autor.id === usuario.id ||
          historia.vistas.some((vista) => vista.userId === usuario.id),
        // Quién la vio solo se le manda al que la subió.
        vistas:
          historia.autor.id === usuario.id
            ? historia.vistas.map(
                (vista) => vista.user.apodo || vista.user.nombre,
              )
            : [],
      }))
    : [];

  const partidasEnJuego = juntada.partidasTruco.filter(
    (partida) => !partida.terminadaAt,
  ).length;

  const totalGastado = juntada.gastos.reduce(
    (total, gasto) => total + gasto.montoCentavos,
    0,
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina
        titulo={juntada.nombre}
        volverA="/juntadas"
        accion={
          soloLectura ? undefined : (
            <Link
              href={`/juntadas/${juntada.id}/editar`}
              aria-label="Editar juntada"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
            >
              <Pencil className="h-4 w-4" />
            </Link>
          )
        }
      />

      {soloLectura && (
        <p className="rounded-lg border border-dashed border-primary/50 px-4 py-2 text-sm text-muted-foreground">
          Estás mirando: solo los que van pueden tocar la juntada (cuentas, lo
          que hay que llevar, invitados). Si vas, confirmalo abajo.
        </p>
      )}

      {juntada.estado === "archivada" && (
        <p className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground-2">
          Esta juntada está archivada: no aparece en el inicio ni en las listas.
        </p>
      )}

      <div className="flex items-center gap-4 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <div className="flex min-w-0 flex-1 flex-col gap-1">
          <p className="text-sm text-foreground">
            {formatFechaLarga(juntada.fecha)} · {juntada.hora}hs
          </p>
          <p className="text-sm text-muted-foreground">{juntada.ubicacion}</p>
          {juntada.anfitrion && (
            <p className="text-sm text-muted-foreground">
              Anfitrión: {juntada.anfitrion.apodo || juntada.anfitrion.nombre}
            </p>
          )}
          {juntada.mensajeFomo && (
            <p className="mt-1 text-sm text-muted-foreground-2">
              {juntada.mensajeFomo}
            </p>
          )}
        </div>

        {/* Las historias van en la card, a la derecha: no le roban lugar al resto. */}
        {r2Configurado() && (
          <HistoriasJuntada
            juntadaId={juntada.id}
            historias={historiasVista}
            voy={voy}
            juntadaNombre={juntada.nombre}
            cantidad={historias.length}
            mensajeFomo={
              historias.findLast((historia) => historia.fomo)?.fomo ??
              juntada.mensajeFomo
            }
            subida={estadoHistorias(juntada)}
            abrirAlCargar={(await searchParams).historias === "1"}
          />
        )}
      </div>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
        <div className="flex flex-col gap-6">
          <Link
            href={`/juntadas/${juntada.id}/cuentas`}
            className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
          >
            <Wallet className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">
                Cuentas claras
              </p>
              <p className="text-xs text-muted-foreground-2">
                {juntada.gastos.length > 0
                  ? `${juntada.gastos.length} gastos · ${formatearPesos(totalGastado)}`
                  : "Cargá quién compró qué"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
          </Link>

          <Link
            href={`/juntadas/${juntada.id}/truco`}
            className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
          >
            <Spade className="h-5 w-5 shrink-0 text-primary" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-foreground">Truco</p>
              <p className="text-xs text-muted-foreground-2">
                {partidasEnJuego > 0
                  ? `${partidasEnJuego} ${partidasEnJuego === 1 ? "partida" : "partidas"} en juego · mirala en vivo`
                  : juntada.partidasTruco.length > 0
                    ? `${juntada.partidasTruco.length} ${juntada.partidasTruco.length === 1 ? "partida jugada" : "partidas jugadas"}`
                    : "Armá los equipos y elegí quién anota"}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
          </Link>

          <EncuestasSection
            juntadaId={juntada.id}
            inicial={encuestas}
            puedeCrear={!soloLectura}
            cuentasAbiertas={juntada.cuentasEstado === "abiertas"}
          />

          <EncargadoCuentas
            juntadaId={juntada.id}
            encargado={encargado}
            puedeHacerseCargo={!soloLectura}
          />

          <AsistenciaPanel
            juntadaId={juntada.id}
            miembros={miembrosConAsistencia}
            usuarioActualId={usuario.id}
          />

          <InvitadosSection
            juntadaId={juntada.id}
            invitados={invitados}
            soloLectura={soloLectura}
          />
        </div>

        <ChecklistSection
          juntadaId={juntada.id}
          items={checklistItems.map((item) => ({
            id: item.id,
            descripcion: item.descripcion,
            completado: item.completado,
            tipo: item.tipo,
            asignadoA: item.asignadoA,
          }))}
          miembros={miembrosBasicos}
          usuarioActualId={usuario.id}
          soloLectura={soloLectura}
        />
      </div>
    </main>
  );
}
