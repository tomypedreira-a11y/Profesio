import Image from "next/image";

// Árboles decorativos de las pantallas de ingreso (login, registro, recuperación): los del panel lateral
// (public/decor, una versión por tema), pero grandes, uno a cada lado de la tarjeta, naciendo de las esquinas
// de abajo e inclinados apenas hacia el centro. Solo desde tablet: en el celular la tarjeta ocupa casi todo.
// Medidas en svh: crecen con el alto de la pantalla, que es donde sobra espacio. En las imágenes la base del
// tronco está al 80% del alto: con bottom -19svh (20% de 95svh) queda justo en el borde y las raíces se
// desvanecen con la máscara.
// Va detrás del contenido: en (auth)/layout.tsx el logo y la tarjeta son `relative` y vienen después.
const TREE = "absolute -bottom-[19svh] h-[95svh] w-auto max-w-none origin-bottom";

const SIDES = [
  { tree: "tree-1", position: "-left-[8svh] rotate-6" },
  { tree: "tree-2", position: "-right-[8svh] -rotate-6" },
];

export function AuthArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden [mask-image:linear-gradient(to_top,transparent,#000_10svh)] md:block"
    >
      {SIDES.map(({ tree, position }) => (
        <div key={tree}>
          <Image
            src={`/decor/${tree}-light.webp`}
            alt=""
            width={512}
            height={768}
            className={`${TREE} ${position} opacity-45 dark:hidden`}
          />
          <Image
            src={`/decor/${tree}-dark.webp`}
            alt=""
            width={512}
            height={768}
            className={`${TREE} ${position} hidden opacity-35 dark:block`}
          />
        </div>
      ))}
    </div>
  );
}
