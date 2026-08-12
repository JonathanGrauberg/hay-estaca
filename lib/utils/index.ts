import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatFechaCorta(fecha: Date) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(fecha)
  const sinPunto = texto.replace(".", "")
  return sinPunto.charAt(0).toUpperCase() + sinPunto.slice(1)
}

export function formatFechaLarga(fecha: Date) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(fecha)
  return texto.charAt(0).toUpperCase() + texto.slice(1)
}
