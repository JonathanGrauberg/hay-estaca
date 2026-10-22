import Link from "next/link";
import { ChevronRight } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { crearIntegrante } from "@/lib/actions/usuarios";
import { Avatar } from "@/components/juntadas/Avatar";
import { FormIntegrante } from "@/components/integrantes/FormIntegrante";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function IntegrantesPage() {
  const usuario = await requireUsuario();
  const miembros = await prisma.user.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true, avatarUrl: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8">
      <EncabezadoPagina titulo="El grupo" />

      <ul className="flex flex-col gap-2">
        {miembros.map((miembro) => (
          <li key={miembro.id}>
            <Link
              href={miembro.id === usuario.id ? "/perfil" : `/integrantes/${miembro.id}`}
              className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5 transition-colors hover:bg-accent"
            >
              <Avatar
                nombre={miembro.nombre}
                apodo={miembro.apodo}
                avatarUrl={miembro.avatarUrl}
                className="h-9 w-9 shrink-0 border-border text-xs text-muted-foreground-2"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-foreground">
                  {miembro.apodo}
                  {miembro.id === usuario.id && (
                    <span className="text-muted-foreground-2"> (vos)</span>
                  )}
                </p>
                <p className="truncate text-xs text-muted-foreground-2">{miembro.nombre}</p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground-2" />
            </Link>
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          SUMAR INTEGRANTE
        </h2>
        <p className="text-sm text-muted-foreground">
          Le ponés un PIN inicial y se lo pasás; después lo cambia desde &quot;Yo&quot;.
        </p>
        <FormIntegrante accion={crearIntegrante} labelBoton="Sumar integrante" labelPin="PIN inicial" />
      </section>
    </main>
  );
}
