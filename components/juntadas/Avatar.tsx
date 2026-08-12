import { cn } from "@/lib/utils";

export function iniciales(texto: string) {
  return texto.trim().slice(0, 2).toUpperCase();
}

interface AvatarProps {
  nombre: string;
  apodo: string;
  avatarUrl?: string | null;
  className?: string;
}

export function Avatar({ nombre, apodo, avatarUrl, className }: AvatarProps) {
  return (
    <div
      className={cn(
        "flex h-14 w-14 items-center justify-center overflow-hidden rounded-full border-2 bg-card text-sm font-semibold",
        className
      )}
    >
      {avatarUrl ? (
        // eslint-disable-next-line @next/next/no-img-element -- avatarUrl es una URL arbitraria del usuario
        <img src={avatarUrl} alt={nombre} className="h-full w-full object-cover" />
      ) : (
        iniciales(apodo || nombre)
      )}
    </div>
  );
}
