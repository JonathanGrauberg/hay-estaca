import Link from "next/link";
import { notFound } from "next/navigation";
import { ChevronRight, Pencil, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { formatFechaLarga } from "@/lib/utils";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { AsistenciaPanel } from "@/components/juntadas/AsistenciaPanel";
import { ChecklistSection } from "@/components/juntadas/ChecklistSection";
import { InvitadosSection } from "@/components/juntadas/InvitadosSection";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

// La asistencia se actualiza en vivo cuando alguien responde, así que esta página
// se renderiza siempre en el servidor por request, nunca estática.
export const dynamic = "force-dynamic";

const usuarioBasico = { select: { id: true, nombre: true, apodo: true, avatarUrl: true } } as const;

export default async function JuntadaDetallePage({ params }: PageProps<"/juntadas/[id]">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const [juntada, miembros, checklistItems] = await Promise.all([
    prisma.juntada.findUnique({
      where: { id },
      include: {
        asistencias: true,
        anfitrion: usuarioBasico,
        invitados: {
          orderBy: { createdAt: "asc" },
          include: { traidoPor: usuarioBasico, _count: { select: { gastosPagados: true } } },
        },
        gastos: { select: { montoCentavos: true } },
      },
    }),
    prisma.user.findMany({ orderBy: { nombre: "asc" }, ...usuarioBasico }),
    prisma.checklistItem.findMany({
      where: { juntadaId: id },
      orderBy: { createdAt: "asc" },
      include: { asignadoA: usuarioBasico },
    }),
  ]);

  if (!juntada) {
    notFound();
  }

  const estadoPorUserId = new Map(
    juntada.asistencias.map((asistencia) => [asistencia.userId, asistencia.estado])
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
    traidoPor: invitado.traidoPor ? invitado.traidoPor.apodo || invitado.traidoPor.nombre : null,
    pagoGastos: invitado._count.gastosPagados > 0,
  }));

  const totalGastado = juntada.gastos.reduce((total, gasto) => total + gasto.montoCentavos, 0);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina
        titulo={juntada.nombre}
        volverA="/juntadas"
        accion={
          <Link
            href={`/juntadas/${juntada.id}/editar`}
            aria-label="Editar juntada"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
          >
            <Pencil className="h-4 w-4" />
          </Link>
        }
      />

      {juntada.estado === "archivada" && (
        <p className="rounded-lg border border-dashed border-border px-4 py-2 text-sm text-muted-foreground-2">
          Esta juntada está archivada: no aparece en el inicio ni en las listas.
        </p>
      )}

      <div className="flex flex-col gap-1 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
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
          <p className="mt-1 text-sm text-muted-foreground-2">{juntada.mensajeFomo}</p>
        )}
      </div>

      <Link
        href={`/juntadas/${juntada.id}/cuentas`}
        className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
      >
        <Wallet className="h-5 w-5 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">Cuentas claras</p>
          <p className="text-xs text-muted-foreground-2">
            {juntada.gastos.length > 0
              ? `${juntada.gastos.length} gastos · ${formatearPesos(totalGastado)}`
              : "Cargá quién compró qué"}
          </p>
        </div>
        <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
      </Link>

      <AsistenciaPanel
        juntadaId={juntada.id}
        miembros={miembrosConAsistencia}
        usuarioActualId={usuario.id}
      />

      <InvitadosSection juntadaId={juntada.id} invitados={invitados} />

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
      />
    </main>
  );
}
