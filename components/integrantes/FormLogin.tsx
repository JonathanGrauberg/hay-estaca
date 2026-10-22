"use client";

import { useActionState, useState } from "react";
import { iniciarSesion } from "@/lib/actions/auth";
import { Avatar } from "@/components/juntadas/Avatar";
import { cn } from "@/lib/utils";

interface FormLoginProps {
  miembros: { id: string; nombre: string; apodo: string; avatarUrl: string | null }[];
}

export function FormLogin({ miembros }: FormLoginProps) {
  const [state, formAction, pending] = useActionState(iniciarSesion, undefined);
  const [elegidoId, setElegidoId] = useState<string | null>(null);

  const elegido = miembros.find((miembro) => miembro.id === elegidoId) ?? null;

  return (
    <form action={formAction} className="flex flex-col gap-6">
      <section className="flex flex-col gap-3">
        <h2 className="text-center text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          ¿QUIÉN SOS?
        </h2>
        <div className="flex flex-wrap justify-center gap-4">
          {miembros.map((miembro) => (
            <button
              key={miembro.id}
              type="button"
              onClick={() => setElegidoId(miembro.id)}
              className="flex flex-col items-center gap-1.5"
            >
              <Avatar
                nombre={miembro.nombre}
                apodo={miembro.apodo}
                avatarUrl={miembro.avatarUrl}
                className={cn(
                  miembro.id === elegidoId
                    ? "border-primary text-primary"
                    : "border-border text-muted-foreground-2"
                )}
              />
              <span
                className={cn(
                  "max-w-16 truncate text-xs",
                  miembro.id === elegidoId ? "text-foreground" : "text-muted-foreground-2"
                )}
              >
                {miembro.apodo || miembro.nombre}
              </span>
            </button>
          ))}
        </div>
      </section>

      {elegido && (
        <section className="flex flex-col gap-3">
          <input type="hidden" name="userId" value={elegido.id} />
          <label
            htmlFor="pin"
            className="text-center text-xs font-semibold tracking-[0.15em] text-muted-foreground-2"
          >
            TU PIN, {(elegido.apodo || elegido.nombre).toUpperCase()}
          </label>
          <input
            key={elegido.id}
            id="pin"
            name="pin"
            type="password"
            inputMode="numeric"
            autoComplete="current-password"
            pattern="\d{4}"
            maxLength={4}
            required
            autoFocus
            placeholder="••••"
            className="mx-auto w-40 rounded-md border border-border bg-card px-3 py-2 text-center text-2xl tracking-[0.5em] text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary"
          />
          <button
            type="submit"
            disabled={pending}
            className="rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground disabled:opacity-60"
          >
            {pending ? "Entrando…" : "Entrar"}
          </button>
        </section>
      )}

      {state?.error && <p className="text-center text-sm text-primary">{state.error}</p>}
    </form>
  );
}
