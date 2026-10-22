import Link from "next/link";
import type { LucideIcon } from "lucide-react";

interface CardSeccionProps {
  icon: LucideIcon;
  titulo: string;
  detalle: string;
  // Sin href, la sección todavía no existe: se muestra apagada como "próximamente".
  href?: string;
}

export function CardSeccion({ icon: Icon, titulo, detalle, href }: CardSeccionProps) {
  const contenido = (
    <>
      <Icon className={href ? "h-5 w-5 text-primary" : "h-5 w-5 text-muted-foreground-2"} />
      <div className="min-w-0">
        <p className="font-heading text-xl leading-none tracking-wide text-foreground">{titulo}</p>
        <p className="mt-1 truncate text-xs text-muted-foreground-2">{detalle}</p>
      </div>
    </>
  );

  if (!href) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border-l-4 border-l-border bg-card/60 px-4 py-3 opacity-60">
        {contenido}
      </div>
    );
  }

  return (
    <Link
      href={href}
      className="flex flex-col gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3 transition-colors hover:bg-accent"
    >
      {contenido}
    </Link>
  );
}
