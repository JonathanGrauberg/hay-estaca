import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { leerEncuestas } from "@/lib/encuestas/datos";

// Lo consultan cada pocos segundos los que tienen la juntada abierta: los votos se ven
// en vivo sin recargar.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/juntadas/[id]/encuestas">,
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }
  const { id } = await params;
  const encuestas = await leerEncuestas(id, usuario);
  return NextResponse.json(encuestas, {
    headers: { "Cache-Control": "no-store" },
  });
}
