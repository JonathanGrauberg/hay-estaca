import type { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getUsuarioActual } from "@/lib/auth";
import { desdeHistoriasVigentes, vaALaJuntada } from "@/lib/fotos";
import { r2Configurado, urlLectura } from "@/lib/r2";

// Las fotos viven en un bucket privado de R2. Esta ruta decide quién puede ver qué y
// redirige a un link firmado que vence en una hora:
// - avatars/...: cualquiera (la pantalla de login muestra las caras para elegir).
// - historias/<juntadaId>/...: solo los que van a esa juntada, y solo por 24 hs.
export async function GET(_request: NextRequest, ctx: RouteContext<"/fotos/[...ruta]">) {
  const { ruta } = await ctx.params;
  const key = ruta.join("/");

  if (!r2Configurado() || key.includes("..")) {
    return new Response(null, { status: 404 });
  }

  if (ruta[0] === "historias") {
    const usuario = await getUsuarioActual();
    const historia = await prisma.historia.findFirst({
      where: { key, createdAt: { gte: desdeHistoriasVigentes() } },
      select: { juntadaId: true },
    });
    if (!usuario || !historia || !(await vaALaJuntada(historia.juntadaId, usuario.id))) {
      return new Response(null, { status: 404 });
    }
  } else if (ruta[0] !== "avatars") {
    return new Response(null, { status: 404 });
  }

  return new Response(null, {
    status: 302,
    headers: {
      Location: await urlLectura(key),
      // Un poco menos que lo que dura el link firmado.
      "Cache-Control": "private, max-age=3000",
    },
  });
}
