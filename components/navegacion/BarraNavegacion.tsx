"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ITEMS_NAVEGACION, estaActivo } from "@/components/navegacion/items";
import { cn } from "@/lib/utils";

// Barra fija abajo, solo en pantallas chicas. En desktop la reemplaza BarraLateral.
export function BarraNavegacion() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-10 border-t border-border bg-background/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <ul className="mx-auto flex max-w-md">
        {ITEMS_NAVEGACION.filter((item) => !item.soloLateral).map(({ href, label, icon: Icon }) => {
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
