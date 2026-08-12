import Link from "next/link";
import { CalendarPlus, PartyPopper, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { AvatarRow } from "@/components/juntadas/AvatarRow";
import { JuntadaCard } from "@/components/juntadas/JuntadaCard";
import { EmptyState } from "@/components/juntadas/EmptyState";

// La lista de miembros y el estado de asistencia cambian seguido (RSVPs en vivo),
// así que esta página se renderiza siempre en el servidor por request, nunca estática.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const [miembros, juntadasProximas, juntadasPasadas] = await Promise.all([
    prisma.user.findMany({ orderBy: { nombre: "asc" } }),
    prisma.juntada.findMany({
      where: { estado: "proxima" },
      orderBy: { fecha: "asc" },
      include: { asistencias: true },
    }),
    prisma.juntada.findMany({
      where: { estado: "pasada" },
      orderBy: { fecha: "desc" },
      include: { asistencias: true },
      take: 5,
    }),
  ]);

  const [juntadaDestacada, ...otrasProximas] = juntadasProximas;

  const confirmadosIds = new Set(
    (juntadaDestacada?.asistencias ?? [])
      .filter((asistencia) => asistencia.estado === "voy")
      .map((asistencia) => asistencia.userId)
  );

  const miembrosConEstado = miembros.map((miembro) => ({
    id: miembro.id,
    nombre: miembro.nombre,
    apodo: miembro.apodo,
    avatarUrl: miembro.avatarUrl,
    confirmado: confirmadosIds.has(miembro.id),
  }));

  const hayContenido = miembros.length > 0 || juntadasProximas.length > 0 || juntadasPasadas.length > 0;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-8">
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="flex items-center gap-2 font-heading text-3xl tracking-wide text-foreground">
          <span className="text-primary">●</span>
          ESTAQUEROS
        </p>
        <p className="text-xs tracking-[0.2em] text-muted-foreground-2">★ PEÑA DE AMIGOS ★</p>
      </header>

      <AvatarRow miembros={miembrosConEstado} />

      <Link
        href="/juntadas/nueva"
        className="flex items-center justify-center gap-1.5 self-end rounded-full bg-primary px-4 py-1.5 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        Nueva juntada
      </Link>

      {!hayContenido ? (
        <EmptyState
          icon={PartyPopper}
          title="Todavía no hay nada por acá"
          description="Sumá a los integrantes del grupo y creá la primera juntada para arrancar."
          actionLabel="Crear la primera juntada"
          actionHref="/juntadas/nueva"
        />
      ) : (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-2">
            <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
              PRÓXIMA JUNTADA
            </h2>
            {juntadaDestacada ? (
              <JuntadaCard
                id={juntadaDestacada.id}
                variant="destacada"
                nombre={juntadaDestacada.nombre}
                fecha={juntadaDestacada.fecha}
                hora={juntadaDestacada.hora}
                ubicacion={juntadaDestacada.ubicacion}
                mensajeFomo={juntadaDestacada.mensajeFomo}
                confirmados={confirmadosIds.size}
                totalMiembros={miembros.length}
              />
            ) : (
              <EmptyState
                icon={CalendarPlus}
                title="No hay una próxima juntada"
                description="Creá una juntada para que el grupo pueda confirmar asistencia."
                actionLabel="Crear juntada"
                actionHref="/juntadas/nueva"
              />
            )}
          </section>

          {otrasProximas.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
                PRÓXIMAS JUNTADAS
              </h2>
              <div className="flex flex-col gap-2">
                {otrasProximas.map((juntada) => (
                  <JuntadaCard
                    key={juntada.id}
                    id={juntada.id}
                    variant="proxima"
                    nombre={juntada.nombre}
                    fecha={juntada.fecha}
                    hora={juntada.hora}
                    ubicacion={juntada.ubicacion}
                    mensajeFomo={juntada.mensajeFomo}
                  />
                ))}
              </div>
            </section>
          )}

          {juntadasPasadas.length > 0 && (
            <section className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
                JUNTADAS PASADAS
              </h2>
              <div className="flex flex-col gap-2">
                {juntadasPasadas.map((juntada) => (
                  <JuntadaCard
                    key={juntada.id}
                    id={juntada.id}
                    variant="pasada"
                    nombre={juntada.nombre}
                    fecha={juntada.fecha}
                    hora={juntada.hora}
                    ubicacion={juntada.ubicacion}
                    mensajeFomo={juntada.mensajeFomo}
                  />
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </main>
  );
}
