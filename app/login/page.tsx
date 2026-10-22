import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import { crearPrimerIntegrante } from "@/lib/actions/usuarios";
import { FormIntegrante } from "@/components/integrantes/FormIntegrante";
import { FormLogin } from "@/components/integrantes/FormLogin";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  if (await getUsuarioActual()) {
    redirect("/");
  }

  const miembros = await prisma.user.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true, avatarUrl: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-8 px-4 pb-10 pt-12 lg:justify-center lg:pb-24">
      <header className="flex flex-col items-center gap-1 text-center">
        <p className="flex items-center gap-2 font-heading text-4xl tracking-wide text-foreground">
          <span className="text-primary">●</span>
          ESTAQUEROS
        </p>
        <p className="text-xs tracking-[0.2em] text-muted-foreground-2">★ ¡HAY PEÑA! ★</p>
      </header>

      {miembros.length > 0 ? (
        <FormLogin miembros={miembros} />
      ) : (
        <section className="flex flex-col gap-3">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            ARRANCÁ EL GRUPO
          </h2>
          <p className="text-sm text-muted-foreground">
            Todavía no hay integrantes. Creá el tuyo y después sumás al resto desde la app.
          </p>
          <FormIntegrante
            accion={crearPrimerIntegrante}
            labelBoton="Crear y entrar"
            labelPin="Tu PIN"
          />
        </section>
      )}
    </main>
  );
}
