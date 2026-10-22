import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, Pencil, Plus, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { cargarCuentas } from "@/lib/cuentas/datos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { personaId } from "@/lib/cuentas/personas";
import { cn } from "@/lib/utils";
import { BotonCopiar } from "@/components/cuentas/BotonCopiar";
import { BonificadosSection } from "@/components/cuentas/BonificadosSection";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

const tituloSeccion = "text-xs font-semibold tracking-[0.15em] text-muted-foreground-2";

export default async function CuentasJuntadaPage({ params }: PageProps<"/juntadas/[id]/cuentas">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const juntada = await prisma.juntada.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  if (!juntada) {
    notFound();
  }

  const cuentas = await cargarCuentas(juntada.id);
  const yo = personaId({ userId: usuario.id, invitadoId: null });
  const persona = new Map(cuentas.personas.map((p) => [p.id, p]));
  const nombre = (id: string) => persona.get(id)?.nombre ?? "?";

  const bonificados = (
    <BonificadosSection
      juntadaId={juntada.id}
      personas={cuentas.personas.map(({ id, nombre, esInvitado }) => ({
        id,
        nombre,
        esInvitado,
      }))}
      bonificados={cuentas.bonificados}
    />
  );

  const conMovimiento = cuentas.personas.filter(
    (p) => (cuentas.pagado[p.id] ?? 0) > 0 || (cuentas.parte[p.id] ?? 0) > 0,
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina
        titulo={`Cuentas · ${juntada.nombre}`}
        volverA={`/juntadas/${juntada.id}`}
      />

      <div className="flex items-end justify-between rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <div>
          <p className={tituloSeccion}>TOTAL GASTADO</p>
          <p className="font-heading text-4xl leading-none tracking-wide text-foreground">
            {formatearPesos(cuentas.totalCentavos)}
          </p>
        </div>
        {cuentas.saldo[yo] !== undefined && cuentas.saldo[yo] !== 0 && (
          <p
            className={cn(
              "text-right text-sm font-semibold",
              cuentas.saldo[yo] > 0 ? "text-foreground" : "text-primary",
            )}
          >
            {cuentas.saldo[yo] > 0
              ? `Te deben ${formatearPesos(cuentas.saldo[yo])}`
              : `Debés ${formatearPesos(-cuentas.saldo[yo])}`}
          </p>
        )}
      </div>

      <Link
        href={`/juntadas/${juntada.id}/cuentas/gasto`}
        className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
      >
        <Plus className="h-4 w-4" />
        Cargar gasto
      </Link>

      {cuentas.gastos.length === 0 ? (
        <>
          <EmptyState
            icon={Receipt}
            title="Todavía no hay gastos"
            description="Cargá quién compró qué y la app calcula cuánto le pasa cada uno a quién."
          />
          {/* Se puede marcar al cumpleañero antes de cargar el primer gasto. */}
          {bonificados}
        </>
      ) : (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>QUIÉN LE PASA A QUIÉN</h2>
              {cuentas.transferencias.length === 0 ? (
                <p className="rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground">
                  Están todos a mano.
                </p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cuentas.transferencias.map((transferencia) => {
                    const destino = persona.get(transferencia.a);
                    const meToca = transferencia.de === yo;
                    return (
                      <li
                        key={`${transferencia.de}-${transferencia.a}`}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-l-4 bg-card px-4 py-3",
                          meToca ? "border-l-primary" : "border-l-border",
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="font-semibold text-foreground">
                            {nombre(transferencia.de)}
                          </span>
                          <ArrowRight className="h-4 w-4 text-muted-foreground-2" />
                          <span className="font-semibold text-foreground">
                            {nombre(transferencia.a)}
                          </span>
                          <span className="ml-auto font-heading text-xl tracking-wide text-primary">
                            {formatearPesos(transferencia.centavos)}
                          </span>
                        </div>
                        {destino?.aliasCvu ? (
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-xs text-muted-foreground-2">
                              {destino.aliasCvu}
                            </span>
                            <BotonCopiar texto={destino.aliasCvu} label="Copiar alias" />
                          </div>
                        ) : (
                          !destino?.esInvitado && (
                            <span className="text-xs text-muted-foreground-2">
                              {destino?.nombre} no cargó su alias todavía.
                            </span>
                          )
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>GASTOS</h2>
              <ul className="flex flex-col gap-2">
                {cuentas.gastos.map((gasto) => {
                  const todos = gasto.participantes.length === cuentas.personas.length;
                  return (
                    <li key={gasto.id}>
                      <Link
                        href={`/juntadas/${juntada.id}/cuentas/gasto/${gasto.id}`}
                        className="flex items-start gap-3 rounded-lg bg-card px-4 py-2.5 transition-colors hover:bg-accent"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-foreground">
                            {gasto.concepto}
                          </p>
                          <p className="text-xs text-muted-foreground-2">
                            Pagó {nombre(gasto.pagadoPor)} ·{" "}
                            {todos
                              ? "entre todos"
                              : `entre ${gasto.participantes.map(nombre).join(", ")}`}
                          </p>
                        </div>
                        <span className="shrink-0 text-sm font-semibold text-foreground">
                          {formatearPesos(gasto.montoCentavos)}
                        </span>
                        <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground-2" />
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>CÓMO QUEDA CADA UNO</h2>
              <div className="overflow-hidden rounded-lg bg-card">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-left text-xs text-muted-foreground-2">
                      <th className="px-4 py-2 font-semibold">Persona</th>
                      <th className="px-2 py-2 text-right font-semibold">Puso</th>
                      <th className="px-2 py-2 text-right font-semibold">Le toca</th>
                      <th className="px-4 py-2 text-right font-semibold">Saldo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {conMovimiento.map((p) => {
                      const saldo = cuentas.saldo[p.id] ?? 0;
                      return (
                        <tr key={p.id} className="border-t border-border">
                          <td className="max-w-24 truncate px-4 py-2 text-foreground">
                            {p.nombre}
                            {p.id === yo && <span className="text-muted-foreground-2"> (vos)</span>}
                          </td>
                          <td className="px-2 py-2 text-right text-muted-foreground">
                            {formatearPesos(cuentas.pagado[p.id] ?? 0)}
                          </td>
                          <td className="px-2 py-2 text-right text-muted-foreground">
                            {formatearPesos(cuentas.parte[p.id] ?? 0)}
                          </td>
                          <td
                            className={cn(
                              "px-4 py-2 text-right font-semibold",
                              saldo < 0 ? "text-primary" : "text-foreground",
                            )}
                          >
                            {saldo > 0 ? "+" : ""}
                            {formatearPesos(saldo)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </section>

            {bonificados}
          </div>
        </div>
      )}
    </main>
  );
}
