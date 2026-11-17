"use client";

import { useEffect, useState, useTransition } from "react";
import type { ReactNode } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  Lock,
  Mail,
  MailOpen,
  Megaphone,
  Pencil,
  Plus,
  ShieldCheck,
  Trash2,
  Trophy,
  X,
} from "lucide-react";
import {
  aprobarCategoria,
  borrarCategoria,
  cambiarAdminVotaciones,
  cambiarApertura,
  cerrarVotacionYa,
  elegirRevelador,
  proponerCategoria,
  renombrarCategoria,
  revelarCategoria,
  votar,
  type ResultadoVotacion,
} from "@/lib/actions/votaciones";
import type {
  CategoriaVista,
  IntegranteVoto,
  VotacionesVista,
} from "@/lib/votaciones/datos";
import { Avatar } from "@/components/juntadas/Avatar";
import { Ayuda } from "@/components/ui/Ayuda";
import { Hoja } from "@/components/ui/Hoja";
import { cn } from "@/lib/utils";

const tituloSeccion =
  "text-xs font-semibold tracking-[0.15em] text-muted-foreground-2";
const inputClass =
  "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground-2 focus:border-primary";
const botonChico =
  "shrink-0 rounded-full px-3 py-1 text-xs font-semibold disabled:opacity-60";

// En la despedida, cada cuánto se busca si alguien abrió un sobre.
const REFRESCO_MS = 4000;

