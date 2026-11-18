// Afinador de guitarra: detectar la nota que suena y cuánto le falta. Sin dependencias
// del navegador, así se puede probar con señales armadas.

export interface Cuerda {
  numero: number;
  nota: string;
  nombre: string;
  frecuencia: number;
}

// Afinación estándar, de la 6.ª (la más grave) a la 1.ª.
export const CUERDAS: Cuerda[] = [
  { numero: 6, nota: "E2", nombre: "Mi", frecuencia: 82.41 },
  { numero: 5, nota: "A2", nombre: "La", frecuencia: 110 },
  { numero: 4, nota: "D3", nombre: "Re", frecuencia: 146.83 },
  { numero: 3, nota: "G3", nombre: "Sol", frecuencia: 196 },
  { numero: 2, nota: "B3", nombre: "Si", frecuencia: 246.94 },
  { numero: 1, nota: "E4", nombre: "Mi", frecuencia: 329.63 },
];

// Lo que se busca: de un poco más grave que la 6.ª a un poco más agudo que la 1.ª
// (también sirve si está muy desafinada).
const FRECUENCIA_MIN = 60;
const FRECUENCIA_MAX = 450;

// Debajo de esto es silencio o ruido de fondo.
const VOLUMEN_MIN = 0.008;

// Diferencia en cents (100 = un semitono). Positivo = está alta.
export function cents(frecuencia: number, referencia: number) {
  return 1200 * Math.log2(frecuencia / referencia);
}

export function cuerdaMasCercana(frecuencia: number) {
  let mejor = CUERDAS[0];
  for (const cuerda of CUERDAS) {
    if (Math.abs(cents(frecuencia, cuerda.frecuencia)) < Math.abs(cents(frecuencia, mejor.frecuencia))) {
      mejor = cuerda;
    }
  }
  return mejor;
}

const NOMBRES = ["Do", "Do#", "Re", "Re#", "Mi", "Fa", "Fa#", "Sol", "Sol#", "La", "La#", "Si"];

// "La" / "Sol#" de cualquier frecuencia (La4 = 440 Hz).
export function notaMasCercana(frecuencia: number) {
  const semitonos = Math.round(12 * Math.log2(frecuencia / 440)) + 57;
  return NOMBRES[((semitonos % 12) + 12) % 12];
}

// Frecuencia fundamental de un pedazo de audio, o null si no hay una nota clara.
// Usa la autocorrelación normalizada (método de McLeod): toma el primer pico alto y no
// el más alto, para no confundir la nota con su octava (las cuerdas graves tienen
// armónicos muy fuertes).
export function detectarFrecuencia(datos: Float32Array, sampleRate: number): number | null {
  let energia = 0;
  for (const valor of datos) energia += valor * valor;
  if (Math.sqrt(energia / datos.length) < VOLUMEN_MIN) {
    return null;
  }

  const lagMin = Math.floor(sampleRate / FRECUENCIA_MAX);
  const lagMax = Math.min(Math.ceil(sampleRate / FRECUENCIA_MIN), Math.floor(datos.length / 2));
  const ventana = datos.length - lagMax;
  const nsdf = new Float32Array(lagMax + 1);
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let correlacion = 0;
    let normal = 0;
    for (let i = 0; i < ventana; i++) {
      const a = datos[i];
      const b = datos[i + lag];
      correlacion += a * b;
      normal += a * a + b * b;
    }
    nsdf[lag] = normal > 0 ? (2 * correlacion) / normal : 0;
  }

  // Picos positivos (entre cruces por cero) y el más alto de todos.
  const picos: number[] = [];
  let maximo = 0;
  let lag = lagMin;
  while (lag < lagMax && nsdf[lag] > 0) lag++;
  while (lag < lagMax) {
    while (lag < lagMax && nsdf[lag] <= 0) lag++;
    let pico = lag;
    while (lag < lagMax && nsdf[lag] > 0) {
      if (nsdf[lag] > nsdf[pico]) pico = lag;
      lag++;
    }
    if (pico < lagMax && nsdf[pico] > 0) {
      picos.push(pico);
      maximo = Math.max(maximo, nsdf[pico]);
    }
  }
  if (maximo < 0.6) {
    return null;
  }
  const elegido = picos.find((p) => nsdf[p] >= 0.9 * maximo);
  if (elegido === undefined) {
    return null;
  }

  // Ajuste fino entre muestras con una parábola por el pico.
  const izq = nsdf[elegido - 1] ?? nsdf[elegido];
  const der = nsdf[elegido + 1] ?? nsdf[elegido];
  const curva = izq - 2 * nsdf[elegido] + der;
  const corrimiento = curva !== 0 ? (0.5 * (izq - der)) / curva : 0;
  const frecuencia = sampleRate / (elegido + corrimiento);
  return frecuencia >= FRECUENCIA_MIN && frecuencia <= FRECUENCIA_MAX ? frecuencia : null;
}
