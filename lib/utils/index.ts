import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Las fechas de juntada son @db.Date: Prisma las devuelve como medianoche UTC del día
// guardado. Si se formatean en la zona local (UTC-3 en Argentina) caen en el día
// anterior, así que se formatean siempre en UTC para mostrar el día tal cual se cargó.
export function formatFechaCorta(fecha: Date) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: "UTC",
  }).format(fecha)
  const sinPunto = texto.replace(".", "")
  return sinPunto.charAt(0).toUpperCase() + sinPunto.slice(1)
}

export function formatFechaLarga(fecha: Date) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}

// Hoy en Argentina, expresado igual que guarda Prisma un @db.Date (medianoche UTC),
// para poder comparar contra Juntada.fecha y separar próximas de pasadas por la
// fecha real en vez de depender de un estado que nadie actualiza.
export function hoyComoFechaDb() {
  const ymd = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Argentina/Buenos_Aires",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
  return new Date(ymd)
}