function fechaLarga(ymd: string) {
  const texto = new Intl.DateTimeFormat("es-AR", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(ymd));
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

type HojaAbierta =
  | { tipo: "votar"; categoria: CategoriaVista }
  | { tipo: "proponer" }
  | { tipo: "renombrar"; id: string; nombre: string }
  | { tipo: "revelador"; categoria: CategoriaVista }
  | { tipo: "admins" };

interface VotacionesProps {
  datos: VotacionesVista;
  yoId: string;
  // Admin del grupo o ayudante: decide categorías y quién revela. Votos, nunca.
  esAdmin: boolean;
  // Solo el admin del grupo nombra a los ayudantes.
  esAdminGrupo: boolean;
}

export function Votaciones({ datos, yoId, esAdmin, esAdminGrupo }: VotacionesProps) {
  const { temporada, categorias, pendientes, integrantes } = datos;
  const router = useRouter();
  const [hoja, setHoja] = useState<HojaAbierta | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const porId = new Map(integrantes.map((i) => [i.id, i]));
  const nombre = (id: string | null) => {
    const persona = id ? porId.get(id) : null;
    return persona ? persona.apodo || persona.nombre : "Ex integrante";
  };
  const total = integrantes.length;
  const misVotos = categorias.filter((c) => c.miVoto).length;
  const faltaRevelar = temporada.cerrada && categorias.some((c) => !c.revelada);

  // En la despedida todos miran el celu: cuando el que presenta abre un sobre, le
  // aparece a todos sin recargar.
  useEffect(() => {
    if (!faltaRevelar) return;
    const intervalo = window.setInterval(() => router.refresh(), REFRESCO_MS);
    return () => window.clearInterval(intervalo);
  }, [faltaRevelar, router]);

  function correr(accion: () => Promise<ResultadoVotacion>) {
    setError(null);
    startTransition(async () => {
      const resultado = await accion();
      if ("error" in resultado) {
        setError(resultado.error);
      }
    });
  }

  const cerrar = () => setHoja(null);

  const hojas = hoja && (
    <>
      {hoja.tipo === "votar" && (
        <Hoja titulo={hoja.categoria.nombre} onCerrar={cerrar}>
          <ElegirVoto
            categoria={hoja.categoria}
            integrantes={integrantes.filter((i) => i.id !== yoId)}
            listo={cerrar}
          />
        </Hoja>
      )}
      {hoja.tipo === "proponer" && (
        <Hoja titulo={esAdmin ? "Nueva categoría" : "Proponer categoría"} onCerrar={cerrar}>
          <FormNombre
            boton={esAdmin ? "Agregar" : "Proponer"}
            nota={esAdmin ? null : "Aparece para votar cuando la aprueben los admin."}
            guardar={(texto) => proponerCategoria(temporada.id, texto)}
            listo={cerrar}
          />
        </Hoja>
      )}
      {hoja.tipo === "renombrar" && (
        <Hoja titulo="Editar categoría" onCerrar={cerrar}>
          <FormNombre
            inicial={hoja.nombre}
            boton="Guardar"
            nota="Los votos que ya tiene quedan."
            guardar={(texto) => renombrarCategoria(hoja.id, texto)}
            listo={cerrar}
          />
        </Hoja>
      )}
      {hoja.tipo === "revelador" && (
        <Hoja titulo="¿Quién revela?" onCerrar={cerrar}>
          <ElegirRevelador categoria={hoja.categoria} integrantes={integrantes} listo={cerrar} />
        </Hoja>
      )}
      {hoja.tipo === "admins" && (
        <Hoja titulo="Admin de las votaciones" onCerrar={cerrar}>
          <ElegirAdmins integrantes={integrantes} yoId={yoId} />
        </Hoja>
      )}
    </>
  );

  const admins = esAdmin && (
    <AdminsVotaciones
      integrantes={integrantes}
      puedeCambiar={esAdminGrupo}
      cambiar={() => setHoja({ tipo: "admins" })}
    />
  );

  // Botón "¿Quién revela?" de cada categoría (solo admin, hasta que se abre).
  function botonRevelador(categoria: CategoriaVista) {
    if (!esAdmin || categoria.revelada) return null;
    return (
      <button
        type="button"
        onClick={() => setHoja({ tipo: "revelador", categoria })}
        className="flex items-center gap-1 self-start text-xs text-muted-foreground-2 hover:text-foreground"
      >
        <Megaphone className="h-3.5 w-3.5" />
        {categoria.reveladorId ? `Revela ${nombre(categoria.reveladorId)}` : "¿Quién revela?"}
      </button>
    );
  }

  if (temporada.cerrada) {
    const reveladas = categorias.filter((c) => c.revelada).length;
    return (
      <div className="flex flex-col gap-6">
        <div className="flex flex-col items-center gap-1 rounded-lg border-l-4 border-l-primary bg-card px-4 py-4 text-center">
          <Trophy className="h-8 w-8 text-primary" />
          <p className="font-heading text-3xl tracking-wide text-foreground">
            ¡LOS PREMIOS {temporada.anio}!
          </p>
          <p className="text-sm text-muted-foreground">
            La votación cerró. Cada sobre lo abre el que presenta la categoría
            {categorias.length > 0 && ` · ${reveladas} de ${categorias.length} abiertos`}.
          </p>
        </div>
        {error && <p className="text-sm text-primary">{error}</p>}
        {categorias.length === 0 ? (
          <p className="text-center text-sm text-muted-foreground-2">
            Esta temporada no tuvo categorías.
          </p>
        ) : (
          <ul className="flex flex-col gap-3 lg:grid lg:grid-cols-2">
            {categorias.map((categoria) =>
              categoria.revelada ? (
                <Resultado key={categoria.id} categoria={categoria} porId={porId} />
              ) : (
                <SobreCerrado
                  key={categoria.id}
                  categoria={categoria}
                  presenta={categoria.reveladorId ? nombre(categoria.reveladorId) : null}
                  soyYo={categoria.reveladorId === yoId}
                  pending={pending}
                  abrir={() => {
                    navigator.vibrate?.([30, 60, 30]);
                    correr(() => revelarCategoria(categoria.id));
                  }}
                  extra={botonRevelador(categoria)}
                />
              ),
            )}
          </ul>
        )}
        {admins}
        {hojas}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center gap-3 rounded-lg border-l-4 border-l-primary bg-card px-4 py-3">
        <Lock className="h-6 w-6 shrink-0 text-primary" />
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-foreground">
            Se vota hasta la despedida: {fechaLarga(temporada.apertura)}
          </p>
          <p className="text-xs text-muted-foreground-2">
            {temporada.diasQueFaltan === 1
              ? "Falta 1 día"
              : `Faltan ${temporada.diasQueFaltan} días`}{" "}
            · votaste {misVotos} de {categorias.length}
          </p>
        </div>
        <Ayuda titulo="Votaciones">
          Votás a uno por categoría (a vos mismo no) y podés cambiar tu voto hasta
          la despedida. Ahí cada categoría la presenta alguien que abre el sobre y
          aparecen los votos de cada uno. Antes nadie los ve, ni los admin, y quién
          votó a quién no se ve nunca.
        </Ayuda>
      </div>

      {esAdmin && (
        <EditarApertura
          temporadaId={temporada.id}
          apertura={temporada.apertura}
          cerrarYa={() => {
            if (
              window.confirm(
                "¿Cerrar la votación ya? Nadie más puede votar y se empiezan a abrir los sobres. No se puede volver atrás.",
              )
            ) {
              correr(() => cerrarVotacionYa(temporada.id));
            }
          }}
        />
      )}

      <section className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <h2 className={cn(tituloSeccion, "flex-1")}>CATEGORÍAS {temporada.anio}</h2>
          <button
            type="button"
            onClick={() => setHoja({ tipo: "proponer" })}
            className="flex items-center gap-1 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground"
          >
            <Plus className="h-3.5 w-3.5" />
            {esAdmin ? "Categoría" : "Proponer"}
          </button>
        </div>
        {categorias.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border px-4 py-3 text-sm text-muted-foreground-2">
            Todavía no hay categorías.{" "}
            {esAdmin
              ? "Agregá una o aprobá las que propongan."
              : 'Proponé una, tipo "El más tomador".'}
          </p>
        ) : (
          <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2">
            {categorias.map((categoria) => {
              const elegido = categoria.miVoto ? porId.get(categoria.miVoto) : null;
              return (
                <li
                  key={categoria.id}
                  className="flex items-center gap-3 rounded-lg bg-card px-4 py-3"
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <p className="text-sm font-semibold text-foreground">
                      {categoria.nombre}
                    </p>
                    <p className="text-xs text-muted-foreground-2">
                      {categoria.votaron} de {total} votaron
                      {elegido && (
                        <>
                          {" · "}
                          <span className="text-foreground">
                            tu voto: {elegido.apodo || elegido.nombre}
                          </span>
                        </>
                      )}
                    </p>
                    {botonRevelador(categoria)}
                  </div>
                  <button
                    type="button"
                    onClick={() => setHoja({ tipo: "votar", categoria })}
                    className={cn(
                      botonChico,
                      elegido
                        ? "border border-border text-muted-foreground hover:text-foreground"
                        : "bg-primary text-primary-foreground",
                    )}
                  >
                    {elegido ? "Cambiar" : "Votar"}
                  </button>
                  {esAdmin && (
                    <div className="flex shrink-0 flex-col gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setHoja({ tipo: "renombrar", id: categoria.id, nombre: categoria.nombre })
                        }
                        aria-label={`Editar ${categoria.nombre}`}
                        className="text-muted-foreground-2 hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        disabled={pending}
                        onClick={() => {
                          if (
                            window.confirm(
                              `¿Sacar "${categoria.nombre}"? Se pierden sus ${categoria.votaron} votos.`,
                            )
                          ) {
                            correr(() => borrarCategoria(categoria.id));
                          }
                        }}
                        aria-label={`Sacar ${categoria.nombre}`}
                        className="text-muted-foreground-2 hover:text-primary"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {pendientes.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className={tituloSeccion}>
            {esAdmin ? "PROPUESTAS PARA APROBAR" : "PROPUESTAS (ESPERAN A LOS ADMIN)"}
          </h2>
          <ul className="flex flex-col gap-2">
            {pendientes.map((propuesta) => (
              <li
                key={propuesta.id}
                className="flex items-center gap-2 rounded-lg border border-dashed border-border px-4 py-2.5"
              >
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-foreground">{propuesta.nombre}</p>
                  {propuesta.propuestaPor && (
                    <p className="text-xs text-muted-foreground-2">
                      la propuso {propuesta.mia ? "vos" : propuesta.propuestaPor}
                    </p>
                  )}
                </div>
                {esAdmin && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        setHoja({ tipo: "renombrar", id: propuesta.id, nombre: propuesta.nombre })
                      }
                      aria-label={`Editar ${propuesta.nombre}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted-foreground-2 hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      disabled={pending}
                      onClick={() => correr(() => aprobarCategoria(propuesta.id))}
                      aria-label={`Aprobar ${propuesta.nombre}`}
                      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                  </>
                )}
                {(esAdmin || propuesta.mia) && (
                  <button
                    type="button"
                    disabled={pending}
                    onClick={() => correr(() => borrarCategoria(propuesta.id))}
                    aria-label={`Descartar ${propuesta.nombre}`}
                    className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-border text-muted-foreground-2 hover:text-primary"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      {error && <p className="text-sm text-primary">{error}</p>}
      {admins}
      {hojas}
    </div>
  );
}

function AvatarElegible({
  integrante,
  marcado,
  onClick,
}: {
  integrante: IntegranteVoto;
  marcado: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={marcado}
      className={cn(
        "flex w-full flex-col items-center gap-1.5 rounded-lg border px-1 py-2.5 transition-colors",
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
        {integrante.apodo || integrante.nombre}
      </span>
    </button>
  );
}

function ElegirVoto({
  categoria,
  integrantes,
  listo,
}: {
  categoria: CategoriaVista;
  integrantes: IntegranteVoto[];
  listo: () => void;
}) {
  const [elegido, setElegido] = useState(categoria.miVoto);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function confirmar() {
    if (!elegido) return;
    setError(null);
    startTransition(async () => {
      const resultado = await votar(categoria.id, elegido);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      navigator.vibrate?.(20);
      listo();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground-2">
        Voto secreto. Lo podés cambiar hasta la despedida.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {integrantes.map((integrante) => (
          <li key={integrante.id}>
            <AvatarElegible
              integrante={integrante}
              marcado={elegido === integrante.id}
              onClick={() => setElegido(integrante.id)}
            />
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="button"
        disabled={!elegido || pending || elegido === categoria.miVoto}
        onClick={confirmar}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Votando…" : categoria.miVoto ? "Cambiar mi voto" : "Votar"}
      </button>
    </div>
  );
}

function ElegirRevelador({
  categoria,
  integrantes,
  listo,
}: {
  categoria: CategoriaVista;
  integrantes: IntegranteVoto[];
  listo: () => void;
}) {
  const [elegido, setElegido] = useState(categoria.reveladorId);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function guardar(reveladorId: string | null) {
    setError(null);
    startTransition(async () => {
      const resultado = await elegirRevelador(categoria.id, reveladorId);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      listo();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground-2">
        &quot;{categoria.nombre}&quot;: el que elijas es el único que puede abrir el
        sobre, en la despedida. Cuando lo abre, lo ven todos.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {integrantes.map((integrante) => (
          <li key={integrante.id}>
            <AvatarElegible
              integrante={integrante}
              marcado={elegido === integrante.id}
              onClick={() => setElegido(integrante.id)}
            />
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-primary">{error}</p>}
      <div className="flex gap-2">
        {categoria.reveladorId && (
          <button
            type="button"
            disabled={pending}
            onClick={() => guardar(null)}
            className="rounded-full border border-border px-4 py-2.5 text-sm text-muted-foreground hover:text-foreground disabled:opacity-60"
          >
            Sacar
          </button>
        )}
        <button
          type="button"
          disabled={!elegido || pending || elegido === categoria.reveladorId}
          onClick={() => guardar(elegido)}
          className="flex-1 rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          {pending ? "Guardando…" : "Que revele"}
        </button>
      </div>
    </div>
  );
}

function AdminsVotaciones({
  integrantes,
  puedeCambiar,
  cambiar,
}: {
  integrantes: IntegranteVoto[];
  puedeCambiar: boolean;
  cambiar: () => void;
}) {
  const admins = integrantes.filter((i) => i.adminVotaciones);
  return (
    <section className="flex items-center gap-3 rounded-lg border border-dashed border-border px-4 py-3">
      <ShieldCheck className="h-5 w-5 shrink-0 text-primary" />
      <div className="min-w-0 flex-1">
        <p className="text-xs font-semibold text-foreground">Admin de las votaciones</p>
        <p className="text-xs text-muted-foreground-2">
          {admins.map((a) => a.apodo || a.nombre).join(", ")}: deciden las categorías y
          quién revela, pero no ven los votos.
        </p>
      </div>
      {puedeCambiar && (
        <button
          type="button"
          onClick={cambiar}
          className={cn(botonChico, "border border-border text-muted-foreground hover:text-foreground")}
        >
          Elegir
        </button>
      )}
    </section>
  );
}

function ElegirAdmins({ integrantes, yoId }: { integrantes: IntegranteVoto[]; yoId: string }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <p className="text-xs text-muted-foreground-2">
        Te ayudan a armar las categorías, aprobar propuestas y elegir quién revela cada
        sobre. Los votos no los ve nadie hasta que se abre el sobre. Tocá para sumar o
        sacar.
      </p>
      <ul className="grid grid-cols-3 gap-2 sm:grid-cols-4">
        {integrantes.map((integrante) => (
          <li key={integrante.id}>
            <AvatarElegible
              integrante={integrante}
              marcado={integrante.adminVotaciones}
              onClick={() => {
                if (integrante.id === yoId || pending) return;
                setError(null);
                startTransition(async () => {
                  const resultado = await cambiarAdminVotaciones(
                    integrante.id,
                    !integrante.adminVotaciones,
                  );
                  if ("error" in resultado) setError(resultado.error);
                });
              }}
            />
          </li>
        ))}
      </ul>
      {error && <p className="text-sm text-primary">{error}</p>}
    </div>
  );
}

function FormNombre({
  inicial = "",
  boton,
  nota,
  guardar,
  listo,
}: {
  inicial?: string;
  boton: string;
  nota: string | null;
  guardar: (texto: string) => Promise<ResultadoVotacion>;
  listo: () => void;
}) {
  const [texto, setTexto] = useState(inicial);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function enviar() {
    setError(null);
    startTransition(async () => {
      const resultado = await guardar(texto);
      if ("error" in resultado) {
        setError(resultado.error);
        return;
      }
      listo();
    });
  }

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={texto}
        onChange={(event) => setTexto(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            enviar();
          }
        }}
        maxLength={60}
        autoFocus
        placeholder='Ej: "El que más veces se quedó dormido"'
        aria-label="Categoría"
        className={inputClass}
      />
      {nota && <p className="text-xs text-muted-foreground-2">{nota}</p>}
      {error && <p className="text-sm text-primary">{error}</p>}
      <button
        type="button"
        disabled={pending || !texto.trim() || texto.trim() === inicial}
        onClick={enviar}
        className="rounded-full bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-60"
      >
        {pending ? "Guardando…" : boton}
      </button>
    </div>
  );
}

function EditarApertura({
  temporadaId,
  apertura,
  cerrarYa,
}: {
  temporadaId: string;
  apertura: string;
  cerrarYa: () => void;
}) {
  const [abierto, setAbierto] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!abierto) {
    return (
      <div className="-mt-4 flex justify-end gap-4 text-xs text-muted-foreground-2">
        <button
          type="button"
          onClick={() => setAbierto(true)}
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          Cambiar el día
        </button>
        <button
          type="button"
          onClick={cerrarYa}
          className="underline-offset-2 hover:text-primary hover:underline"
        >
          Cerrar la votación ya
        </button>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        setError(null);
        startTransition(async () => {
          const resultado = await cambiarApertura(temporadaId, formData);
          if ("error" in resultado) {
            setError(resultado.error);
            return;
          }
          setAbierto(false);
        });
      }}
      className="-mt-2 flex flex-col gap-2 rounded-lg bg-card px-4 py-3"
    >
      <div className="flex gap-2">
        <input
          type="date"
          name="apertura"
          defaultValue={apertura}
          aria-label="Día de la despedida"
          className={inputClass}
        />
        <button
          type="submit"
          disabled={pending}
          className="shrink-0 rounded-full bg-primary px-4 text-sm font-semibold text-primary-foreground disabled:opacity-60"
        >
          Guardar
        </button>
      </div>
      {error && <p className="text-xs text-primary">{error}</p>}
    </form>
  );
}

// Sobre sin abrir: el nombre de la categoría y los votos tapados con ####.
function SobreCerrado({
  categoria,
  presenta,
  soyYo,
  pending,
  abrir,
  extra,
}: {
  categoria: CategoriaVista;
  presenta: string | null;
  soyYo: boolean;
  pending: boolean;
  abrir: () => void;
  extra: ReactNode;
}) {
  return (
    <li
      className={cn(
        "flex flex-col gap-3 rounded-lg border-2 border-dashed bg-card px-4 py-4",
        soyYo ? "border-primary" : "border-primary/40",
      )}
    >
      <div className="flex items-center gap-2">
        <Mail className="h-6 w-6 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-base font-semibold text-foreground">
          {categoria.nombre}
        </p>
      </div>
      <div aria-hidden className="flex select-none flex-col gap-1.5">
        {[0, 1, 2].map((i) => (
          <p
            key={i}
            className="truncate font-mono text-sm tracking-widest text-muted-foreground-2/60"
          >
            {"#".repeat(18 - i * 4)}
          </p>
        ))}
      </div>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
        <p className="min-w-0 flex-1 text-xs text-muted-foreground-2">
          {categoria.votaron} votos ·{" "}
          {soyYo
            ? "lo presentás vos"
            : presenta
              ? `lo abre ${presenta}`
              : "falta elegir quién lo abre"}
        </p>
        {extra}
      </div>
      {soyYo && (
        <button
          type="button"
          disabled={pending}
          onClick={abrir}
          className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-3 text-base font-bold text-primary-foreground active:scale-95 disabled:opacity-60"
        >
          <MailOpen className="h-5 w-5" />
          {pending ? "Abriendo…" : "Abrir el sobre"}
        </button>
      )}
    </li>
  );
}

// Sobre abierto: el ganador grande y una barrita por cada uno, como las encuestas.
function Resultado({
  categoria,
  porId,
}: {
  categoria: CategoriaVista;
  porId: Map<string, IntegranteVoto>;
}) {
  const resultados = categoria.resultados ?? [];
  const maximo = resultados[0]?.votos ?? 0;
  const totalVotos = resultados.reduce((suma, r) => suma + r.votos, 0);
  const ganadores = resultados.filter((r) => r.votos === maximo && maximo > 0);
  const nombre = (id: string) => {
    const persona = porId.get(id);
    return persona ? persona.apodo || persona.nombre : "Ex integrante";
  };

  return (
    <li className="sobre-abierto flex flex-col gap-4 rounded-lg border-2 border-primary bg-card px-4 py-4">
      <div className="flex items-center gap-2">
        <MailOpen className="h-5 w-5 shrink-0 text-primary" />
        <p className="min-w-0 flex-1 text-sm font-semibold text-muted-foreground">
          {categoria.nombre}
        </p>
      </div>
      {ganadores.length === 0 ? (
        <p className="text-sm text-muted-foreground-2">Nadie votó en esta.</p>
      ) : (
        <>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="flex justify-center gap-3">
              {ganadores.map((g) => {
                const persona = porId.get(g.id);
                return persona ? (
                  <Avatar
                    key={g.id}
                    nombre={persona.nombre}
                    apodo={persona.apodo}
                    avatarUrl={persona.avatarUrl}
                    className="h-20 w-20 border-primary text-xl text-primary"
                  />
                ) : null;
              })}
            </div>
            <p className="font-heading text-4xl leading-none tracking-wide text-primary">
              {ganadores.map((g) => nombre(g.id).toUpperCase()).join(" Y ")}
            </p>
            <p className="text-sm text-muted-foreground">
              {ganadores.length > 1 ? "Empate con " : ""}
              {maximo} {maximo === 1 ? "voto" : "votos"}
            </p>
          </div>
          <ul className="flex flex-col gap-2.5 border-t border-border pt-3">
            {resultados.map((r) => {
              const gana = r.votos === maximo;
              return (
                <li key={r.id} className="flex flex-col gap-1">
                  <div className="flex items-center gap-2 text-sm">
                    {gana && <Trophy className="h-3.5 w-3.5 shrink-0 text-primary" />}
                    <span
                      className={cn(
                        "min-w-0 flex-1 truncate",
                        gana ? "font-semibold text-foreground" : "text-muted-foreground",
                      )}
                    >
                      {nombre(r.id)}
                    </span>
                    <span
                      className={cn(
                        "min-w-8 rounded-full px-2 py-0.5 text-center text-xs font-semibold",
                        gana ? "bg-primary text-primary-foreground" : "bg-secondary text-foreground",
                      )}
                    >
                      {r.votos}
                    </span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-secondary">
                    <div
                      className={cn(
                        "h-full rounded-full transition-[width] duration-700",
                        gana ? "bg-primary" : "bg-primary/40",
                      )}
                      style={{ width: `${(r.votos / totalVotos) * 100}%` }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </li>
  );
}
