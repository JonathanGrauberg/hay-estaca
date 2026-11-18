"use client";

import { useEffect, useRef, useState } from "react";
import {
  Check,
  EyeOff,
  Mic,
  Play,
  RotateCcw,
  Square,
  Trophy,
  X,
} from "lucide-react";
import {
  cerrarMicrofono,
  detener,
  grabar,
  invertir,
  microfonoDisponible,
  reproducir,
  type Grabacion,
} from "@/lib/juegos/audio-reves";
import { Avatar } from "@/components/juntadas/Avatar";
import { Ayuda } from "@/components/ui/Ayuda";
import { cn } from "@/lib/utils";

const MAX_ORIGINAL_MS = 7000;
// Al imitar al revés se tarda un poco más.
const MAX_IMITACION_MS = 10000;

export interface JugadorAlReves {
  id: string;
  nombre: string;
  apodo: string;
  avatarUrl: string | null;
}

type Fase = "original" | "imitar" | "resultado";

interface Turno {
  numero: number;
  fase: Fase;
  frase: string;
  original: AudioBuffer | null;
  originalAlReves: AudioBuffer | null;
  imitacion: AudioBuffer | null;
  imitacionAlDerecho: AudioBuffer | null;
  fraseVisible: boolean;
}

const turnoNuevo = (numero: number): Turno => ({
  numero,
  fase: "original",
  frase: "",
  original: null,
  originalAlReves: null,
  imitacion: null,
  imitacionAlDerecho: null,
  fraseVisible: false,
});

const nombreDe = (j: JugadorAlReves) => j.apodo || j.nombre;

const botonPrincipal =
  "flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-bold text-primary-foreground active:scale-95 disabled:opacity-50";
const botonSecundario =
  "flex items-center justify-center gap-2 rounded-full border border-border px-4 py-2.5 text-sm font-semibold text-foreground hover:bg-accent disabled:opacity-50";

export function AlReves({ integrantes }: { integrantes: JugadorAlReves[] }) {
  const [jugadores, setJugadores] = useState<JugadorAlReves[] | null>(null);
  const [puntos, setPuntos] = useState<Record<string, number>>({});
  const [turno, setTurno] = useState<Turno>(turnoNuevo(0));
  const [soportado, setSoportado] = useState(true);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- solo existe en el navegador
    setSoportado(microfonoDisponible());
    return () => {
      detener();
      cerrarMicrofono();
    };
  }, []);

  if (!soportado) {
    return (
      <p className="rounded-lg bg-card px-4 py-3 text-sm text-muted-foreground">
        Este navegador no deja grabar audio. Probá desde Chrome o Safari actualizados.
      </p>
    );
  }

  if (!jugadores) {
    return (
      <ElegirJugadores
        integrantes={integrantes}
        empezar={(elegidos) => {
          setJugadores(elegidos);
          setPuntos(Object.fromEntries(elegidos.map((j) => [j.id, 0])));
          setTurno(turnoNuevo(0));
        }}
      />
    );
  }

  const n = jugadores.length;
  const graba = jugadores[turno.numero % n];
  const imita = jugadores[(turno.numero + 1) % n];

  function actualizar(cambios: Partial<Turno>) {
    setTurno((actual) => ({ ...actual, ...cambios }));
  }

  function decidir(salio: boolean) {
    detener();
    if (salio) {
      setPuntos((actuales) => ({ ...actuales, [imita.id]: (actuales[imita.id] ?? 0) + 1 }));
      navigator.vibrate?.([40, 60, 40]);
    }
    setTurno(turnoNuevo(turno.numero + 1));
  }

  return (
    <div className="flex flex-col gap-5">
      <Marcador
        jugadores={jugadores}
        puntos={puntos}
        graba={graba.id}
        imita={imita.id}
        terminar={() => {
          if (window.confirm("¿Terminar la partida? Se pierden los puntos.")) {
            detener();
            cerrarMicrofono();
            setJugadores(null);
          }
        }}
      />

      {turno.fase === "original" && (
        <FaseOriginal
          key={turno.numero}
          graba={graba}
          imita={imita}
          turno={turno}
          actualizar={actualizar}
        />
      )}
      {turno.fase === "imitar" && (
        <FaseImitar graba={graba} imita={imita} turno={turno} actualizar={actualizar} />
      )}
      {turno.fase === "resultado" && (
        <FaseResultado
          graba={graba}
          imita={imita}
          turno={turno}
          actualizar={actualizar}
          decidir={decidir}
        />
      )}
    </div>
  );
}

