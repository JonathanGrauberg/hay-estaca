import type { ReactNode } from "react";
import { BarraNavegacion } from "@/components/navegacion/BarraNavegacion";

// Todas las pantallas de la app (menos /login) comparten la barra de abajo. El chequeo
// de sesión sigue en cada página con requireUsuario(): un layout no se vuelve a
// renderizar al navegar, así que no sirve como única verificación.
export default function AppLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <div className="flex flex-1 flex-col pb-20">{children}</div>
      <BarraNavegacion />
    </>
  );
}
