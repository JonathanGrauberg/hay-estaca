import { NextResponse } from "next/server";
import { getUsuarioActual } from "@/lib/auth";
import { leerPartidaTruco } from "@/lib/juegos/partida-truco";

// Lo consultan cada segundo y medio los que siguen la partida en vivo.
export async function GET(
  _request: Request,
  { params }: RouteContext<"/api/truco/[id]">,
) {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    return NextResponse.json({ error: "Sin sesión" }, { status: 401 });
  }
  const { id } = await params;
  const partida = await leerPartidaTruco(id);
  if (!partida) {
    return NextResponse.json({ error: "No existe" }, { status: 404 });
  }
  return NextResponse.json(partida, {
    headers: { "Cache-Control": "no-store" },
  });
}
