"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import { Minus, Plus, Smartphone } from "lucide-react";
import { cn } from "@/lib/utils";

const DURACION_MS = 1400;
const MAX_DADOS = 6;
const HISTORIAL = 6;

// Dónde van los puntos de cada cara en la grilla de 3x3 (0 arriba a la izquierda).
const PUNTOS: Record<number, number[]> = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8],
};

// Cuánto hay que girar el cubo para que la cara quede de frente (ver .dado-cara).
const GIRO_CARA: Record<number, { x: number; y: number }> = {
  1: { x: 0, y: 0 },
  6: { x: 0, y: 180 },
  3: { x: 0, y: -90 },
  4: { x: 0, y: 90 },
  5: { x: -90, y: 0 },
  2: { x: 90, y: 0 },
};

// Azar de verdad (crypto) y sin sesgo: se descartan los números que no reparten parejo.
function azar(n: number) {
  const tope = Math.floor(2 ** 32 / n) * n;
  const caja = new Uint32Array(1);
  do {
    crypto.getRandomValues(caja);
  } while (caja[0] >= tope);
  return caja[0] % n;
}

// El ángulo nuevo, siempre hacia adelante: varias vueltas enteras + lo que falta para
// caer en la cara pedida.
function girarHasta(actual: number, destino: number, vueltas: number) {
  const falta = (((destino - actual) % 360) + 360) % 360;
  return actual + vueltas * 360 + falta;
}

interface EstadoDado {
  valor: number;
  x: number;
  y: number;
}

function dadoInicial(valor: number): EstadoDado {
  return { valor, ...GIRO_CARA[valor] };
}

