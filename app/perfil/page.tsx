import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { Avatar } from "@/components/juntadas/Avatar";
import { FormSumarIntegrante } from "./FormSumarIntegrante";

// La lista de integrantes puede cambiar apenas se suma alguien, así que se
// renderiza siempre en el servidor por request en vez de quedar cacheada estática.
export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const miembros = await prisma.user.findMany({ orderBy: { nombre: "asc" } });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-10 pt-8">
      <div className="flex items-center gap-2">
        <Link
          href="/"
          className="flex h-8 w-8 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
          aria-label="Volver al dashboard"
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <h1 className="text-xl font-semibold text-foreground">Integrantes</h1>
      </div>

      {miembros.length > 0 && (
        <ul className="flex flex-col gap-2">
          {miembros.map((miembro) => (
            <li
              key={miembro.id}
              className="flex items-center gap-3 rounded-lg bg-card px-4 py-2.5"
            >
              <Avatar
                nombre={miembro.nombre}
                apodo={miembro.apodo}
                avatarUrl={miembro.avatarUrl}
                className="h-9 w-9 shrink-0 border-border text-xs text-muted-foreground-2"
              />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{miembro.apodo}</p>
                <p className="truncate text-xs text-muted-foreground-2">{miembro.nombre}</p>
              </div>
            </li>
          ))}
        </ul>
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          SUMAR INTEGRANTE
        </h2>
        <FormSumarIntegrante />
      </section>
    </main>
  );
}
