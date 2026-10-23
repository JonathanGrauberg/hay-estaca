import Link from "next/link";
import {
  Calculator,
  CalendarDays,
  CalendarPlus,
  Dices,
  Plus,
  Trophy,
  User,
  Users,
  Vote,
  Wallet,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { hoyComoFechaDb } from "@/lib/utils";
import { AvatarRow } from "@/components/juntadas/AvatarRow";
import { JuntadaCard } from "@/components/juntadas/JuntadaCard";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { RecordatorioBanner } from "@/components/juntadas/RecordatorioBanner";
import { RsvpBotones } from "@/components/juntadas/RsvpBotones";
import { CardSeccion } from "@/components/inicio/CardSeccion";

// La lista de miembros y el estado de asistencia cambian seguido (RSVPs en vivo),
// así que esta página se renderiza siempre en el servidor por request, nunca estática.
export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const usuario = await requireUsuario();

  // Próximas se separan por la fecha real (hoy en Argentina): la juntada de hoy sigue
  // siendo "próxima" hasta que termina el día. Las archivadas no se muestran.
  const hoy = hoyComoFechaDb();

  const [miembros, juntadasProximas, checklistPendientes] = await Promise.all([
    prisma.user.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apodo: true, avatarUrl: true },
    }),
    prisma.juntada.findMany({
      where: { estado: { not: "archivada" }, fecha: { gte: hoy } },
      orderBy: [{ fecha: "asc" }, { hora: "asc" }],
      include: { asistencias: true, _count: { select: { invitados: true } } },
    }),
    prisma.checklistItem.findMany({
      where: {
        tipo: "grupal",
        completado: false,
        asignadoAUserId: usuario.id,
        juntada: { estado: { not: "archivada" }, fecha: { gte: hoy } },
      },
      select: {
        id: true,
        descripcion: true,
        juntada: { select: { fecha: true, hora: true } },
      },
    }),
  ]);

  const [juntadaDestacada, ...otrasProximas] = juntadasProximas;

  const confirmadosIds = new Set(
    (juntadaDestacada?.asistencias ?? [])
      .filter((asistencia) => asistencia.estado === "voy")
      .map((asistencia) => asistencia.userId),
  );

  const miEstado =
    juntadaDestacada?.asistencias.find((asistencia) => asistencia.userId === usuario.id)?.estado ??
    null;

  const miembrosConEstado = miembros.map((miembro) => ({
    ...miembro,
    confirmado: confirmadosIds.has(miembro.id),
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-6 lg:max-w-5xl lg:px-8 lg:pt-12">
      {/* En desktop el logo ya está en la barra lateral: acá queda solo el saludo. */}
      <header className="flex flex-col items-center gap-1 text-center lg:items-start lg:text-left">
        <p className="flex items-center gap-2 font-heading text-3xl tracking-wide text-foreground lg:hidden">
          <span className="text-primary">●</span>
          ESTAQUEROS
        </p>
        <p className="text-xs tracking-[0.2em] text-muted-foreground-2 lg:hidden">
          ★ HOLA, {(usuario.apodo || usuario.nombre).toUpperCase()} ★
        </p>
        <h1 className="hidden font-heading text-5xl tracking-wide text-foreground lg:block">
          HOLA, {(usuario.apodo || usuario.nombre).toUpperCase()}
        </h1>
      </header>

      <div className="flex flex-col gap-6 lg:grid lg:grid-cols-[3fr_2fr] lg:items-start lg:gap-8">
        <div className="flex flex-col gap-6">
          <RecordatorioBanner items={checklistPendientes} apodo={usuario.apodo || usuario.nombre} />

          <AvatarRow miembros={miembrosConEstado} />

          <section className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
                PRÓXIMA JUNTADA
              </h2>
              <Link
                href="/juntadas/nueva"
                className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva
              </Link>
            </div>

            {juntadaDestacada ? (
              <div className="flex flex-col gap-2">
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
                  invitados={juntadaDestacada._count.invitados}
                />
                <RsvpBotones juntadaId={juntadaDestacada.id} estadoActual={miEstado} />
              </div>
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
        </div>

        <section className="grid grid-cols-2 gap-2">
          <CardSeccion
            icon={CalendarDays}
            titulo="Juntadas"
            detalle={
              otrasProximas.length > 0
                ? `${otrasProximas.length} más en agenda`
                : "Próximas y pasadas"
            }
            href="/juntadas"
          />
          <CardSeccion
            icon={Users}
            titulo="Grupo"
            detalle={`${miembros.length} integrantes`}
            href="/integrantes"
          />
          <CardSeccion
            icon={Wallet}
            titulo="Cuentas"
            detalle="Quién le debe a quién"
            href="/cuentas"
          />
          <CardSeccion icon={Dices} titulo="Juegos" detalle="Truco y más" href="/juegos" />
          <CardSeccion icon={Vote} titulo="Votaciones" detalle="Próximamente" />
          <CardSeccion icon={Trophy} titulo="Estadísticas" detalle="Próximamente" />
          <CardSeccion
            icon={Calculator}
            titulo="Calculadora"
            detalle="Sumá, dividí, al toque"
            href="/calculadora"
          />
          <CardSeccion icon={User} titulo="Yo" detalle="Mis datos y PIN" href="/perfil" />
        </section>
      </div>
    </main>
  );
}
