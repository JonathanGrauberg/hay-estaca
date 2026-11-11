import { cn } from "@/lib/utils";

// El fueguito de la marca: llama roja por fuera y brasa por dentro, que titila sola
// (animaciones en globals.css). Se usa en la bienvenida y mientras algo carga.
export function Fueguito({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 80" className={cn("fueguito", className)} aria-hidden="true">
      <path
        className="fueguito-afuera"
        d="M32 2C36 18 54 28 54 50a22 22 0 0 1-44 0c0-10 5-17 10-22 1 7 4 11 8 13-2-14 2-28 6-39Z"
      />
      <path
        className="fueguito-adentro"
        d="M32 34c3 8 12 12 12 24a12 12 0 0 1-24 0c0-6 3-10 6-13 1 4 3 6 5 7-1-7 0-13 1-18Z"
      />
    </svg>
  );
}
