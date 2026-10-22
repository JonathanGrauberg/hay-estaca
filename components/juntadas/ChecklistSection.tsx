"use client";

import { useState } from "react";
import type { TipoChecklistItem } from "@/app/generated/prisma/enums";
import { useQuienSos } from "@/components/QuienSosProvider";
import {
  ChecklistItemRow,
  type ChecklistItemConAsignado,
} from "@/components/juntadas/ChecklistItemRow";
import { FormAgregarItem } from "@/components/juntadas/FormAgregarItem";
import { cn } from "@/lib/utils";

interface ChecklistSectionProps {
  juntadaId: string;
  items: ChecklistItemConAsignado[];
  miembros: { id: string; nombre: string; apodo: string }[];
}

const TABS: { tipo: TipoChecklistItem; label: string }[] = [
  { tipo: "grupal", label: "Grupal" },
  { tipo: "individual", label: "Individual" },
];

export function ChecklistSection({ juntadaId, items, miembros }: ChecklistSectionProps) {
  const { quienSoyId } = useQuienSos();
  const [tab, setTab] = useState<TipoChecklistItem>("grupal");

  const itemsFiltrados = items.filter((item) => item.tipo === tab);

  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
          CHECKLIST
        </h2>
        <div className="flex rounded-full bg-card p-0.5">
          {TABS.map((t) => (
            <button
              key={t.tipo}
              type="button"
              onClick={() => setTab(t.tipo)}
              className={cn(
                "rounded-full px-3 py-1 text-xs font-semibold transition-colors",
                tab === t.tipo ? "bg-primary text-primary-foreground" : "text-muted-foreground-2"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {itemsFiltrados.length > 0 && (
        <ul className="flex flex-col gap-2">
          {itemsFiltrados.map((item) => (
            <ChecklistItemRow
              key={item.id}
              juntadaId={juntadaId}
              item={item}
              miembros={miembros}
              quienSoyId={quienSoyId}
            />
          ))}
        </ul>
      )}

      <FormAgregarItem key={tab} juntadaId={juntadaId} tipo={tab} />
    </section>
  );
}
