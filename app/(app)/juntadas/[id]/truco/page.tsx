import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Plus, Spade } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { puedeModificarJuntada } from "@/lib/juntadas/permisos";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

const tituloSeccion =
  "text-xs font-semibold tracking-[0.15em] text-muted-foreground-2";

export default async function TrucoJuntadaPage({
  params,
}: PageProps<"/juntadas/[id]/truco">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const [juntada, partidas, puedeArmar] = await Promise.all([
    prisma.juntada.findUnique({
      where: { id },
      select: { id: true, nombre: true },
    }),
    prisma.partidaTruco.findMany({
      where: { juntadaId: id },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        limite: true,
        nombreNos: true,
        nombreEllos: true,
        puntosNos: true,
        puntosEllos: true,
        terminadaAt: true,
        anotador: { select: { nombre: true, apodo: true } },
      },
    }),
    puedeModificarJuntada(id, usuario),
  ]);
  if (!juntada) {
    notFound();
  }

  const enJuego = partidas.filter((p) => !p.terminadaAt);
  const terminadas = partidas.filter((p) => p.terminadaAt);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Truco" volverA={`/juntadas/${id}`} />
      <p className="-mt-3 text-sm text-muted-foreground">
        Partidas de {juntada.nombre}. Anota uno solo y el resto lo sigue en
        vivo.
      </p>

      {puedeArmar ? (
        <Link
          href={`/juntadas/${id}/truco/nueva`}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground"
        >
          <Plus className="h-4 w-4" />
          Armar partida
        </Link>
      ) : (
        <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
          Las partidas las arman los que van. Podés mirarlas en vivo igual.
        </p>
      )}

      {partidas.length === 0 && (
        <EmptyState
          icon={Spade}
          title="Todavía no hay partidas"
          description="Armá los equipos, elegí quién anota y a jugar."
        />
      )}

      {[
        { titulo: "EN JUEGO", lista: enJuego },
        { titulo: "TERMINADAS", lista: terminadas },
      ].map(
        (seccion) =>
          seccion.lista.length > 0 && (
            <section key={seccion.titulo} className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>{seccion.titulo}</h2>
              <ul className="flex flex-col gap-2">
                {seccion.lista.map((partida) => {
                  const gano =
                    partida.puntosNos >= partida.limite
                      ? partida.nombreNos
                      : partida.puntosEllos >= partida.limite
                        ? partida.nombreEllos
                        : null;
                  return (
                    <li key={partida.id}>
                      <Link
                        href={`/juntadas/${id}/truco/${partida.id}`}
                        className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold text-foreground">
                            {partida.nombreNos} {partida.puntosNos} ·{" "}
                            {partida.puntosEllos} {partida.nombreEllos}
                          </p>
                          <p className="truncate text-xs text-muted-foreground-2">
                            A {partida.limite}
                            {gano
                              ? ` · ganó ${gano}`
                              : partida.anotador
                                ? ` · anota ${partida.anotador.apodo || partida.anotador.nombre}`
                                : " · sin anotador"}
                          </p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          ),
      )}
    </main>
  );
}
