import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { SESSION_COOKIE, crearToken, leerToken } from "@/lib/auth/session";

// Usuario logueado según la cookie, verificado contra la base (si lo borraron, no hay
// sesión). Solo id/nombre/apodo/avatar: nunca el teléfono ni el pinHash.
// cache() evita repetir la consulta cuando varias partes del mismo render la piden.
export const getUsuarioActual = cache(async () => {
  const token = (await cookies()).get(SESSION_COOKIE)?.value;
  const userId = token ? leerToken(token) : null;
  if (!userId) {
    return null;
  }
  return prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, nombre: true, apodo: true, avatarUrl: true },
  });
});

// Para páginas y Server Actions: el proxy solo hace un chequeo optimista de la cookie,
// esta es la verificación que vale.
export async function requireUsuario() {
  const usuario = await getUsuarioActual();
  if (!usuario) {
    redirect("/login");
  }
  return usuario;
}

export async function guardarSesion(userId: string) {
  const { token, expira } = crearToken(userId);
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expira,
  });
}

export async function borrarSesion() {
  (await cookies()).delete(SESSION_COOKIE);
}
