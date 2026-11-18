"use client";

// Audio del juego "Al revés": grabar con el micrófono, dar vuelta y reproducir. Todo
// queda en el celu (nada se sube).

let contexto: AudioContext | null = null;

// Un solo AudioContext para todo el juego. En iPhone tiene que arrancar después de un
// toque, por eso se crea (o se despierta) recién cuando se graba o se reproduce.
export async function audioContext() {
  if (!contexto) {
    const Ctx =
      window.AudioContext ??
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    contexto = new Ctx();
  }
  if (contexto.state === "suspended") {
    await contexto.resume();
  }
  return contexto;
}

export function microfonoDisponible() {
  return (
    typeof window !== "undefined" &&
    !!navigator.mediaDevices?.getUserMedia &&
    typeof MediaRecorder !== "undefined"
  );
}

export interface Grabacion {
  // Para frenar antes del tope. Devuelve lo grabado (o null si no se oyó nada).
  frenar: () => void;
  listo: Promise<AudioBuffer | null>;
}

let microfono: MediaStream | null = null;

// El micrófono queda abierto mientras dura la partida: si se abre recién al tocar
// "Grabar", tarda en arrancar y se come el principio de la frase.
async function abrirMicrofono() {
  if (microfono && microfono.getAudioTracks().some((pista) => pista.readyState === "live")) {
    return microfono;
  }
  microfono = await navigator.mediaDevices.getUserMedia({ audio: true });
  return microfono;
}

// Al salir del juego: apaga el micrófono (se va el puntito de "grabando" del celu).
export function cerrarMicrofono() {
  microfono?.getTracks().forEach((pista) => pista.stop());
  microfono = null;
}

// Graba hasta `maxMs` (o hasta que se llame a frenar) y devuelve el audio ya
// decodificado y sin los silencios de las puntas. Resuelve recién cuando la
// grabación arrancó de verdad: recién ahí la pantalla dice "Grabando".
export async function grabar(maxMs: number): Promise<Grabacion> {
  const ctx = await audioContext();
  const stream = await abrirMicrofono();
  const recorder = new MediaRecorder(stream);
  const partes: Blob[] = [];
  recorder.ondataavailable = (evento) => {
    if (evento.data.size > 0) partes.push(evento.data);
  };

  const listo = new Promise<AudioBuffer | null>((resolve, reject) => {
    recorder.onstop = async () => {
      try {
        const blob = new Blob(partes, { type: recorder.mimeType });
        const audio = await ctx.decodeAudioData(await blob.arrayBuffer());
        resolve(recortarSilencio(ctx, audio));
      } catch (error) {
        reject(error);
      }
    };
  });

  const arranco = new Promise<void>((resolve) => {
    recorder.onstart = () => resolve();
  });
  recorder.start();
  await arranco;
  const tope = window.setTimeout(() => frenar(), maxMs);
  function frenar() {
    window.clearTimeout(tope);
    if (recorder.state !== "inactive") recorder.stop();
  }
  return { frenar, listo };
}

// Saca el silencio del principio y del final (si no, al darlo vuelta arranca mudo).
// El umbral depende de qué tan fuerte se habló, y se deja un margen generoso para no
// cortar los arranques suaves (la "h" de "hay"). null si no se oye nada.
function recortarSilencio(ctx: AudioContext, audio: AudioBuffer): AudioBuffer | null {
  const datos = audio.getChannelData(0);
  let pico = 0;
  for (const valor of datos) pico = Math.max(pico, Math.abs(valor));
  if (pico < 0.02) {
    return null;
  }
  const umbral = Math.max(0.008, pico * 0.06);
  let inicio = 0;
  while (inicio < datos.length && Math.abs(datos[inicio]) < umbral) inicio++;
  let fin = datos.length - 1;
  while (fin > inicio && Math.abs(datos[fin]) < umbral) fin--;
  if (fin - inicio < audio.sampleRate * 0.2) {
    return null;
  }
  inicio = Math.max(0, inicio - Math.floor(audio.sampleRate * 0.25));
  fin = Math.min(datos.length, fin + Math.floor(audio.sampleRate * 0.2));
  const recortado = ctx.createBuffer(audio.numberOfChannels, fin - inicio, audio.sampleRate);
  for (let canal = 0; canal < audio.numberOfChannels; canal++) {
    recortado.copyToChannel(audio.getChannelData(canal).slice(inicio, fin), canal);
  }
  return recortado;
}

export async function invertir(audio: AudioBuffer) {
  const ctx = await audioContext();
  const alReves = ctx.createBuffer(audio.numberOfChannels, audio.length, audio.sampleRate);
  for (let canal = 0; canal < audio.numberOfChannels; canal++) {
    alReves.copyToChannel(audio.getChannelData(canal).slice().reverse(), canal);
  }
  return alReves;
}

let sonando: AudioBufferSourceNode | null = null;

// Reproduce (cortando lo que estuviera sonando). Resuelve cuando termina.
export async function reproducir(audio: AudioBuffer) {
  const ctx = await audioContext();
  detener();
  const fuente = ctx.createBufferSource();
  fuente.buffer = audio;
  fuente.connect(ctx.destination);
  sonando = fuente;
  return new Promise<void>((resolve) => {
    fuente.onended = () => {
      if (sonando === fuente) sonando = null;
      resolve();
    };
    fuente.start();
  });
}

export function detener() {
  if (sonando) {
    const fuente = sonando;
    sonando = null;
    try {
      fuente.stop();
    } catch {
      // Ya había terminado.
    }
  }
}