export function Dados() {
  const [dados, setDados] = useState<EstadoDado[]>([
    dadoInicial(5),
    dadoInicial(3),
  ]);
  const [tirando, setTirando] = useState(false);
  // Cambia en cada tirada: reinicia la animación del salto.
  const [tirada, setTirada] = useState(0);
  const [historial, setHistorial] = useState<number[][]>([]);
  const [agitar, setAgitar] = useState<"no" | "si" | "sin-permiso">("no");
  const fin = useRef<ReturnType<typeof setTimeout>>(null);

  const tirar = useCallback(() => {
    if (tirando) {
      return;
    }
    const valores = dados.map(() => azar(6) + 1);
    setDados((actuales) =>
      actuales.map((dado, i) => {
        const destino = GIRO_CARA[valores[i]];
        return {
          valor: valores[i],
          x: girarHasta(dado.x, destino.x, 2 + azar(3)),
          y: girarHasta(dado.y, destino.y, 2 + azar(3)),
        };
      }),
    );
    setTirando(true);
    setTirada((n) => n + 1);
    fin.current = setTimeout(() => {
      setTirando(false);
      setHistorial((h) => [valores, ...h].slice(0, HISTORIAL));
      navigator.vibrate?.(40);
    }, DURACION_MS);
  }, [dados, tirando]);

  useEffect(
    () => () => {
      if (fin.current) {
        clearTimeout(fin.current);
      }
    },
    [],
  );

  // Agitar el celu tira los dados. En iPhone hay que pedir permiso con un toque.
  const tirarRef = useRef(tirar);
  useEffect(() => {
    tirarRef.current = tirar;
  }, [tirar]);
  useEffect(() => {
    if (agitar !== "si") {
      return;
    }
    let ultimo = 0;
    function alMover(evento: DeviceMotionEvent) {
      const a = evento.accelerationIncludingGravity;
      if (!a || a.x === null || a.y === null || a.z === null) {
        return;
      }
      const fuerza = Math.hypot(a.x, a.y, a.z);
      const ahora = Date.now();
      if (fuerza > 25 && ahora - ultimo > DURACION_MS + 300) {
        ultimo = ahora;
        tirarRef.current();
      }
    }
    window.addEventListener("devicemotion", alMover);
    return () => window.removeEventListener("devicemotion", alMover);
  }, [agitar]);

  async function activarAgitar() {
    if (agitar === "si") {
      setAgitar("no");
      return;
    }
    const conPermiso = DeviceMotionEvent as unknown as {
      requestPermission?: () => Promise<"granted" | "denied">;
    };
    if (typeof conPermiso.requestPermission === "function") {
      try {
        const respuesta = await conPermiso.requestPermission();
        setAgitar(respuesta === "granted" ? "si" : "sin-permiso");
      } catch {
        setAgitar("sin-permiso");
      }
      return;
    }
    setAgitar("si");
  }

  function cambiarCantidad(delta: number) {
    setDados((actuales) => {
      const cantidad = Math.min(
        MAX_DADOS,
        Math.max(1, actuales.length + delta),
      );
      if (cantidad > actuales.length) {
        return [...actuales, dadoInicial(azar(6) + 1)];
      }
      return actuales.slice(0, cantidad);
    });
    setHistorial([]);
  }

  const total = dados.reduce((suma, dado) => suma + dado.valor, 0);
  // Más dados, más chicos, para que entren de a 3 por fila en el celu.
  const lado =
    dados.length <= 2 ? "6.5rem" : dados.length <= 3 ? "5.25rem" : "4.5rem";

  return (
    <div className="flex flex-1 flex-col items-center gap-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => cambiarCantidad(-1)}
          disabled={tirando || dados.length <= 1}
          aria-label="Un dado menos"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-30"
        >
          <Minus className="h-4 w-4" />
        </button>
        <p className="w-24 text-center text-sm font-semibold text-foreground">
          {dados.length} {dados.length === 1 ? "dado" : "dados"}
        </p>
        <button
          type="button"
          onClick={() => cambiarCantidad(1)}
          disabled={tirando || dados.length >= MAX_DADOS}
          aria-label="Un dado más"
          className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-foreground disabled:opacity-30"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      {/* La mesa: tocarla también tira. */}
      <button
        type="button"
        onClick={tirar}
        aria-label="Tirar los dados"
        className="flex min-h-64 w-full flex-wrap content-center items-center justify-center gap-x-6 gap-y-10 rounded-2xl border border-border bg-[radial-gradient(ellipse_at_center,#1f1a17,#0f0d0c_70%)] px-4 py-12"
        style={{ "--lado": lado } as CSSProperties}
      >
        {dados.map((dado, i) => (
          <span key={i} className="relative flex flex-col items-center">
            {/* Sin key: si se recreara, el cubo aparecería ya en la cara final sin girar.
                El salto se reinicia alternando entre dos animaciones iguales. */}
            <span
              className={cn(
                "dado-escena block",
                tirada > 0 && (tirada % 2 ? "dado-salto" : "dado-salto-bis"),
              )}
              style={{ animationDelay: `${i * 40}ms` }}
            >
              <span
                className="dado block"
                style={{
                  transform: `rotateX(${dado.x}deg) rotateY(${dado.y}deg)`,
                  transitionDelay: `${i * 40}ms`,
                }}
              >
                {[1, 2, 3, 4, 5, 6].map((cara) => (
                  <span key={cara} className="dado-cara" data-cara={cara}>
                    {Array.from({ length: 9 }, (_, celda) =>
                      PUNTOS[cara].includes(celda) ? (
                        <span
                          key={celda}
                          className={cn("dado-punto", cara === 1 && "as")}
                          style={{
                            gridArea: `${Math.floor(celda / 3) + 1} / ${(celda % 3) + 1}`,
                          }}
                        />
                      ) : null,
                    )}
                  </span>
                ))}
              </span>
            </span>
            <span
              key={`sombra-${tirada}`}
              className={cn(
                "absolute -bottom-5 h-3 w-4/5 rounded-[50%] bg-black blur-sm",
                tirada > 0 && "dado-sombra",
              )}
              style={{ opacity: 0.6, animationDelay: `${i * 40}ms` }}
            />
          </span>
        ))}
      </button>

      <div
        className="flex h-16 flex-col items-center justify-center"
        aria-live="polite"
      >
        {tirando ? (
          <p className="text-sm text-muted-foreground-2">Rodando…</p>
        ) : tirada > 0 ? (
          <>
            <p className="font-heading text-5xl leading-none tracking-wide text-primary">
              {total}
            </p>
            {dados.length > 1 && (
              <p className="text-xs text-muted-foreground-2">
                {dados.map((dado) => dado.valor).join(" + ")}
              </p>
            )}
          </>
        ) : (
          <p className="text-sm text-muted-foreground-2">
            Tocá la mesa o el botón para tirar
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={tirar}
        disabled={tirando}
        className="w-full max-w-xs rounded-full bg-primary px-6 py-3.5 text-base font-semibold text-primary-foreground disabled:opacity-60"
      >
        {tirando ? "Tirando…" : "Tirar"}
      </button>

      <button
        type="button"
        onClick={activarAgitar}
        className={cn(
          "flex items-center gap-2 rounded-full border px-4 py-1.5 text-xs font-semibold",
          agitar === "si"
            ? "border-primary bg-primary/10 text-foreground"
            : "border-border text-muted-foreground",
        )}
      >
        <Smartphone className="h-4 w-4" />
        {agitar === "si"
          ? "Agitá el celu para tirar (activado)"
          : agitar === "sin-permiso"
            ? "Sin permiso para agitar: probá de nuevo"
            : "Tirar agitando el celu"}
      </button>

      {historial.length > 1 && (
        <section className="flex w-full flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            ÚLTIMAS TIRADAS
          </h2>
          <ul className="flex flex-wrap gap-2">
            {historial.slice(1).map((valores, i) => (
              <li
                key={i}
                className="rounded-lg bg-card px-3 py-1.5 text-sm text-muted-foreground"
                title={valores.join(" + ")}
              >
                <span className="font-semibold text-foreground">
                  {valores.reduce((a, b) => a + b, 0)}
                </span>
                {valores.length > 1 && (
                  <span className="text-xs text-muted-foreground-2">
                    {" "}
                    ({valores.join("·")})
                  </span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
