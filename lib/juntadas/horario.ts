// Horarios de una juntada como instantes reales. La fecha se guarda como @db.Date
// (medianoche UTC) y la hora como "HH:MM" de Argentina (UTC-3, sin horario de verano).

const OFFSET_ARGENTINA_HORAS = 3;

export function instanteArgentina(fecha: Date, hora: string) {
  const [horas, minutos] = hora.split(":").map(Number);
  return new Date(
    Date.UTC(
      fecha.getUTCFullYear(),
      fecha.getUTCMonth(),
      fecha.getUTCDate(),
      (horas || 0) + OFFSET_ARGENTINA_HORAS,
      minutos || 0
    )
  );
}

interface HorarioJuntada {
  fecha: Date;
  hora: string;
  fechaFin: Date | null;
  horaFin: string | null;
}

// Cuándo termina: lo que se cargó, o 24 hs después de empezar.
export function finDeJuntada(juntada: HorarioJuntada) {
  if (juntada.horaFin) {
    return instanteArgentina(juntada.fechaFin ?? juntada.fecha, juntada.horaFin);
  }
  return new Date(instanteArgentina(juntada.fecha, juntada.hora).getTime() + 24 * 3_600_000);
}

// Las historias se suben desde que arranca el día de la juntada hasta que termina.
export function estadoHistorias(juntada: HorarioJuntada, ahora = new Date()) {
  if (ahora < instanteArgentina(juntada.fecha, "00:00")) {
    return "todavia" as const;
  }
  return ahora <= finDeJuntada(juntada) ? ("abiertas" as const) : ("terminada" as const);
}
