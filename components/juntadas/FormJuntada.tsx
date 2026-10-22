"use client";

import { useActionState } from "react";
import type { GuardarJuntadaState } from "@/lib/actions/juntadas";

const inputClass =
  "w-full rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const labelClass = "text-sm font-medium text-foreground";

export interface ValoresJuntada {
  nombre: string;
  /** YYYY-MM-DD, como lo espera el input type="date". */
  fecha: string;
  hora: string;
  ubicacion: string;
  mensajeFomo: string;
  anfitrionId: string;
}

interface FormJuntadaProps {
  // crearJuntada para /juntadas/nueva, editarJuntada (con el id bindeado) para editar.
  accion: (prevState: GuardarJuntadaState, formData: FormData) => Promise<GuardarJuntadaState>;
  miembros: { id: string; nombre: string; apodo: string }[];
  valores?: ValoresJuntada;
  labelBoton: string;
}

export function FormJuntada({ accion, miembros, valores, labelBoton }: FormJuntadaProps) {
  const [state, formAction, pending] = useActionState(accion, undefined);

  return (
    <form action={formAction} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nombre" className={labelClass}>
          Nombre
        </label>
        <input
          id="nombre"
          name="nombre"
          type="text"
          required
          defaultValue={valores?.nombre}
          placeholder="Ej: Asado en lo de Facu"
          className={inputClass}
        />
      </div>

      <div className="flex gap-3">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="fecha" className={labelClass}>
            Fecha
          </label>
          <input
            id="fecha"
            name="fecha"
            type="date"
            required
            defaultValue={valores?.fecha}
            className={inputClass}
          />
        </div>
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="hora" className={labelClass}>
            Hora
          </label>
          <input
            id="hora"
            name="hora"
            type="time"
            required
            defaultValue={valores?.hora}
            className={inputClass}
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="ubicacion" className={labelClass}>
          Ubicación
        </label>
        <input
          id="ubicacion"
          name="ubicacion"
          type="text"
          required
          defaultValue={valores?.ubicacion}
          placeholder="Ej: Casa de Toto"
          className={inputClass}
        />
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="anfitrionId" className={labelClass}>
          Anfitrión <span className="text-muted-foreground-2">(opcional)</span>
        </label>
        <select
          id="anfitrionId"
          name="anfitrionId"
          defaultValue={valores?.anfitrionId ?? ""}
          className={inputClass}
        >
          <option value="" className="bg-card">
            Nadie en particular
          </option>
          {miembros.map((miembro) => (
            <option key={miembro.id} value={miembro.id} className="bg-card">
              {miembro.apodo || miembro.nombre}
            </option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="mensajeFomo" className={labelClass}>
          Mensaje FOMO <span className="text-muted-foreground-2">(opcional)</span>
        </label>
        <input
          id="mensajeFomo"
          name="mensajeFomo"
          type="text"
          defaultValue={valores?.mensajeFomo}
          placeholder="Ej: vaca abierta 🎂"
          className={inputClass}
        />
      </div>

      {state?.error && <p className="text-sm text-primary">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="mt-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : labelBoton}
      </button>
    </form>
  );
}
