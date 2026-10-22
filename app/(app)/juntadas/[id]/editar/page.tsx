import { notFound } from "next/navigation";
import { Archive, ArchiveRestore, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { borrarJuntada, cambiarArchivoJuntada, editarJuntada } from "@/lib/actions/juntadas";
import { FormJuntada } from "@/components/juntadas/FormJuntada";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";
import { FormConfirmar } from "@/components/ui/FormConfirmar";

export const dynamic = "force-dynamic";

export default async function EditarJuntadaPage({ params }: PageProps<"/juntadas/[id]/editar">) {
  await requireUsuario();
  const { id } = await params;

  const [juntada, miembros] = await Promise.all([
    prisma.juntada.findUnique({ where: { id } }),
    prisma.user.findMany({
      orderBy: { nombre: "asc" },
      select: { id: true, nombre: true, apodo: true },
    }),
  ]);

  if (!juntada) {
    notFound();
  }

  const archivada = juntada.estado === "archivada";

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Editar juntada" volverA={`/juntadas/${juntada.id}`} />

      <FormJuntada
        accion={editarJuntada.bind(null, juntada.id)}
        miembros={miembros}
        labelBoton="Guardar cambios"
        valores={{
          nombre: juntada.nombre,
          // @db.Date llega como medianoche UTC: el día guardado es la parte UTC.
          fecha: juntada.fecha.toISOString().slice(0, 10),
          hora: juntada.hora,
          ubicacion: juntada.ubicacion,
          mensajeFomo: juntada.mensajeFomo ?? "",
          anfitrionId: juntada.anfitrionId ?? "",
        }}
      />

      <section className="flex flex-col gap-2 border-t border-border pt-6">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          MÁS OPCIONES
        </h2>
        <FormConfirmar
          action={cambiarArchivoJuntada.bind(null, juntada.id, !archivada)}
          mensaje={
            archivada
              ? undefined
              : "¿Archivar esta juntada? Deja de aparecer en el inicio y en las listas, pero no se borra nada."
          }
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-foreground hover:border-muted-foreground-2"
        >
          {archivada ? <ArchiveRestore className="h-4 w-4" /> : <Archive className="h-4 w-4" />}
          {archivada ? "Desarchivar" : "Archivar"}
        </FormConfirmar>
        <FormConfirmar
          action={borrarJuntada.bind(null, juntada.id)}
          mensaje={`¿Borrar "${juntada.nombre}" para siempre? Se pierden asistencias, checklist e invitados.`}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary hover:border-primary"
        >
          <Trash2 className="h-4 w-4" />
          Borrar juntada
        </FormConfirmar>
      </section>
    </main>
  );
}
