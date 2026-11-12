"use client";

import { Camera } from "lucide-react";
import { guardarFotoPerfil } from "@/lib/actions/fotos";
import { BotonSubirFoto } from "@/components/fotos/BotonSubirFoto";

// En el perfil de otro: le proponés una foto y la acepta o la rechaza desde "Yo".
export function ProponerFoto({ userId, apodo }: { userId: string; apodo: string }) {
  return (
    <BotonSubirFoto
      destino={{ tipo: "avatar", userId }}
      ladoMaximo={512}
      alSubir={(key) => guardarFotoPerfil(userId, key)}
      className="flex items-center gap-1.5 rounded-full bg-secondary px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground"
    >
      <Camera className="h-3.5 w-3.5" />
      Proponerle una foto a {apodo}
    </BotonSubirFoto>
  );
}
