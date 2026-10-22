import Link from "next/link";
import { CalendarPlus, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { hoyComoFechaDb } from "@/lib/utils";
import { JuntadaCard } from "@/components/juntadas/JuntadaCard";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function JuntadasPage() {
  await requireUsuario();
  const hoy = hoyComoFechaDb();

  const juntadas = await prisma.juntada.findMany({
    orderBy: [{ fecha: "asc" }, { hora: "asc" }],
    select: {
      id: true,
      nombre: true,
      fecha: true,
      hora: true,
      ubicacion: true,
      mensajeFomo: true,
      estado: true,
    },
  });

  const archivadas = juntadas.filter((juntada) => juntada.estado === "archivada").reverse();
  const activas = juntadas.filter((juntada) => juntada.estado !== "archivada");
  const proximas = activas.filter((juntada) => juntada.fecha >= hoy);
  const pasadas = activas.filter((juntada) => juntada.fecha < hoy).reverse();

  const secciones = [
    { titulo: "PRÓXIMAS JUNTADAS", juntadas: proximas, variant: "proxima" as const },
    { titulo: "JUNTADAS PASADAS", juntadas: pasadas, variant: "pasada" as const },
    { titulo: "ARCHIVADAS", juntadas: archivadas, variant: "pasada" as const },
  ];

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina
        titulo="Juntadas"
        accion={
          <Link
            href="/juntadas/nueva"
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1.5 text-sm font-semibold text-primary-foreground"
          >
            <Plus className="h-4 w-4" />
            Nueva
          </Link>
        }
      />

      {juntadas.length === 0 ? (
        <EmptyState
          icon={CalendarPlus}
          title="Todavía no hay juntadas"
          description="Creá la primera para que el grupo confirme."
          actionLabel="Crear juntada"
          actionHref="/juntadas/nueva"
        />
      ) : (
        secciones
          .filter((seccion) => seccion.juntadas.length > 0)
          .map((seccion) => (
            <section key={seccion.titulo} className="flex flex-col gap-2">
              <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
                {seccion.titulo}
              </h2>
              <div className="flex flex-col gap-2">
                {seccion.juntadas.map((juntada) => (
                  <JuntadaCard
                    key={juntada.id}
                    id={juntada.id}
                    variant={seccion.variant}
                    nombre={juntada.nombre}
                    fecha={juntada.fecha}
                    hora={juntada.hora}
                    ubicacion={juntada.ubicacion}
                    mensajeFomo={juntada.mensajeFomo}
                  />
                ))}
              </div>
            </section>
          ))
      )}
    </main>
  );
}
