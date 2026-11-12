import { LogOut } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUsuario } from "@/lib/auth";
import { cerrarSesion } from "@/lib/actions/auth";
import { editarIntegrante } from "@/lib/actions/usuarios";
import { rutaFoto } from "@/lib/fotos";
import { r2Configurado } from "@/lib/r2";
import { FotoPerfil } from "@/components/fotos/FotoPerfil";
import { FormAlias } from "@/components/integrantes/FormAlias";
import { EncargadoFijo } from "@/components/integrantes/EncargadoFijo";
import { FormCambiarPin } from "@/components/integrantes/FormCambiarPin";
import { FormEditarIntegrante } from "@/components/integrantes/FormEditarIntegrante";
import { EncabezadoPagina } from "@/components/navegacion/EncabezadoPagina";

export const dynamic = "force-dynamic";

export default async function PerfilPage() {
  const usuario = await requireUsuario();
  const [{ telefono, aliasCvu, encargadoCuentas, cumpleDia, cumpleMes }, propuestas] = await Promise.all([
    prisma.user.findUniqueOrThrow({
      where: { id: usuario.id },
      select: { telefono: true, aliasCvu: true, encargadoCuentas: true, cumpleDia: true, cumpleMes: true },
    }),
    prisma.propuestaFoto.findMany({
      where: { paraUserId: usuario.id },
      orderBy: { createdAt: "desc" },
      select: { id: true, key: true, de: { select: { nombre: true, apodo: true } } },
    }),
  ]);

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col gap-6 px-4 pb-6 pt-8 lg:max-w-xl lg:pt-12">
      <EncabezadoPagina titulo="Yo" />

      <div className="flex flex-col items-center gap-2">
        <FotoPerfil
          userId={usuario.id}
          nombre={usuario.nombre}
          apodo={usuario.apodo}
          avatarUrl={usuario.avatarUrl}
          propuestas={propuestas.map((propuesta) => ({
            id: propuesta.id,
            ruta: rutaFoto(propuesta.key),
            de: propuesta.de.apodo || propuesta.de.nombre,
          }))}
          habilitado={r2Configurado()}
        />
        <p className="font-heading text-2xl tracking-wide text-foreground">
          {(usuario.apodo || usuario.nombre).toUpperCase()}
        </p>
      </div>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          MIS DATOS
        </h2>
        <FormEditarIntegrante
          accion={editarIntegrante.bind(null, usuario.id)}
          valores={{
            nombre: usuario.nombre,
            apodo: usuario.apodo,
            telefono: telefono ?? "",
            cumpleDia,
            cumpleMes,
          }}
        />
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          MI ALIAS O CVU
        </h2>
        <p className="text-sm text-muted-foreground">
          Aparece en las cuentas para que te transfieran con un toque. Solo vos lo podés cambiar.
        </p>
        <FormAlias aliasCvu={aliasCvu ?? ""} />
      </section>

      {usuario.esAdmin && (
        <EncargadoFijo
          userId={usuario.id}
          apodo={usuario.apodo || usuario.nombre}
          encargado={encargadoCuentas}
        />
      )}

      <section className="flex flex-col gap-3">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          CAMBIAR MI PIN
        </h2>
        <FormCambiarPin />
      </section>

      <form action={cerrarSesion} className="border-t border-border pt-6">
        <button
          type="submit"
          className="flex w-full items-center justify-center gap-2 rounded-full border border-border px-4 py-2 text-sm font-semibold text-muted-foreground hover:text-primary"
        >
          <LogOut className="h-4 w-4" />
          Cerrar sesión
        </button>
      </form>
    </main>
  );
}
