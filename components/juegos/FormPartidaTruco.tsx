"use client";

import { useActionState, useState } from "react";
import { Shuffle } from "lucide-react";
import { crearPartidaTruco, type CrearPartidaState } from "@/lib/actions/truco";
import type { Equipo } from "@/lib/juegos/truco";
import { Ayuda } from "@/components/ui/Ayuda";
import { cn } from "@/lib/utils";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

interface FormPartidaTrucoProps {
  juntadaId: string;
  // "u:<id>" o "i:<id>", como en las cuentas.
  personas: { clave: string; nombre: string; esInvitado: boolean }[];
  // Quién puede ser anotador: los que van (tienen que poder entrar a la app).
  anotadores: { id: string; nombre: string }[];
  yoId: string;
}

// Azar sin sesgo para mezclar equipos.
function azar(n: number) {
  const tope = Math.floor(2 ** 32 / n) * n;
  const caja = new Uint32Array(1);
  do {
    crypto.getRandomValues(caja);
  } while (caja[0] >= tope);
  return caja[0] % n;
}

export function FormPartidaTruco({
  juntadaId,
  personas,
  anotadores,
  yoId,
}: FormPartidaTrucoProps) {
  const [state, formAction, pending] = useActionState<
    CrearPartidaState,
    FormData
  >(crearPartidaTruco.bind(null, juntadaId), undefined);
  const [limite, setLimite] = useState<15 | 30>(30);
  const [nombres, setNombres] = useState({ nos: "Nosotros", ellos: "Ellos" });
  const [equipos, setEquipos] = useState<Record<string, Equipo | null>>({});

  const cantidad = (equipo: Equipo) =>
    Object.values(equipos).filter((e) => e === equipo).length;

  function elegir(clave: string, equipo: Equipo) {
    setEquipos((actuales) => ({
      ...actuales,
      [clave]: actuales[clave] === equipo ? null : equipo,
    }));
  }

  // Reparte al azar a los que ya están en algún equipo (mitad y mitad).
  function mezclar() {
    const jugando = Object.keys(equipos).filter((clave) => equipos[clave]);
    for (let i = jugando.length - 1; i > 0; i--) {
      const j = azar(i + 1);
      [jugando[i], jugando[j]] = [jugando[j], jugando[i]];
    }
    const mitad = Math.ceil(jugando.length / 2);
    setEquipos(
      Object.fromEntries(
        jugando.map((clave, i) => [clave, i < mitad ? "nos" : "ellos"]),
      ),
    );
  }

  const anotadorInicial = anotadores.some((a) => a.id === yoId)
    ? yoId
    : (anotadores[0]?.id ?? "");
  const jugandoTotal = cantidad("nos") + cantidad("ellos");

  return (
    <form action={formAction} className="flex flex-col gap-5">
      <div className="flex flex-col gap-1.5">
        <p className={labelClass}>¿A cuánto?</p>
        <input type="hidden" name="limite" value={limite} />
        <div className="flex gap-2">
          {([30, 15] as const).map((valor) => (
            <button
              key={valor}
              type="button"
              onClick={() => setLimite(valor)}
              aria-pressed={limite === valor}
              className={cn(
                "flex-1 rounded-full border-2 px-4 py-2 text-sm font-bold",
                limite === valor
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-primary/40 text-primary",
              )}
            >
              A {valor}
            </button>
          ))}
        </div>
      </div>

      <div className="flex gap-3">
        {(["nos", "ellos"] as const).map((equipo) => (
          <div key={equipo} className="flex flex-1 flex-col gap-1.5">
            <label htmlFor={`nombre-${equipo}`} className={labelClass}>
              Equipo {equipo === "nos" ? 1 : 2}
            </label>
            <input
              id={`nombre-${equipo}`}
              name={equipo === "nos" ? "nombreNos" : "nombreEllos"}
              type="text"
              maxLength={24}
              value={nombres[equipo]}
              onChange={(event) =>
                setNombres((n) => ({ ...n, [equipo]: event.target.value }))
              }
              className={inputClass}
            />
          </div>
        ))}
      </div>

      <fieldset className="flex flex-col gap-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <p className={labelClass}>¿Quién juega en cada equipo?</p>
            <Ayuda titulo="Equipos">
              Tocá el equipo de cada uno. Los que no toques no juegan. Con
              &quot;Mezclar al azar&quot; se reparten al azar los que elegiste.
            </Ayuda>
          </div>
          <button
            type="button"
            onClick={mezclar}
            disabled={jugandoTotal < 2}
            className="flex items-center gap-1 rounded-full bg-secondary px-2.5 py-1 text-[11px] font-semibold text-muted-foreground-2 hover:text-foreground disabled:opacity-40"
          >
            <Shuffle className="h-3.5 w-3.5" />
            Mezclar al azar
          </button>
        </div>
        {personas.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
            Todavía nadie confirmó que va a la juntada.
          </p>
        ) : (
          <ul className="flex flex-col gap-1.5">
            {personas.map((persona) => {
              const equipo = equipos[persona.clave] ?? null;
              return (
                <li
                  key={persona.clave}
                  className="flex items-center gap-2 rounded-lg bg-card px-3 py-2"
                >
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {persona.nombre}
                    {persona.esInvitado && (
                      <span className="text-muted-foreground-2"> · inv.</span>
                    )}
                  </span>
                  {equipo && (
                    <input type="hidden" name={equipo} value={persona.clave} />
                  )}
                  {(["nos", "ellos"] as const).map((opcion) => (
                    <button
                      key={opcion}
                      type="button"
                      onClick={() => elegir(persona.clave, opcion)}
                      aria-pressed={equipo === opcion}
                      className={cn(
                        "max-w-24 shrink-0 truncate rounded-full border px-3 py-1 text-xs font-semibold transition-colors",
                        equipo === opcion
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-border text-muted-foreground-2 hover:text-foreground",
                      )}
                    >
                      {nombres[opcion].trim() ||
                        (opcion === "nos" ? "Equipo 1" : "Equipo 2")}
                    </button>
                  ))}
                </li>
              );
            })}
          </ul>
        )}
        <p className="text-sm text-muted-foreground">
          {cantidad("nos")} contra {cantidad("ellos")}
        </p>
      </fieldset>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-1.5">
          <label htmlFor="anotador" className={labelClass}>
            ¿Quién anota?
          </label>
          <Ayuda titulo="Anotador">
            Solo el anotador suma los puntos, así no se pisan. Los demás la ven
            en vivo desde su celu, y el anotador se lo puede pasar a otro.
          </Ayuda>
        </div>
        <select
          id="anotador"
          name="anotador"
          defaultValue={anotadorInicial}
          className={inputClass}
        >
          {anotadores.map((anotador) => (
            <option key={anotador.id} value={anotador.id} className="bg-card">
              {anotador.nombre}
              {anotador.id === yoId ? " (vos)" : ""}
            </option>
          ))}
        </select>
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending || cantidad("nos") === 0 || cantidad("ellos") === 0}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Armando…" : "Arrancar la partida"}
      </button>
    </form>
  );
}
