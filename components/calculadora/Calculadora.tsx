"use client";

import { useEffect, useState } from "react";
import { Delete } from "lucide-react";
import { cn } from "@/lib/utils";

type Operador = "+" | "−" | "×" | "÷";

interface Estado {
  // Lo que se está tipeando, con "." como separador decimal interno.
  entrada: string;
  acumulado: number | null;
  operador: Operador | null;
  // Después de un operador o "=", el próximo dígito arranca un número nuevo.
  nuevoNumero: boolean;
  historial: string;
}

const INICIAL: Estado = { entrada: "0", acumulado: null, operador: null, nuevoNumero: false, historial: "" };

function operar(a: number, b: number, operador: Operador) {
  switch (operador) {
    case "+":
      return a + b;
    case "−":
      return a - b;
    case "×":
      return a * b;
    case "÷":
      return b === 0 ? NaN : a / b;
  }
}

// Los resultados se guardan redondeados a 12 cifras para que 0,1 + 0,2 dé 0,3 y no
// 0,30000000000000004.
function limpiar(numero: number) {
  return String(Number(numero.toPrecision(12)));
}

// Redondea los errores de coma flotante (0,1 + 0,2) y muestra con coma decimal y
// puntos de miles, como se escribe en Argentina.
function mostrar(valor: string | number): string {
  const numero = typeof valor === "number" ? valor : Number(valor);
  if (!Number.isFinite(numero)) return "Error";
  if (typeof valor === "string" && valor.endsWith(".")) {
    return `${mostrar(numero)},`;
  }
  const decimales =
    typeof valor === "string" ? Math.min(valor.split(".")[1]?.length ?? 0, 8) : undefined;
  return new Intl.NumberFormat("es-AR", {
    minimumFractionDigits: decimales ?? 0,
    maximumFractionDigits: decimales ?? 8,
  }).format(Number(numero.toPrecision(12)));
}

// Transiciones puras del estado: las usan tanto los botones como el teclado de la PC.

function conDigito(e: Estado, d: string): Estado {
  if (e.nuevoNumero || e.entrada === "Error") {
    return { ...e, entrada: d === "." ? "0." : d, nuevoNumero: false };
  }
  if (d === "." && e.entrada.includes(".")) return e;
  if (e.entrada.replace(/[-.]/g, "").length >= 15) return e;
  const entrada = e.entrada === "0" && d !== "." ? d : e.entrada + d;
  return { ...e, entrada };
}

function conOperador(e: Estado, op: Operador): Estado {
  const actual = Number(e.entrada);
  // Cambiar de operador sin haber tipeado otro número: solo se reemplaza.
  if (e.nuevoNumero && e.operador) {
    return { ...e, operador: op, historial: `${mostrar(e.acumulado ?? 0)} ${op}` };
  }
  const acumulado =
    e.acumulado !== null && e.operador ? operar(e.acumulado, actual, e.operador) : actual;
  return {
    entrada: limpiar(acumulado),
    acumulado,
    operador: op,
    nuevoNumero: true,
    historial: `${mostrar(acumulado)} ${op}`,
  };
}

function conIgual(e: Estado): Estado {
  if (e.acumulado === null || !e.operador) return e;
  const actual = Number(e.entrada);
  const resultado = operar(e.acumulado, actual, e.operador);
  return {
    entrada: Number.isFinite(resultado) ? limpiar(resultado) : "Error",
    acumulado: null,
    operador: null,
    nuevoNumero: true,
    historial: `${mostrar(e.acumulado)} ${e.operador} ${mostrar(actual)} =`,
  };
}

// "10.000 + 15 %" suma el 15 % de 10.000; solo "15 %" da 0,15.
function conPorcentaje(e: Estado): Estado {
  const actual = Number(e.entrada);
  const base =
    e.acumulado !== null && (e.operador === "+" || e.operador === "−") ? e.acumulado : 1;
  return { ...e, entrada: limpiar((base * actual) / 100), nuevoNumero: true };
}

function conBorrar(e: Estado): Estado {
  if (e.nuevoNumero || e.entrada === "Error") return { ...e, entrada: "0", nuevoNumero: false };
  const entrada = e.entrada.slice(0, -1);
  return { ...e, entrada: entrada === "" || entrada === "-" ? "0" : entrada };
}

function conSignoCambiado(e: Estado): Estado {
  const entrada = e.entrada.startsWith("-")
    ? e.entrada.slice(1)
    : e.entrada === "0"
      ? "0"
      : `-${e.entrada}`;
  return { ...e, entrada };
}

