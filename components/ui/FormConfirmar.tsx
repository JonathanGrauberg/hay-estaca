"use client";

import type { ReactNode } from "react";

interface FormConfirmarProps {
  action: (formData: FormData) => void | Promise<void>;
  // Si se pasa, pide confirmación antes de mandar (para borrar, archivar, etc.).
  mensaje?: string;
  className?: string;
  children: ReactNode;
}

// Un botón que dispara una Server Action, con un confirm() opcional antes.
export function FormConfirmar({ action, mensaje, className, children }: FormConfirmarProps) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (mensaje && !window.confirm(mensaje)) {
          event.preventDefault();
        }
      }}
    >
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
