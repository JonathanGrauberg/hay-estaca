import Link from "next/link";
import { ChevronRight, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import {
  cargarCuentas,
  miResumen,
  sumarPorPersona,
  type PersonaMonto,
} from "@/lib/cuentas/datos";
import { formatearPesos } from "@/lib/cuentas/dinero";
import { personaId } from "@/lib/cuentas/personas";
import { formatFechaCorta } from "@/lib/utils";
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
      // Lo pendiente: ya descontado lo que se pagó.
      return {
        ...juntada,
        estado: cuentas.estado,
        total: cuentas.totalCentavos,
        ...miResumen(cuentas, yo),
      };
    })
  );

  // Separado: lo que te tienen que pasar y lo que tenés que pasar vos (no se compensa,
  // porque cada uno le paga a quien compró).
  const teDebenTotal = resumenes.reduce((total, r) => total + r.teDeben, 0);
  const debesTotal = resumenes.reduce((total, r) => total + r.debes, 0);
  const meDeben = sumarPorPersona(resumenes.map((r) => r.deQuienes));
  const lesDebo = sumarPorPersona(resumenes.map((r) => r.aQuienes));

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-5xl lg:px-8 lg:pt-12">
      <EncabezadoPagina titulo="Cuentas" />

      {(teDebenTotal > 0 || debesTotal > 0) && (
        <div className="flex flex-col gap-1 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            TUS CUENTAS PENDIENTES
          </p>
          {teDebenTotal > 0 && (
            <div>
              <p className="font-heading text-3xl tracking-wide text-foreground">
                Te deben {formatearPesos(teDebenTotal)}
              </p>
              <DetallePersonas lista={meDeben} />
            </div>
          )}
          {debesTotal > 0 && (
            <div className={teDebenTotal > 0 ? "mt-2" : undefined}>
              <p className="font-heading text-3xl tracking-wide text-primary">
                Debés {formatearPesos(debesTotal)}
              </p>
              <DetallePersonas lista={lesDebo} prefijo="a " />
            </div>
          )}
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
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
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
                    {r.estado === "divididas" && " · dividido"}
                    {r.estado === "cerradas" && " · cerrado"}
                  </p>
                </div>
                {(r.teDeben > 0 || r.debes > 0) && (
                  <span className="flex shrink-0 flex-col items-end text-sm font-semibold">
                    {r.teDeben > 0 && (
                      <span className="text-foreground">
                        +{formatearPesos(r.teDeben)}
                        <span className="block text-right text-[11px] font-normal text-muted-foreground-2">
                          de {r.deQuienes.map((x) => x.nombre).join(", ")}
                        </span>
                      </span>
                    )}
                    {r.debes > 0 && (
                      <span className="text-primary">
                        −{formatearPesos(r.debes)}
                        <span className="block text-right text-[11px] font-normal text-muted-foreground-2">
                          a {r.aQuienes.map((x) => x.nombre).join(", ")}
                        </span>
                      </span>
                    )}
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

// "Cabra $7.066,67 · Nacho $7.066,66": de quién es cada parte del total.
function DetallePersonas({ lista, prefijo = "" }: { lista: PersonaMonto[]; prefijo?: string }) {
  return (
    <p className="text-sm text-muted-foreground">
      {prefijo}
      {lista.map((x, i) => (
        <span key={x.id}>
          {i > 0 && " · "}
          <span className="font-semibold text-foreground">{x.nombre}</span>{" "}
          {formatearPesos(x.centavos)}
        </span>
      ))}
    </p>
  );
}
