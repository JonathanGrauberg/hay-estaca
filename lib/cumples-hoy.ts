import { prisma } from "@/lib/prisma";
import { hoyEnArgentina } from "@/lib/cumples";

// Los que cumplen hoy (apodos). Si alguien cumple el 29/2, en años no bisiestos se le
// festeja el 28.
export async function cumpleanerosDeHoy() {
  const { dia, mes } = hoyEnArgentina();
  const anio = Number(
    new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Argentina/Buenos_Aires",
      year: "numeric",
    }).format(new Date()),
  );
  const bisiesto = (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0;
  const dias = mes === 2 && dia === 28 && !bisiesto ? [28, 29] : [dia];
  const usuarios = await prisma.user.findMany({
    where: { cumpleMes: mes, cumpleDia: { in: dias } },
    orderBy: { nombre: "asc" },
    select: { id: true, nombre: true, apodo: true },
  });
  return {
    clave: `${anio}-${mes}-${dia}`,
    personas: usuarios.map((u) => ({ id: u.id, nombre: u.apodo || u.nombre })),
  };
}
