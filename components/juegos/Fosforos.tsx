// Un cuadrado de fósforos: raya 1 arriba, 2 derecha, 3 abajo, 4 izquierda y la 5ta en
// diagonal (cierra los 5 puntos). Las rayas que faltan se ven como guía tenue.

const LADO = 44;
const M = 4; // margen para que el trazo redondeado no se corte
const RAYAS: [number, number, number, number][] = [
  [M, M, M + LADO, M],
  [M + LADO, M, M + LADO, M + LADO],
  [M + LADO, M + LADO, M, M + LADO],
  [M, M + LADO, M, M],
  [M, M, M + LADO, M + LADO],
];

export function CuadradoFosforos({ rayas }: { rayas: number }) {
  const tamano = LADO + M * 2;

  return (
    <svg
      viewBox={`0 0 ${tamano} ${tamano}`}
      className="h-11 w-11 sm:h-14 sm:w-14"
      role="img"
      aria-label={`${rayas} de 5`}
    >
      {RAYAS.map(([x1, y1, x2, y2], i) => (
        <line
          key={i}
          x1={x1}
          y1={y1}
          x2={x2}
          y2={y2}
          strokeLinecap="round"
          strokeWidth={i < rayas ? 5 : 1.5}
          className={i < rayas ? "stroke-primary" : "stroke-primary/20"}
          strokeDasharray={i < rayas ? undefined : "3 5"}
        />
      ))}
    </svg>
  );
}
