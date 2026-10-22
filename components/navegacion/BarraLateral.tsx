"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { cerrarSesion } from "@/lib/actions/auth";
import { Avatar } from "@/components/juntadas/Avatar";
import { ITEMS_NAVEGACION, estaActivo } from "@/components/navegacion/items";
import { cn } from "@/lib/utils";

interface BarraLateralProps {
  usuario: { nombre: string; apodo: string; avatarUrl: string | null } | null;
}

// Navegación de escritorio: columna fija a la izquierda, como una app de PC. En
// pantallas chicas no se muestra (está la barra de abajo).
export function BarraLateral({ usuario }: BarraLateralProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-60 flex-col border-r border-border bg-card/40 px-4 py-6 lg:flex">
      <Link href="/" className="flex flex-col gap-0.5 px-3">
        <span className="flex items-center gap-2 font-heading text-3xl tracking-wide text-foreground">
          <span className="text-primary">●</span>
          ESTAQUEROS
        </span>
        <span className="text-[10px] tracking-[0.2em] text-muted-foreground-2">★ ¡HAY PEÑA! ★</span>
      </Link>

      <nav className="mt-8 flex-1">
        <ul className="flex flex-col gap-1">
          {ITEMS_NAVEGACION.map(({ href, label, icon: Icon }) => {
            const activo = estaActivo(pathname, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  className={cn(
                    "flex items-center gap-3 rounded-lg border-l-4 px-3 py-2 text-sm font-semibold transition-colors",
                    activo
                      ? "border-l-primary bg-card text-foreground"
                      : "border-l-transparent text-muted-foreground-2 hover:bg-card hover:text-foreground"
                  )}
                >
                  <Icon className={cn("h-5 w-5", activo && "text-primary")} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {usuario && (
        <div className="flex items-center gap-3 border-t border-border px-1 pt-4">
          <Avatar
            nombre={usuario.nombre}
            apodo={usuario.apodo}
            avatarUrl={usuario.avatarUrl}
            className="h-9 w-9 shrink-0 border-primary text-xs text-primary"
          />
          <span className="min-w-0 flex-1 truncate text-sm font-semibold text-foreground">
            {usuario.apodo || usuario.nombre}
          </span>
          <form action={cerrarSesion}>
            <button
              type="submit"
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
              className="text-muted-foreground-2 hover:text-primary"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </form>
        </div>
      )}
    </aside>
  );
}
