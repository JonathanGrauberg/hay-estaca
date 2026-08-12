import Link from "next/link";
import { Plus } from "lucide-react";
import { Avatar } from "@/components/juntadas/Avatar";
import { cn } from "@/lib/utils";

export interface AvatarRowMiembro {
  id: string;
  nombre: string;
  apodo: string;
  avatarUrl?: string | null;
  confirmado: boolean;
}

interface AvatarRowProps {
  miembros: AvatarRowMiembro[];
}

export function AvatarRow({ miembros }: AvatarRowProps) {
  return (
    <div className="flex gap-4 overflow-x-auto px-1 py-1">
      {miembros.map((miembro) => (
        <div key={miembro.id} className="flex shrink-0 flex-col items-center gap-1.5">
          <Avatar
            nombre={miembro.nombre}
            apodo={miembro.apodo}
            avatarUrl={miembro.avatarUrl}
            className={cn(
              miembro.confirmado
                ? "border-primary text-primary"
                : "border-border text-muted-foreground-2"
            )}
          />
          <span className="max-w-14 truncate text-xs text-muted-foreground-2">
            {miembro.apodo || miembro.nombre}
          </span>
        </div>
      ))}

      <div className="flex shrink-0 flex-col items-center gap-1.5">
        <Link
          href="/perfil"
          aria-label="Sumar integrante"
          className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-border text-muted-foreground-2 transition-colors hover:border-primary hover:text-primary"
        >
          <Plus className="h-5 w-5" />
        </Link>
        <span className="text-xs text-muted-foreground-2">Sumar</span>
      </div>
    </div>
  );
}
