import type { ReactNode } from "react";
import { getUsuarioActual } from "@/lib/auth";
import { BarraLateral } from "@/components/navegacion/BarraLateral";
import { BarraNavegacion } from "@/components/navegacion/BarraNavegacion";
import { CartelCumple } from "@/components/inicio/CartelCumple";
import { cumpleanerosDeHoy } from "@/lib/cumples-hoy";

// Todas las pantallas de la app (menos /login) comparten la navegación: barra abajo
// en el celular, columna a la izquierda en desktop. El chequeo de sesión sigue en
// cada página con requireUsuario(): un layout no se vuelve a renderizar al navegar,
// así que no sirve como única verificación (acá solo se usa para mostrar el usuario).
export default async function AppLayout({ children }: { children: ReactNode }) {
  const [usuario, cumples] = await Promise.all([getUsuarioActual(), cumpleanerosDeHoy()]);

  return (
    <>
      <BarraLateral usuario={usuario} />
      <div className="flex flex-1 flex-col pb-20 lg:pb-0 lg:pl-60">{children}</div>
      <BarraNavegacion />
      {/* El día del cumple de alguien, al abrir la app sale el cartel (una vez por día). */}
      {usuario && (
        <CartelCumple clave={cumples.clave} personas={cumples.personas} yoId={usuario.id} />
      )}
    </>
  );
}
