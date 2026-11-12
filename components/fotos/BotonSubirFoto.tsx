"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import type { Destino, FotoState } from "@/lib/actions/fotos";
import { subirFoto } from "@/lib/fotos/subir";
import { cn } from "@/lib/utils";

interface BotonSubirFotoProps {
  destino: Destino;
  // 512 para fotos de perfil, 1440 para historias.
  ladoMaximo: number;
  // Qué hacer con la foto ya subida (guardar avatar, proponer, publicar historia).
  alSubir: (key: string) => Promise<FotoState>;
  className?: string;
  children: ReactNode;
}

// Botón que abre la galería o la cámara, achica la foto, la sube y avisa cómo salió.
export function BotonSubirFoto({ destino, ladoMaximo, alSubir, className, children }: BotonSubirFotoProps) {
  const input = useRef<HTMLInputElement>(null);
  const [pending, startTransition] = useTransition();
  const [estado, setEstado] = useState<FotoState>(undefined);

  function elegida(archivo: File | undefined) {
    if (!archivo) {
      return;
    }
    setEstado(undefined);
    startTransition(async () => {
      const subida = await subirFoto(archivo, destino, ladoMaximo);
      setEstado("error" in subida ? subida : await alSubir(subida.key));
    });
  }

  return (
    <div className="flex flex-col gap-1.5">
      <input
        ref={input}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(event) => {
          elegida(event.target.files?.[0]);
          // Para poder elegir la misma foto de nuevo si falló.
          event.target.value = "";
        }}
      />
      <button
        type="button"
        disabled={pending}
        onClick={() => input.current?.click()}
        className={cn("disabled:opacity-60", className)}
      >
        {pending ? "Subiendo…" : children}
      </button>
      {estado && (
        <p className={cn("text-xs", "error" in estado ? "text-primary" : "text-muted-foreground")}>
          {"error" in estado ? estado.error : estado.ok}
        </p>
      )}
    </div>
  );
}
