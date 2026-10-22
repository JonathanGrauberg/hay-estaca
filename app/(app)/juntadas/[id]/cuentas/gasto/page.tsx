import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { guardarGasto } from "@/lib/actions/gastos";
import { cargarCuentas } from "@/lib/cuentas/datos";
import { personaId } from "@/lib/cuentas/personas";
import { FormGasto } from "@/components/cuentas/FormGasto";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function NuevoGastoPage({ params }: PageProps<"/juntadas/[id]/cuentas/gasto">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const juntada = await prisma.juntada.findUnique({ where: { id }, select: { id: true } });
  if (!juntada) {
    notFound();
  }

  const { personas } = await cargarCuentas(juntada.id);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Cargar gasto" volverA={`/juntadas/${juntada.id}/cuentas`} />
      <FormGasto
        accion={guardarGasto.bind(null, juntada.id, null)}
        personas={personas}
        labelBoton="Cargar gasto"
        valores={{
          concepto: "",
          monto: "",
          pagadoPor: personaId({ userId: usuario.id, invitadoId: null }),
          participantes: personas.filter((persona) => persona.vaPorDefecto).map((persona) => persona.id),
        }}
      />
    </main>
  );
}
