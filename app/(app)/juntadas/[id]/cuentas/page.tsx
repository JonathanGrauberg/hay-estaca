import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowRight,
  Check,
  CircleCheck,
  Pencil,
  Plus,
  Receipt,
  Undo2,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import {
  cerrarCuentas,
  deshacerPago,
  dividirGastos,
  marcarPagado,
  reabrirCuentas,
  volverACargar,
} from "@/lib/actions/casaMoneda";
import { cargarCuentas, miResumen } from "@/lib/cuentas/datos";
import { puedeModificarJuntada } from "@/lib/juntadas/permisos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { personaId } from "@/lib/cuentas/personas";
import { cn } from "@/lib/utils";
import { BotonCopiar } from "@/components/cuentas/BotonCopiar";
import { BonificadosSection } from "@/components/cuentas/BonificadosSection";
import { CategoriasSection } from "@/components/cuentas/CategoriasSection";
import { EncargadoCuentas } from "@/components/cuentas/EncargadoCuentas";
import { EmptyState } from "@/components/juntadas/EmptyState";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";
import { Ayuda } from "@/components/ui/Ayuda";
import { FormConfirmar } from "@/components/ui/FormConfirmar";

export const dynamic = "force-dynamic";

const tituloSeccion =
  "text-xs font-semibold tracking-[0.15em] text-muted-foreground-2";
const botonSecundario =
  "flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:border-primary hover:text-foreground";

