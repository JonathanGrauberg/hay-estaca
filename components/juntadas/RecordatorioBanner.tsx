"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useQuienSos } from "@/components/QuienSosProvider";

interface ItemPendiente {
  id: string;
  descripcion: string;
  asignadoAUserId: string | null;
  juntada: { fecha: Date; hora: string };
}

interface RecordatorioBannerProps {
  items: ItemPendiente[];
  miembros: { id: string; nombre: string; apodo: string }[];
}

const UNA_HORA_MS = 60 * 60 * 1000;

function faltaMenosDeUnaHora(fecha: Date, hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  // "fecha" llega como medianoche UTC del día guardado (@db.Date): se toman el año,
  // mes y día en UTC y la hora en zona local, porque "hora" es la hora del reloj de
  // la juntada. Con getters locales, en UTC-3 caería en el día anterior.
  const dia = new Date(fecha);
  const fechaHora = new Date(
    dia.getUTCFullYear(),
    dia.getUTCMonth(),
    dia.getUTCDate(),
    horas || 0,
    minutos || 0
  );
  const diferenciaMs = fechaHora.getTime() - Date.now();
  return diferenciaMs > 0 && diferenciaMs <= UNA_HORA_MS;
}

export function RecordatorioBanner({ items, miembros }: RecordatorioBannerProps) {
  const { quienSoyId } = useQuienSos();

  // Fuerza un re-render cada minuto para que el banner se recalcule con la hora
  // actual y desaparezca solo apenas la juntada deja de estar "a menos de 1hs",
  // sin que la persona tenga que recargar la página.
  const [, tick] = useState(0);
  useEffect(() => {
    const interval = setInterval(() => tick((n) => n + 1), 60_000);
    return () => clearInterval(interval);
  }, []);

  if (!quienSoyId) {
    return null;
  }

  const misItems = items.filter(
    (item) =>
      item.asignadoAUserId === quienSoyId && faltaMenosDeUnaHora(item.juntada.fecha, item.juntada.hora)
  );

  if (misItems.length === 0) {
    return null;
  }

  const yo = miembros.find((miembro) => miembro.id === quienSoyId);
  const apodo = yo?.apodo || yo?.nombre || "";

  return (
    <div className="flex items-start gap-2.5 rounded-lg border border-primary bg-primary/10 px-4 py-3">
      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
      <p className="text-sm text-foreground">
        <span className="font-semibold text-primary">Che {apodo}, </span>
        acordate que estás asignado a: {misItems.map((item) => item.descripcion).join(", ")}.
      </p>
    </div>
  );
}
