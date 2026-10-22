import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { SESSION_COOKIE, leerToken } from "@/lib/auth/session";

// Chequeo optimista: sin una cookie de sesión válida, todo manda a /login. La
// verificación contra la base (usuario que sigue existiendo) la hace requireUsuario()
// en cada página y Server Action. No se redirige /login → / desde acá: si la cookie es
// válida pero el usuario ya no existe, eso armaría un loop; lo resuelve la página.
export function proxy(request: NextRequest) {
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const logueado = token ? leerToken(token) !== null : false;

  if (!logueado && request.nextUrl.pathname !== "/login") {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Todo menos assets estáticos, íconos y el manifest (la PWA los necesita sin sesión).
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.png|manifest.json|.*\\.(?:png|svg|jpg|jpeg|webp|ico)$).*)"],
};
