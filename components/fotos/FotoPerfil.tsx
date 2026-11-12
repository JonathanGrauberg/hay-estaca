"use client";

import { Camera, Check, X } from "lucide-react";
import { guardarFotoPerfil, quitarMiFoto, responderPropuesta } from "@/lib/actions/fotos";
import { BotonSubirFoto } from "@/components/fotos/BotonSubirFoto";
import { Avatar } from "@/components/juntadas/Avatar";

interface Propuesta {
  id: string;
  ruta: string;
  de: string;
}

interface FotoPerfilProps {
  userId: string;
  nombre: string;
  apodo: string;
  avatarUrl: string | null;
  propuestas: Propuesta[];
  // Sin R2 configurado se muestra el avatar con iniciales y nada más.
  habilitado: boolean;
}

// En "Yo": mi foto (cambiar o quitar) y las que me propusieron los demás.
export function FotoPerfil({ userId, nombre, apodo, avatarUrl, propuestas, habilitado }: FotoPerfilProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <Avatar
        nombre={nombre}
        apodo={apodo}
        avatarUrl={avatarUrl}
        className="h-24 w-24 border-primary text-2xl text-primary"
      />

      {habilitado && (
        <div className="flex items-start gap-2">
          <BotonSubirFoto
            destino={{ tipo: "avatar", userId }}
            ladoMaximo={512}
            alSubir={(key) => guardarFotoPerfil(userId, key)}
            className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
          >
            <Camera className="h-3.5 w-3.5" />
            {avatarUrl ? "Cambiar foto" : "Subir foto"}
          </BotonSubirFoto>
          {avatarUrl && (
            <form action={quitarMiFoto}>
              <button
                type="submit"
                className="rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground-2 hover:text-primary"
              >
                Quitar
              </button>
            </form>
          )}
        </div>
      )}

      {propuestas.length > 0 && (
        <section className="flex w-full flex-col gap-2">
          <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
            TE PROPUSIERON {propuestas.length === 1 ? "UNA FOTO" : `${propuestas.length} FOTOS`}
          </h2>
          <ul className="flex flex-col gap-2">
            {propuestas.map((propuesta) => (
              <li
                key={propuesta.id}
                className="flex items-center gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-2.5"
              >
                <Avatar
                  nombre={nombre}
                  apodo={apodo}
                  avatarUrl={propuesta.ruta}
                  className="h-14 w-14 shrink-0 border-border"
                />
                <p className="min-w-0 flex-1 text-sm text-muted-foreground">
                  <span className="font-semibold text-foreground">{propuesta.de}</span> te propuso
                  esta foto
                </p>
                <form action={responderPropuesta.bind(null, propuesta.id, false)}>
                  <button
                    type="submit"
                    aria-label="Rechazar"
                    className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-muted-foreground-2 hover:text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </form>
                <form action={responderPropuesta.bind(null, propuesta.id, true)}>
                  <button
                    type="submit"
                    aria-label="Aceptar"
                    className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-primary-foreground"
                  >
                    <Check className="h-4 w-4" />
                  </button>
                </form>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