// Teclado físico (PC): números, + - * /, Enter o =, Backspace, Escape o C, %.
function transicionPorTecla(tecla: string): ((e: Estado) => Estado) | null {
  if (/^\d$/.test(tecla)) return (e) => conDigito(e, tecla);
  if (tecla === "," || tecla === ".") return (e) => conDigito(e, ".");
  if (tecla === "+") return (e) => conOperador(e, "+");
  if (tecla === "-") return (e) => conOperador(e, "−");
  if (tecla === "*" || tecla === "x") return (e) => conOperador(e, "×");
  if (tecla === "/") return (e) => conOperador(e, "÷");
  if (tecla === "Enter" || tecla === "=") return conIgual;
  if (tecla === "%") return conPorcentaje;
  if (tecla === "Backspace") return conBorrar;
  if (tecla === "Escape" || tecla === "c" || tecla === "C") return () => INICIAL;
  return null;
}

export function Calculadora() {
  const [estado, setEstado] = useState<Estado>(INICIAL);

  useEffect(() => {
    function alApretar(event: KeyboardEvent) {
      if (event.ctrlKey || event.metaKey || event.altKey) return;
      const transicion = transicionPorTecla(event.key);
      if (!transicion) return;
      // "/" abre la búsqueda rápida en Firefox y Enter podría "clickear" el botón con foco.
      event.preventDefault();
      setEstado(transicion);
    }
    window.addEventListener("keydown", alApretar);
    return () => window.removeEventListener("keydown", alApretar);
  }, []);

  const digito = (d: string) => setEstado((e) => conDigito(e, d));
  const operador = (op: Operador) => setEstado((e) => conOperador(e, op));
  const igual = () => setEstado(conIgual);
  const porcentaje = () => setEstado(conPorcentaje);
  const borrar = () => setEstado(conBorrar);
  const cambiarSigno = () => setEstado(conSignoCambiado);

  const teclas: {
    label: React.ReactNode;
    accion: () => void;
    tipo?: "op" | "fn" | "igual";
    aria?: string;
  }[] = [
    { label: "C", accion: () => setEstado(INICIAL), tipo: "fn" },
    { label: "±", accion: cambiarSigno, tipo: "fn" },
    { label: "%", accion: porcentaje, tipo: "fn" },
    { label: "÷", accion: () => operador("÷"), tipo: "op" },
    { label: "7", accion: () => digito("7") },
    { label: "8", accion: () => digito("8") },
    { label: "9", accion: () => digito("9") },
    { label: "×", accion: () => operador("×"), tipo: "op" },
    { label: "4", accion: () => digito("4") },
    { label: "5", accion: () => digito("5") },
    { label: "6", accion: () => digito("6") },
    { label: "−", accion: () => operador("−"), tipo: "op" },
    { label: "1", accion: () => digito("1") },
    { label: "2", accion: () => digito("2") },
    { label: "3", accion: () => digito("3") },
    { label: "+", accion: () => operador("+"), tipo: "op" },
    { label: "0", accion: () => digito("0") },
    { label: ",", accion: () => digito(".") },
    { label: <Delete className="mx-auto h-5 w-5" />, accion: borrar, tipo: "fn", aria: "Borrar" },
    { label: "=", accion: igual, tipo: "igual" },
  ];

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col items-end gap-1 rounded-lg border-l-4 border-l-primary bg-card px-4 py-5">
        <p className="h-5 text-sm text-muted-foreground-2">{estado.historial}</p>
        <p className="w-full truncate text-right font-heading text-6xl leading-none tracking-wide text-foreground">
          {estado.entrada === "Error" ? "Error" : mostrar(estado.entrada)}
        </p>
      </div>

      <div className="grid grid-cols-4 gap-2">
        {teclas.map((tecla, indice) => {
          const activo = tecla.tipo === "op" && estado.operador === tecla.label && estado.nuevoNumero;
          return (
            <button
              key={indice}
              type="button"
              onClick={tecla.accion}
              aria-label={tecla.aria}
              className={cn(
                "h-16 rounded-lg text-2xl font-semibold transition-colors active:scale-95",
                tecla.tipo === "op" &&
                  (activo ? "bg-foreground text-background" : "bg-primary/15 text-primary"),
                tecla.tipo === "fn" && "bg-secondary text-muted-foreground",
                tecla.tipo === "igual" && "bg-primary text-primary-foreground",
                !tecla.tipo && "bg-card text-foreground hover:bg-accent"
              )}
            >
              {tecla.label}
            </button>
          );
        })}
      </div>
      <p className="hidden text-center text-xs text-muted-foreground-2 lg:block">
        Podés usar el teclado: Enter es =, Esc borra todo.
      </p>
    </div>
  );
}
