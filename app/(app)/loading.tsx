import { Fueguito } from "@/components/marca/Fueguito";

// Mientras carga cualquier pantalla de la app: el fueguito titilando.
export default function Cargando() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 py-24">
      <Fueguito className="h-14 w-11" />
      <p className="text-xs tracking-[0.2em] text-muted-foreground-2">PRENDIENDO EL FUEGO…</p>
    </div>
  );
}
