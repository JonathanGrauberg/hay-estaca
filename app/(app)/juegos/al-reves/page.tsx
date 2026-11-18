import { requireUsuario } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AlReves } from "@/components/juegos/AlReves";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function AlRevesPage() {
  await requireUsuario();
  // Solo lo que se muestra: nada de teléfono ni PIN.
  const integrantes = await prisma.user.findMany({
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true, avatarUrl: true },
  });

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-4 px-4 pb-6 pt-6 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Al revés" volverA="/juegos" />
      <AlReves integrantes={integrantes} />
    </main>
  );
}
