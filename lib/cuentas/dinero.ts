// Montos en pesos argentinos, guardados en centavos.

const sinCentavos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});
const conCentavos = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  minimumFractionDigits: 2,
});

// "$ 12.500" si es redondo, "$ 12.500,50" si tiene centavos.
export function formatearPesos(centavos: number) {
  const formato = centavos % 100 === 0 ? sinCentavos : conCentavos;
  return formato.format(centavos / 100);
}

// Acepta lo que la gente tipea en Argentina: "12500", "12.500", "12.500,50",
// "12500,5", "$ 3.000". Con coma, el punto es separador de miles y la coma decimal.
// Sin coma, un punto seguido de exactamente 3 dígitos es de miles ("12.500") y si no,
// decimal ("12.5"). Devuelve centavos, o null si no es un monto válido y positivo.
export function parsearMonto(texto: string) {
  let limpio = texto.replace(/[\s$]/g, "");
  if (!limpio) {
    return null;
  }

  if (limpio.includes(",")) {
    limpio = limpio.replace(/\./g, "").replace(",", ".");
  } else if (/^\d{1,3}(\.\d{3})+$/.test(limpio)) {
    limpio = limpio.replace(/\./g, "");
  }

  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) {
    return null;
  }

  const centavos = Math.round(Number(limpio) * 100);
  return centavos > 0 ? centavos : null;
}

// Para precargar el input al editar: 1250050 → "12500,5".
export function centavosAInput(centavos: number) {
  return (centavos / 100).toString().replace(".", ",");
}
