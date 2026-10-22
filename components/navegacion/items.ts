import { Calculator, CalendarDays, House, User, Users, Wallet } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export interface ItemNavegacion {
  href: string;
  label: string;
  icon: LucideIcon;
  // La barra de abajo del celular tiene lugar para 5; el resto solo va en la lateral.
  soloLateral?: boolean;
}

// Se van sumando secciones (Juegos, ...) a medida que existan; mientras tanto
// están como cards "próximamente" en el inicio, no como botones muertos acá.
export const ITEMS_NAVEGACION: ItemNavegacion[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/juntadas", label: "Juntadas", icon: CalendarDays },
  { href: "/cuentas", label: "Cuentas", icon: Wallet },
  { href: "/calculadora", label: "Calculadora", icon: Calculator, soloLateral: true },
  { href: "/integrantes", label: "Grupo", icon: Users },
  { href: "/perfil", label: "Yo", icon: User },
];

export function estaActivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