export default async function CuentasJuntadaPage({
  params,
}: PageProps<"/juntadas/[id]/cuentas">) {
  const usuario = await requireUsuario();
  const { id } = await params;

  const juntada = await prisma.juntada.findUnique({
    where: { id },
    select: { id: true, nombre: true },
  });
  if (!juntada) {
    notFound();
  }

  const [cuentas, puedeModificar] = await Promise.all([
    cargarCuentas(juntada.id),
    puedeModificarJuntada(juntada.id, usuario),
  ]);
  // Los que no van miran las cuentas pero no cargan, dividen ni bonifican.
  const editables = cuentas.estado === "abiertas" && puedeModificar;
  const yo = personaId({ userId: usuario.id, invitadoId: null });
  const persona = new Map(cuentas.personas.map((p) => [p.id, p]));
  const nombre = (id: string) => persona.get(id)?.nombre ?? "?";
  const nombreCategoria = new Map(
    cuentas.categorias.map((c) => [c.id, c.nombre]),
  );

  const abiertas = cuentas.estado === "abiertas";
  const soyEncargado = cuentas.encargado?.id === usuario.id;
  // Separado, sin compensar: cada uno le paga a quien compró.
  const { teDeben, debes, deQuienes, aQuienes } = miResumen(cuentas, yo);
  const detalle = (lista: { nombre: string; centavos: number }[]) =>
    lista.map((x) => `${x.nombre} ${formatearPesos(x.centavos)}`).join(" · ");

  const conMovimiento = cuentas.personas.filter(
    (p) => (cuentas.pagado[p.id] ?? 0) > 0 || (cuentas.parte[p.id] ?? 0) > 0,
  );

  const tablaSaldos = conMovimiento.length > 0 && (
    <section className="flex flex-col gap-2">
      <h2 className={tituloSeccion}>
        {abiertas ? "CÓMO VA QUEDANDO" : "CÓMO QUEDÓ CADA UNO"}
      </h2>
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
                    {p.id === yo && (
                      <span className="text-muted-foreground-2"> (vos)</span>
                    )}
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
  );

  const listaGastos = (
    <ul className="flex flex-col gap-2">
      {cuentas.gastos.map((gasto) => {
        const categoria = gasto.categoriaId
          ? nombreCategoria.get(gasto.categoriaId)
          : null;
        const contenido = (
          <>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">
                {gasto.concepto}
              </p>
              <p className="text-xs text-muted-foreground-2">
                Pagó {nombre(gasto.pagadoPor)} ·{" "}
                {categoria
                  ? `en ${categoria}`
                  : `entre ${gasto.participantes.map(nombre).join(", ")}`}
              </p>
            </div>
            <span className="shrink-0 text-sm font-semibold text-foreground">
              {formatearPesos(gasto.montoCentavos)}
            </span>
          </>
        );
        return (
          <li key={gasto.id}>
            {editables ? (
              <Link
                href={`/juntadas/${juntada.id}/cuentas/gasto/${gasto.id}`}
                className="flex items-start gap-3 rounded-lg bg-card px-4 py-2.5 transition-colors hover:bg-accent"
              >
                {contenido}
                <Pencil className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground-2" />
              </Link>
            ) : (
              <div className="flex items-start gap-3 rounded-lg bg-card px-4 py-2.5">
                {contenido}
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );

  const categorias = (
    <CategoriasSection
      juntadaId={juntada.id}
      categorias={cuentas.categorias}
      personas={cuentas.personas.map(
        ({ id, nombre, esInvitado, vaPorDefecto }) => ({
          id,
          nombre,
          esInvitado,
          va: vaPorDefecto,
        }),
      )}
      conGastos={cuentas.gastos.flatMap((g) =>
        g.categoriaId ? [g.categoriaId] : [],
      )}
      editable={editables}
    />
  );

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina
        titulo={`Cuentas · ${juntada.nombre}`}
        volverA={`/juntadas/${juntada.id}`}
      />

      <div className="flex flex-col gap-3">
        <div className="flex items-end justify-between rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
          <div>
            <p className={tituloSeccion}>
              TOTAL GASTADO ·{" "}
              {abiertas
                ? "CARGANDO"
                : cuentas.estado === "divididas"
                  ? "DIVIDIDO"
                  : "CERRADO"}
            </p>
            <p className="font-heading text-4xl leading-none tracking-wide text-foreground">
              {formatearPesos(cuentas.totalCentavos)}
            </p>
          </div>
          {(teDeben > 0 || debes > 0) && (
            <div className="flex flex-col items-end text-right text-sm font-semibold">
              {teDeben > 0 && (
                <>
                  <p className="text-foreground">
                    Te deben {formatearPesos(teDeben)}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground-2">
                    {detalle(deQuienes)}
                  </p>
                </>
              )}
              {debes > 0 && (
                <>
                  <p className="mt-1 text-primary">
                    Debés {formatearPesos(debes)}
                  </p>
                  <p className="text-xs font-normal text-muted-foreground-2">
                    a {detalle(aQuienes)}
                  </p>
                </>
              )}
            </div>
          )}
        </div>
        <EncargadoCuentas
          juntadaId={juntada.id}
          encargado={cuentas.encargado}
          puedeHacerseCargo={puedeModificar}
        />
      </div>

      {abiertas ? (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className={tituloSeccion}>1 · QUIÉN PUSO QUÉ</h2>
                <Ayuda titulo="Quién puso qué">
                  Cada uno carga lo que pagó para compartir y elige en qué
                  categoría va (ej: la carne en Comida, el fernet en Bebida). Lo
                  que ya había o lo que alguien trajo para él no se carga.
                </Ayuda>
              </div>
              {puedeModificar ? (
                <Link
                  href={`/juntadas/${juntada.id}/cuentas/gasto`}
                  className="flex items-center justify-center gap-1.5 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"
                >
                  <Plus className="h-4 w-4" />
                  Cargar lo que puse
                </Link>
              ) : (
                <p className="rounded-lg border border-dashed border-primary/50 px-4 py-2 text-xs text-muted-foreground">
                  Estás mirando: solo los que van a la juntada cargan y dividen
                  gastos.
                </p>
              )}
              {cuentas.gastos.length === 0 ? (
                <EmptyState
                  icon={Receipt}
                  title="Todavía no hay gastos"
                  description="Cuando esté todo cargado, el encargado divide y la app arma quién le pasa a quién."
                />
              ) : (
                listaGastos
              )}
            </section>

            <section className="flex flex-col gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className={tituloSeccion}>2 · ¿QUIÉN ENTRA EN CADA COSA?</h2>
                <Ayuda titulo="Categorías">
                  Las categorías son los sectores de la juntada: comida, bebida,
                  picada… Cada una se divide solo entre los tildados. Arrancan
                  con los que van, así que en general no hay que tocar nada.
                  Sacá al que no tomó de Bebida, o renombrá una con el lápiz.
                </Ayuda>
              </div>
              {categorias}
            </section>
          </div>

          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>3 · DIVIDIR</h2>
              {soyEncargado ? (
                <FormConfirmar
                  action={dividirGastos.bind(null, juntada.id)}
                  mensaje="¿Ya está todo cargado? Al dividir se arman las transferencias y no se pueden tocar los gastos (lo podés volver a abrir)."
                  disabled={cuentas.gastos.length === 0}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground disabled:opacity-40"
                >
                  Dividir gastos
                </FormConfirmar>
              ) : (
                <p className="rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground">
                  {cuentas.encargado
                    ? `Cuando esté todo cargado, ${cuentas.encargado.nombre} divide y aparece quién le pasa a quién.`
                    : "Cuando haya encargado, él divide y aparece quién le pasa a quién."}
                </p>
              )}
            </section>

            {tablaSaldos}

            {puedeModificar && (
              <BonificadosSection
                juntadaId={juntada.id}
                personas={cuentas.personas.map(
                  ({ id, nombre, esInvitado }) => ({
                    id,
                    nombre,
                    esInvitado,
                  }),
                )}
                bonificados={cuentas.bonificados}
              />
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-col gap-6 lg:grid lg:grid-cols-2 lg:items-start lg:gap-8">
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>QUIÉN LE PASA A QUIÉN</h2>
              {cuentas.transferencias.length === 0 ? (
                <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-pagado bg-card px-4 py-3">
                  <CircleCheck className="h-5 w-5 shrink-0 text-pagado" />
                  <p className="text-sm text-foreground">
                    {cuentas.estado === "cerradas"
                      ? "Cuentas cerradas: quedó todo a mano."
                      : "Están todos a mano."}
                  </p>
                </div>
              ) : (
                <ul className="flex flex-col gap-2">
                  {cuentas.transferencias.map((transferencia) => {
                    const destino = persona.get(transferencia.a);
                    const meToca = transferencia.de === yo;
                    const puedoTildar =
                      meToca || transferencia.a === yo || soyEncargado;
                    return (
                      <li
                        key={`${transferencia.de}-${transferencia.a}`}
                        className={cn(
                          "flex flex-col gap-2 rounded-lg border-l-4 bg-card px-4 py-3",
                          meToca ? "border-l-primary" : "border-l-border",
                        )}
                      >
                        <div className="flex items-center gap-2 text-sm">
                          <span className="truncate font-semibold text-foreground">
                            {nombre(transferencia.de)}
                          </span>
                          <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
                          <span className="truncate font-semibold text-foreground">
                            {nombre(transferencia.a)}
                          </span>
                          <span className="ml-auto shrink-0 font-heading text-xl tracking-wide text-primary">
                            {formatearPesos(transferencia.centavos)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between gap-2">
                          {destino?.aliasCvu ? (
                            <div className="flex min-w-0 items-center gap-2">
                              <span className="truncate text-xs text-muted-foreground-2">
                                {destino.aliasCvu}
                              </span>
                              <BotonCopiar
                                texto={destino.aliasCvu}
                                label="Copiar alias"
                              />
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground-2">
                              {destino?.esInvitado
                                ? ""
                                : `${destino?.nombre} no cargó su alias.`}
                            </span>
                          )}
                          {puedoTildar && (
                            <form
                              action={marcarPagado.bind(
                                null,
                                juntada.id,
                                transferencia.de,
                                transferencia.a,
                              )}
                            >
                              <button
                                type="submit"
                                className="flex shrink-0 items-center gap-1 rounded-full border border-pagado/60 px-3 py-1 text-xs font-semibold text-pagado hover:bg-pagado/10"
                              >
                                <Check className="h-3.5 w-3.5" />
                                Ya pagó
                              </button>
                            </form>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            {cuentas.pagos.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className={tituloSeccion}>YA PAGARON</h2>
                <ul className="flex flex-col gap-2">
                  {cuentas.pagos.map((pago) => {
                    const puedoDeshacer =
                      cuentas.estado === "divididas" &&
                      (pago.de === yo || pago.a === yo || soyEncargado);
                    return (
                      <li
                        key={pago.id}
                        className="flex items-center gap-2 rounded-lg bg-card px-4 py-2.5 text-sm"
                      >
                        <CircleCheck className="h-5 w-5 shrink-0 text-pagado" />
                        <span className="min-w-0 truncate text-muted-foreground">
                          {nombre(pago.de)} → {nombre(pago.a)}
                        </span>
                        <span className="ml-auto shrink-0 font-semibold text-pagado">
                          {formatearPesos(pago.centavos)}
                        </span>
                        {puedoDeshacer && (
                          <form
                            action={deshacerPago.bind(
                              null,
                              juntada.id,
                              pago.id,
                            )}
                          >
                            <button
                              type="submit"
                              aria-label="Deshacer pago"
                              className="flex h-7 w-7 items-center justify-center text-muted-foreground-2 hover:text-primary"
                            >
                              <Undo2 className="h-4 w-4" />
                            </button>
                          </form>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            )}

            {soyEncargado && (
              <section className="flex flex-col gap-2">
                {cuentas.estado === "divididas" ? (
                  <>
                    {cuentas.transferencias.length === 0 && (
                      <FormConfirmar
                        action={cerrarCuentas.bind(null, juntada.id)}
                        mensaje="¿Cerrar las cuentas? Ya pagaron todos."
                        className="flex w-full items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-semibold text-primary-foreground"
                      >
                        Cerrar cuentas
                      </FormConfirmar>
                    )}
                    <FormConfirmar
                      action={volverACargar.bind(null, juntada.id)}
                      mensaje="¿Volver a cargar gastos? Los pagos ya tildados se mantienen."
                      className={botonSecundario}
                    >
                      Volver a cargar gastos
                    </FormConfirmar>
                  </>
                ) : (
                  <FormConfirmar
                    action={reabrirCuentas.bind(null, juntada.id)}
                    mensaje="¿Reabrir las cuentas?"
                    className={botonSecundario}
                  >
                    Reabrir cuentas
                  </FormConfirmar>
                )}
              </section>
            )}
          </div>

          <div className="flex flex-col gap-6">
            {tablaSaldos}
            {cuentas.categorias.length > 0 && (
              <section className="flex flex-col gap-2">
                <h2 className={tituloSeccion}>QUÉ SE DIVIDIÓ</h2>
                {categorias}
              </section>
            )}
            <section className="flex flex-col gap-2">
              <h2 className={tituloSeccion}>QUIÉN PUSO QUÉ</h2>
              {listaGastos}
            </section>
          </div>
        </div>
      )}
    </main>
  );
}
