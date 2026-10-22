import { notFound } from "next/navigation";
import { Trash2 } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { borrarGasto, guardarGasto } from "@/lib/actions/gastos";
import { cargarCuentas } from "@/lib/cuentas/datos";
import { centavosAInput } from "@/lib/cuentas/dinero";
import { FormGasto } from "@/components/cuentas/FormGasto";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";
import { FormConfirmar } from "@/components/ui/FormConfirmar";

export const dynamic = "force-dynamic";

export default async function EditarGastoPage({
  params,
}: PageProps<"/juntadas/[id]/cuentas/gasto/[gastoId]">) {
  await requireUsuario();
  const { id, gastoId } = await params;

  const { personas, gastos } = await cargarCuentas(id);
  const gasto = gastos.find((g) => g.id === gastoId);
  if (!gasto) {
    notFound();
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Editar gasto" volverA={`/juntadas/${id}/cuentas`} />
      <FormGasto
        accion={guardarGasto.bind(null, id, gasto.id)}
        personas={personas}
        labelBoton="Guardar cambios"
        valores={{
          concepto: gasto.concepto,
          monto: centavosAInput(gasto.montoCentavos),
          pagadoPor: gasto.pagadoPor,
          participantes: gasto.participantes,
        }}
      />
      <div className="border-t border-border pt-6">
        <FormConfirmar
          action={borrarGasto.bind(null, id, gasto.id)}
          mensaje={`¿Borrar "${gasto.concepto}"?`}
          className="flex w-full items-center justify-center gap-2 rounded-full border border-primary/50 px-4 py-2 text-sm font-semibold text-primary hover:border-primary"
        >
          <Trash2 className="h-4 w-4" />
          Borrar gasto
        </FormConfirmar>
      </div>
    </main>
  );
}
