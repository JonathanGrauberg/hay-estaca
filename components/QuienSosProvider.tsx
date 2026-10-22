"use client";

import { createContext, useCallback, useContext, useSyncExternalStore } from "react";
import type { ReactNode } from "react";

const STORAGE_KEY = "hayestaca:quienSos";

type Listener = () => void;
const listeners = new Set<Listener>();

function getSnapshot() {
  return window.localStorage.getItem(STORAGE_KEY);
}

function getServerSnapshot() {
  return null;
}

function subscribe(listener: Listener) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function guardarQuienSoyId(id: string) {
  window.localStorage.setItem(STORAGE_KEY, id);
  listeners.forEach((listener) => listener());
}

interface QuienSosContextValue {
  quienSoyId: string | null;
  setQuienSoyId: (id: string) => void;
}

const QuienSosContext = createContext<QuienSosContextValue | null>(null);

// TODO: reemplazar por auth real cuando la implementemos. Por ahora "quién sos" es
// una preferencia de cliente sin verificar (cualquiera puede elegir ser cualquiera):
// vive en Context (para que RSVP, checklist y el dashboard lean/escriban la misma
// selección en vivo, sin recargar) respaldada por localStorage vía useSyncExternalStore
// (para que sobreviva a un reload/cierre de pestaña — si no, el recordatorio de la
// Parte 3 nunca podría mostrarse al abrir la app directo en el dashboard).
export function QuienSosProvider({ children }: { children: ReactNode }) {
  const quienSoyId = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const setQuienSoyId = useCallback((id: string) => guardarQuienSoyId(id), []);

  return (
    <QuienSosContext.Provider value={{ quienSoyId, setQuienSoyId }}>
      {children}
    </QuienSosContext.Provider>
  );
}

export function useQuienSos() {
  const ctx = useContext(QuienSosContext);
  if (!ctx) {
    throw new Error("useQuienSos debe usarse dentro de <QuienSosProvider>");
  }
  return ctx;
}
