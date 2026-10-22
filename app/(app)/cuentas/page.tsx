import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { cargarCuentas } from "@/lib/cuentas/datos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { personaId } from "@/lib/cuentas/personas";
import { cn, formatFechaCorta } from "@/lib/utils";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function CuentasPage() {
  const usuario = await requireUsuario();
  const yo = personaId({ userId: usuario.id, invitadoId: null });

  // Las últimas juntadas no archivadas; para un grupo de amigos alcanza con calcular
  // cada una por separado.
  const juntadas = await prisma.juntada.findMany({
    where: { estado: { not: "archivada" } },
    orderBy: [{ fecha: "desc" }, { hora: "desc" }],
    take: 20,
    select: { id: true, nombre: true, fecha: true },
  });

  const resumenes = await Promise.all(
    juntadas.map(async (juntada) => {
      const cuentas = await cargarCuentas(juntada.id);
      return { ...juntada, total: cuentas.totalCentavos, miSaldo: cuentas.saldo[yo] ?? 0 };
    })
  );

  const miSaldoTotal = resumenes.reduce((total, r) => total + r.miSaldo, 0);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="Cuentas" />

      {miSaldoTotal !== 0 && (
        <div className="rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            TU SALDO EN TOTAL
          </p>
          <p
            className={cn(
              "font-heading text-3xl tracking-wide",
              miSaldoTotal > 0 ? "text-foreground" : "text-primary"
            )}
          >
            {miSaldoTotal > 0
              ? `Te deben ${formatearPesos(miSaldoTotal)}`
              : `Debés ${formatearPesos(-miSaldoTotal)}`}
          </p>
        </div>
      )}

      {resumenes.length === 0 ? (
        <EmptyState
          icon={Wallet}
          title="No hay juntadas"
          description="Las cuentas se cargan dentro de cada juntada."
          actionLabel="Crear juntada"
          actionHref="/juntadas/nueva"
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {resumenes.map((r) => (
            <li key={r.id}>
              <Link
                href={`/juntadas/${r.id}/cuentas`}
                className="flex items-center gap-3 rounded-lg bg-card px-4 py-3 transition-colors hover:bg-accent"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-foreground">{r.nombre}</p>
                  <p className="text-xs text-muted-foreground-2">
                    {formatFechaCorta(r.fecha)} ·{" "}
                    {r.total > 0 ? `Gastado ${formatearPesos(r.total)}` : "Sin gastos"}
                  </p>
                </div>
                {r.miSaldo !== 0 && (
                  <span
                    className={cn(
                      "shrink-0 text-sm font-semibold",
                      r.miSaldo > 0 ? "text-foreground" : "text-primary"
                    )}
                  >
                    {r.miSaldo > 0 ? "+" : ""}
                    {formatearPesos(r.miSaldo)}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
