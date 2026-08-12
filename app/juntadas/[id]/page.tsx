import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { formatFechaLarga } from "@/lib/utils";
import { AsistenciaPanel } from "@/components/juntadas/AsistenciaPanel";

// La asistencia se actualiza en vivo cuando alguien responde, así que esta página
// se renderiza siempre en el servidor por request, nunca estática.
export const dynamic = "force-dynamic";

interface JuntadaDetallePageProps {
  params: Promise<{ id: string }>;
}

export default async function JuntadaDetallePage({ params }: JuntadaDetallePageProps) {
  const { id } = await params;

  const [juntada, miembros] = await Promise.all([
    prisma.juntada.findUnique({ where: { id }, include: { asistencias: true } }),
    prisma.user.findMany({ orderBy: { nombre: "asc" } }),
  ]);

  if (!juntada) {
    notFound();
  }

  const estadoPorUserId = new Map(
    juntada.asistencias.map((asistencia) => [asistencia.userId, asistencia.estado])
  );

  const miembrosConAsistencia = miembros.map((miembro) => ({
    id: miembro.id,
    nombre: miembro.nombre,
    apodo: miembro.apodo,
    avatarUrl: miembro.avatarUrl,
    estado: estadoPorUserId.get(miembro.id) ?? null,
  }));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-8">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="truncate text-xl font-semibold text-foreground">{juntada.nombre}</h1>
      </div>

      <div className="flex flex-col gap-1 rounded-lg bg-card px-4 py-3">
        <p className="text-sm text-foreground">
          {formatFechaLarga(juntada.fecha)} · {juntada.hora}hs
        </p>
        <p className="text-sm text-muted-foreground">{juntada.ubicacion}</p>
        {juntada.mensajeFomo && (
          <p className="mt-1 text-sm text-muted-foreground-2">{juntada.mensajeFomo}</p>
        )}
      </div>

      <AsistenciaPanel juntadaId={juntada.id} miembros={miembrosConAsistencia} />
    </main>
  );
}
