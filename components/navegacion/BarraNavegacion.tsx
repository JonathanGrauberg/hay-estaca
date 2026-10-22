"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { CalendarDays, House, User, Users } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

// Se van sumando secciones (Cuentas, Juegos) a medida que existan; mientras tanto
// están como cards "próximamente" en el inicio, no como botones muertos acá.
const ITEMS: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Inicio", icon: House },
  { href: "/juntadas", label: "Juntadas", icon: CalendarDays },
  { href: "/integrantes", label: "Grupo", icon: Users },
  { href: "/perfil", label: "Yo", icon: User },
];

function estaActivo(pathname: string, href: string) {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}

export function BarraNavegacion() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
      <ul className="mx-auto flex max-w-md">
        {ITEMS.map(({ href, label, icon: Icon }) => {
          const activo = estaActivo(pathname, href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center gap-0.5 py-2.5 text-[11px] font-semibold transition-colors",
                  activo ? "text-primary" : "text-muted-foreground-2 hover:text-foreground"
                )}
              >
                <Icon className="h-5 w-5" strokeWidth={activo ? 2.25 : 1.75} />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
