import { notFound, redirect } from "next/navigation";
import { Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { borrarIntegrante, editarIntegrante } from "@/lib/actions/usuarios";
import { Avatar } from "@/components/juntadas/Avatar";
import { EncargadoFijo } from "@/components/integrantes/EncargadoFijo";
import { FormEditarIntegrante } from "@/components/integrantes/FormEditarIntegrante";
import { NuevoPin } from "@/components/integrantes/NuevoPin";
import { ProponerFoto } from "@/components/fotos/ProponerFoto";
import { r2Configurado } from "@/lib/r2";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";
import { FormConfirmar } from "@/components/ui/FormConfirmar";

export const dynamic = "force-dynamic";

export default async function IntegrantePage({ params }: PageProps<"/integrantes/[id]">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  // Lo propio se edita desde "Yo", donde además está el PIN.
  if (id === usuario.id) {
    redirect("/perfil");
  }

  const integrante = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      nombre: true,
      apodo: true,
      avatarUrl: true,
      telefono: true,
      encargadoCuentas: true,
      _count: { select: { gastosPagados: true, pagosHechos: true, pagosRecibidos: true } },
    },
  });

  if (!integrante) {
    notFound();
  }

  const apodo = integrante.apodo || integrante.nombre;

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo={apodo} volverA="/integrantes" />

      <div className="flex flex-col items-center gap-3">
        <Avatar
          nombre={integrante.nombre}
          apodo={integrante.apodo}
          avatarUrl={integrante.avatarUrl}
          className="h-24 w-24 border-primary text-2xl text-primary"
        />
        {r2Configurado() && <ProponerFoto userId={integrante.id} apodo={apodo} />}
      </div>

      {usuario.esAdmin ? (
        <>
          <FormEditarIntegrante
            accion={editarIntegrante.bind(null, integrante.id)}
            valores={{
              nombre: integrante.nombre,
              apodo: integrante.apodo,
              telefono: integrante.telefono ?? "",
            }}
          />

          <NuevoPin userId={integrante.id} apodo={apodo} />

          <EncargadoFijo
            userId={integrante.id}
            apodo={apodo}
            encargado={integrante.encargadoCuentas}
          />

          <section className="flex flex-col gap-2 border-t border-border pt-6">
            {integrante._count.gastosPagados +
              integrante._count.pagosHechos +
              integrante._count.pagosRecibidos >
            0 ? (
              <p className="text-center text-sm text-muted-foreground-2">
                {apodo} tiene gastos o pagos en alguna juntada: para sacarlo del grupo primero
                hay que editar o borrar esos gastos.
              </p>
            ) : (
              <FormConfirmar
                action={borrarIntegrante.bind(null, integrante.id)}
                mensaje={`¿Sacar a ${apodo} del grupo? Se borran sus asistencias y deja de poder entrar.`}
                className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary hover:border-primary"
              >
                <Trash2 className="h-4 w-4" />
                Sacar del grupo
              </FormConfirmar>
            )}
          </section>
        </>
      ) : (
        <div className="flex flex-col items-center gap-1 text-center">
          <p className="text-sm text-muted-foreground">{integrante.nombre}</p>
          {integrante.encargadoCuentas && (
            <p className="text-xs text-muted-foreground-2">Encargado de la casa de la moneda</p>
          )}
          <p className="mt-2 text-xs text-muted-foreground-2">
            Los datos de los integrantes los cambia el admin del grupo.
          </p>
        </div>
      )}
    </main>
  );
}