function ElegirJugadores({
  integrantes,
  empezar,
}: {
  integrantes: JugadorAlReves[];
  empezar: (jugadores: JugadorAlReves[]) => void;
}) {
  // En el orden en que se tocan: así se van pasando el celu.
  const [elegidos, setElegidos] = useState<string[]>([]);
  const porId = new Map(integrantes.map((i) => [i.id, i]));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-start gap-2 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <p className="min-w-0 flex-1 text-sm text-muted-foreground">
          Uno graba una frase, el otro la escucha <b className="text-foreground">al revés</b> y
          la tiene que imitar. Después la app da vuelta la imitación: si se entiende la frase,
          punto.
        </p>
        <Ayuda titulo="Cómo se juega">
          Se juega con un solo celu que se van pasando. El que graba escribe la frase (queda
          oculta hasta el final) y la graba, de hasta 7 segundos. El siguiente escucha el audio
          al revés todas las veces que quiera y graba su imitación. La app la da vuelta: si
          suena como la frase original, el que grabó decide si vale el punto. Después le toca
          grabar al que imitó. Nada se sube a internet.
        </Ayuda>
      </div>
      <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
        ¿QUIÉNES JUEGAN? (EN ORDEN)
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {integrantes.map((integrante) => {
          const orden = elegidos.indexOf(integrante.id);
          const marcado = orden >= 0;
          return (
            <li key={integrante.id}>
              <button
                type="button"
                onClick={() =>
                  setElegidos((actual) =>
                    marcado ? actual.filter((id) => id !== integrante.id) : [...actual, integrante.id],
                  )
                }
                aria-pressed={marcado}
                className={cn(
                  "relative flex w-full flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors",
                  marcado ? "border-primary bg-primary/10" : "border-transparent hover:bg-accent",
                )}
              >
                <Avatar
                  nombre={integrante.nombre}
                  apodo={integrante.apodo}
                  avatarUrl={integrante.avatarUrl}
                  className={cn(
                    "h-12 w-12",
                    marcado ? "border-primary text-primary" : "border-border text-muted-foreground",
                  )}
                />
                <span
                  className={cn(
                    "w-full truncate text-center text-xs",
                    marcado ? "font-semibold text-foreground" : "text-muted-foreground",
                  )}
                >
                  {nombreDe(integrante)}
                </span>
                {marcado && (
                  <span className="absolute right-2 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[11px] font-bold text-primary-foreground">
                    {orden + 1}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        disabled={elegidos.length < 2}
        onClick={() => empezar(elegidos.map((id) => porId.get(id)!))}
        className={botonPrincipal}
      >
        {elegidos.length < 2 ? "Elegí al menos 2" : `Empezar con ${elegidos.length}`}
      </button>
    </div>
  );
}

function Marcador({
  jugadores,
  puntos,
  graba,
  imita,
  terminar,
}: {
  jugadores: JugadorAlReves[];
  puntos: Record<string, number>;
  graba: string;
  imita: string;
  terminar: () => void;
}) {
  const maximo = Math.max(...jugadores.map((j) => puntos[j.id] ?? 0));
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex gap-2 overflow-x-auto pb-1">
        {jugadores.map((j) => {
          const p = puntos[j.id] ?? 0;
          const enTurno = j.id === graba || j.id === imita;
          return (
            <li
              key={j.id}
              className={cn(
                "flex shrink-0 items-center gap-2 rounded-full border py-1 pl-1 pr-3",
                enTurno ? "border-primary bg-primary/10" : "border-border bg-card",
              )}
            >
              <Avatar
                nombre={j.nombre}
                apodo={j.apodo}
                avatarUrl={j.avatarUrl}
                className="h-7 w-7 border text-[10px]"
              />
              <span className="text-xs font-semibold text-foreground">{nombreDe(j)}</span>
              <span
                className={cn(
                  "flex items-center gap-0.5 text-sm font-bold",
                  p > 0 && p === maximo ? "text-primary" : "text-muted-foreground",
                )}
              >
                {p > 0 && p === maximo && <Trophy className="h-3 w-3" />}
                {p}
              </span>
            </li>
          );
        })}
      </ul>
      <button
        type="button"
        onClick={terminar}
        className="self-end text-xs text-muted-foreground-2 hover:text-foreground"
      >
        Terminar partida
      </button>
    </div>
  );
}

function Titulo({ jugador, texto }: { jugador: JugadorAlReves; texto: string }) {
  return (
    <div className="flex items-center gap-3">
      <Avatar
        nombre={jugador.nombre}
        apodo={jugador.apodo}
        avatarUrl={jugador.avatarUrl}
        className="h-12 w-12 border-primary text-primary"
      />
      <div className="min-w-0 flex-1">
        <p className="font-heading text-3xl leading-none tracking-wide text-foreground">
          {nombreDe(jugador).toUpperCase()}
        </p>
        <p className="text-sm text-muted-foreground">{texto}</p>
      </div>
    </div>
  );
}

// Botón de grabar con cuenta regresiva. Avisa cuando hay audio.
function Grabador({
  maxMs,
  hayAudio,
  listo,
}: {
  maxMs: number;
  hayAudio: boolean;
  listo: (audio: AudioBuffer) => void;
}) {
  const [estado, setEstado] = useState<"quieto" | "preparando" | "grabando" | "procesando">("quieto");
  const [transcurrido, setTranscurrido] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const grabacion = useRef<Grabacion | null>(null);
  const reloj = useRef<number | null>(null);

  useEffect(
    () => () => {
      grabacion.current?.frenar();
      if (reloj.current) window.clearInterval(reloj.current);
    },
    [],
  );

  async function empezar() {
    setError(null);
    detener();
    setEstado("preparando");
    try {
      const g = await grabar(maxMs);
      grabacion.current = g;
      setEstado("grabando");
      const inicio = Date.now();
      setTranscurrido(0);
      reloj.current = window.setInterval(() => setTranscurrido(Date.now() - inicio), 100);
      const audio = await g.listo;
      if (reloj.current) window.clearInterval(reloj.current);
      setEstado("quieto");
      if (!audio) {
        setError("No se escuchó nada. Acercate al celu y probá de nuevo.");
        return;
      }
      listo(audio);
    } catch (e) {
      if (reloj.current) window.clearInterval(reloj.current);
      setEstado("quieto");
      const nombre = e instanceof DOMException ? e.name : "";
      setError(
        nombre === "NotAllowedError"
          ? "Hay que darle permiso al micrófono (en la configuración del navegador)."
          : "No se pudo grabar. Probá de nuevo.",
      );
    }
  }

  function frenar() {
    setEstado("procesando");
    grabacion.current?.frenar();
  }

  const segundos = Math.max(0, Math.ceil((maxMs - transcurrido) / 1000));

  return (
    <div className="flex flex-col gap-2">
      {estado === "grabando" ? (
        <button type="button" onClick={frenar} className={cn(botonPrincipal, "animate-pulse")}>
          <Square className="h-5 w-5 fill-current" />
          ¡Hablá! Cortar ({segundos}s)
        </button>
      ) : (
        <button
          type="button"
          disabled={estado === "procesando" || estado === "preparando"}
          onClick={empezar}
          className={hayAudio ? botonSecundario : botonPrincipal}
        >
          {hayAudio ? <RotateCcw className="h-4 w-4" /> : <Mic className="h-5 w-5" />}
          {estado === "preparando"
            ? "Preparando el micrófono…"
            : estado === "procesando"
              ? "Procesando…"
              : hayAudio
                ? "Grabar de nuevo"
                : "Grabar"}
        </button>
      )}
      {estado === "grabando" && (
        <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
          <div
            className="h-full rounded-full bg-primary transition-[width] duration-100"
            style={{ width: `${Math.min(100, (transcurrido / maxMs) * 100)}%` }}
          />
        </div>
      )}
      {error && <p className="text-sm text-primary">{error}</p>}
    </div>
  );
}

function BotonEscuchar({
  audio,
  texto,
  grande = false,
}: {
  audio: AudioBuffer | null;
  texto: string;
  grande?: boolean;
}) {
  const [sonando, setSonando] = useState(false);
  return (
    <button
      type="button"
      disabled={!audio}
      onClick={async () => {
        if (!audio) return;
        if (sonando) {
          detener();
          setSonando(false);
          return;
        }
        setSonando(true);
        await reproducir(audio);
        setSonando(false);
      }}
      className={grande ? botonPrincipal : botonSecundario}
    >
      {sonando ? <Square className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current" />}
      {sonando ? "Parar" : texto}
      {audio && !sonando && (
        <span className="text-xs font-normal opacity-70">{audio.duration.toFixed(1)}s</span>
      )}
    </button>
  );
}

interface FaseProps {
  graba: JugadorAlReves;
  imita: JugadorAlReves;
  turno: Turno;
  actualizar: (cambios: Partial<Turno>) => void;
}

function FaseOriginal({ graba, imita, turno, actualizar }: FaseProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-card px-4 py-4">
      <Titulo jugador={graba} texto={`Grabás vos. Que ${nombreDe(imita)} no mire ni escuche 🙈`} />

      <label className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          1. Escribí la frase que vas a decir
        </span>
        <input
          type="text"
          value={turno.frase}
          onChange={(e) => actualizar({ frase: e.target.value.slice(0, 80) })}
          placeholder='Ej: "Hay peña el sábado"'
          autoComplete="off"
          className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
        />
        <span className="flex items-center gap-1 text-xs text-muted-foreground-2">
          <EyeOff className="h-3 w-3" /> Queda oculta hasta el final, para que no haya discusión.
        </span>
      </label>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          2. Grabala (hasta 7 segundos)
        </span>
        <Grabador
          maxMs={MAX_ORIGINAL_MS}
          hayAudio={!!turno.original}
          listo={async (audio) =>
            actualizar({ original: audio, originalAlReves: await invertir(audio) })
          }
        />
        {turno.original && <BotonEscuchar audio={turno.original} texto="Escuchar cómo quedó" />}
      </div>

      <button
        type="button"
        disabled={!turno.original || !turno.frase.trim()}
        onClick={() => {
          detener();
          actualizar({ fase: "imitar" });
        }}
        className={botonPrincipal}
      >
        {!turno.frase.trim()
          ? "Falta escribir la frase"
          : !turno.original
            ? "Falta grabarla"
            : `Listo: pasale el celu a ${nombreDe(imita)}`}
      </button>
    </section>
  );
}

function FaseImitar({ imita, turno, actualizar }: FaseProps) {
  return (
    <section className="flex flex-col gap-4 rounded-lg bg-card px-4 py-4">
      <Titulo jugador={imita} texto="Escuchá la frase al revés e imitala tal cual suena" />

      <BotonEscuchar audio={turno.originalAlReves} texto="Escuchar al revés" grande />
      <p className="-mt-2 text-center text-xs text-muted-foreground-2">
        Escuchala las veces que quieras.
      </p>

      <div className="flex flex-col gap-1.5">
        <span className="text-xs font-semibold text-muted-foreground">
          Grabá tu imitación (hasta 10 segundos)
        </span>
        <Grabador
          maxMs={MAX_IMITACION_MS}
          hayAudio={!!turno.imitacion}
          listo={async (audio) =>
            actualizar({ imitacion: audio, imitacionAlDerecho: await invertir(audio) })
          }
        />
        {turno.imitacion && <BotonEscuchar audio={turno.imitacion} texto="Escuchar mi imitación" />}
      </div>

      <button
        type="button"
        disabled={!turno.imitacion}
        onClick={() => {
          detener();
          actualizar({ fase: "resultado" });
        }}
        className={botonPrincipal}
      >
        <RotateCcw className="h-5 w-5" />
        Dar vuelta y escuchar
      </button>
    </section>
  );
}

function FaseResultado({
  graba,
  imita,
  turno,
  actualizar,
  decidir,
}: FaseProps & { decidir: (salio: boolean) => void }) {
  // Apenas se entra, suena la imitación dada vuelta: el momento del juego.
  useEffect(() => {
    if (turno.imitacionAlDerecho) void reproducir(turno.imitacionAlDerecho);
    return () => detener();
  }, [turno.imitacionAlDerecho]);

  return (
    <section className="flex flex-col gap-4 rounded-lg border-2 border-primary bg-card px-4 py-4">
      <p className="text-center font-heading text-3xl tracking-wide text-foreground">
        ¿SE ENTIENDE?
      </p>

      <BotonEscuchar
        audio={turno.imitacionAlDerecho}
        texto={`La de ${nombreDe(imita)}, dada vuelta`}
        grande
      />
      <BotonEscuchar audio={turno.original} texto={`El original de ${nombreDe(graba)}`} />

      {turno.fraseVisible ? (
        <div className="sobre-abierto rounded-lg bg-background px-4 py-3 text-center">
          <p className="text-xs text-muted-foreground-2">La frase era</p>
          <p className="text-lg font-bold text-foreground">&quot;{turno.frase.trim()}&quot;</p>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => actualizar({ fraseVisible: true })}
          className="rounded-lg border-2 border-dashed border-primary/50 px-4 py-3 text-sm font-semibold text-foreground hover:border-primary"
        >
          Ver la frase
        </button>
      )}

      <div className="flex flex-col gap-2 border-t border-border pt-3">
        <p className="text-center text-sm text-muted-foreground">
          Decide <b className="text-foreground">{nombreDe(graba)}</b>: ¿salió?
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => decidir(false)}
            className={cn(botonSecundario, "flex-1")}
          >
            <X className="h-4 w-4" />
            No
          </button>
          <button
            type="button"
            onClick={() => decidir(true)}
            className={cn(botonPrincipal, "flex-[2]")}
          >
            <Check className="h-5 w-5" />
            Sí, punto para {nombreDe(imita)}
          </button>
        </div>
        <p className="text-center text-xs text-muted-foreground-2">
          Después graba {nombreDe(imita)}.
        </p>
      </div>
    </section>
  );
}
