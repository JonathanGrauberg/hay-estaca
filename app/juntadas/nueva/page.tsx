import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requireUsuario } from "@/lib/auth";
import { FormNuevaJuntada } from "@/components/juntadas/FormNuevaJuntada";

export default async function NuevaJuntadaPage() {
  await requireUsuario();

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
        <h1 className="text-xl font-semibold text-foreground">Nueva juntada</h1>
      </div>

      <FormNuevaJuntada />
    </main>
  );
}
