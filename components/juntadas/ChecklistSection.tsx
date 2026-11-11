import type { TipoChecklistItem } from "@/app/generated/prisma/enums";
import {
  ChecklistItemRow,
  type ChecklistItemConAsignado,
} from "@/components/juntadas/ChecklistItemRow";
import { FormAgregarItem } from "@/components/juntadas/FormAgregarItem";

interface ChecklistSectionProps {
  juntadaId: string;
  items: ChecklistItemConAsignado[];
  miembros: { id: string; nombre: string; apodo: string }[];
  usuarioActualId: string;
}

// Las dos listas a la vista: lo grupal (alguien se encarga) y lo que cada uno tiene
// que llevar para sí.
const SECCIONES: { tipo: TipoChecklistItem; titulo: string; ayuda: string }[] = [
  { tipo: "grupal", titulo: "LO QUE HAY QUE LLEVAR", ayuda: "Cada cosa la lleva alguien del grupo." },
  { tipo: "individual", titulo: "CADA UNO LLEVA LO SUYO", ayuda: "Lo que tiene que traer cada uno." },
];

export function ChecklistSection({ juntadaId, items, miembros, usuarioActualId }: ChecklistSectionProps) {
  return (
    <div className="flex flex-col gap-6">
      {SECCIONES.map((seccion) => {
        const itemsSeccion = items.filter((item) => item.tipo === seccion.tipo);
        return (
          <section key={seccion.tipo} className="flex flex-col gap-3">
            <div className="flex flex-col gap-0.5">
              <h2 className="text-xs font-semibold tracking-[0.15em] text-muted-foreground-2">
                {seccion.titulo}
              </h2>
              <p className="text-xs text-muted-foreground-2">{seccion.ayuda}</p>
            </div>

            {itemsSeccion.length > 0 && (
              <ul className="flex flex-col gap-2">
                {itemsSeccion.map((item) => (
                  <ChecklistItemRow
                    key={item.id}
                    juntadaId={juntadaId}
                    item={item}
                    miembros={miembros}
                    usuarioActualId={usuarioActualId}
                  />
                ))}
              </ul>
            )}

            <FormAgregarItem juntadaId={juntadaId} tipo={seccion.tipo} />
          </section>
        );
      })}
    </div>
  );
}
