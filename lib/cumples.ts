export const MESES = [
  "enero",
  "febrero",
  "marzo",
  "abril",
  "mayo",
  "junio",
  "julio",
  "agosto",
  "septiembre",
  "octubre",
  "noviembre",
  "diciembre",
];

// Días de cada mes (febrero con 29: el cumple no tiene año).
const DIAS_POR_MES = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export function diasDelMes(mes: number) {
  return DIAS_POR_MES[mes - 1] ?? 31;
}

// Lee "cumpleDia" y "cumpleMes" del form. Vacío = sin cumple.
export function leerCumple(
  formData: FormData,
):
  | { error: string }
  | { cumpleDia: number | null; cumpleMes: number | null } {
  const dia = Number(formData.get("cumpleDia") || 0);
  const mes = Number(formData.get("cumpleMes") || 0);
  if (!dia && !mes) {
    return { cumpleDia: null, cumpleMes: null };
  }
  if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
    return { error: "Elegí el mes del cumple." };
  }
  if (!Number.isInteger(dia) || dia < 1 || dia > diasDelMes(mes)) {
    return { error: `Ese día no existe en ${MESES[mes - 1]}.` };
  }
  return { cumpleDia: dia, cumpleMes: mes };
}

// Día y mes de hoy en Argentina (no en UTC: a la noche ya sería "mañana").
export function hoyEnArgentina() {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    month: "numeric",
    day: "numeric",
  }).formatToParts(new Date());
  const valor = (tipo: string) =>
    Number(partes.find((p) => p.type === tipo)?.value);
  return { dia: valor("day"), mes: valor("month") };
}
