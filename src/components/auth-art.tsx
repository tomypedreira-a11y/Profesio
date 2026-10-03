import Image from "next/image";

// Bosque decorativo de las pantallas de ingreso (login, registro, recuperación), con los árboles del panel
// lateral (public/decor, una versión por tema). Tres planos: atrás una fila de árboles chicos a lo ancho, en el
// medio unos medianos y adelante dos grandes en las esquinas. Entre plano y plano, una "neblina" del color del
// fondo: los de atrás se ven más lejos y los de adelante los tapan (los árboles son opacos; la transparencia
// es la del bosque entero). Solo desde tablet: en el celular la tarjeta ocupa casi todo.
// Unidad --u: crece con el alto de la pantalla (donde sobra espacio), pero sin pasarse en las angostas.
// En las imágenes la base del tronco está al 80% del alto: bottom = -20% del alto la deja justo en el borde.
// Va detrás del contenido: en (auth)/layout.tsx el logo y la tarjeta son `relative` y vienen después.
type Tree = {
  tree: "tree-1" | "tree-2" | "tree-3";
  x: number; // centro, en % del ancho
  h: number; // alto, en --u
  tilt?: number; // grados
  flip?: boolean; // espejado, para que no se repitan iguales
};

const BACK: Tree[] = [
  { tree: "tree-3", x: 3, h: 52, tilt: -2 },
  { tree: "tree-2", x: 15, h: 58, flip: true },
  { tree: "tree-1", x: 28, h: 50, tilt: 3 },
  { tree: "tree-3", x: 41, h: 56, flip: true },
  { tree: "tree-2", x: 57, h: 54, tilt: -3 },
  { tree: "tree-1", x: 70, h: 58, flip: true },
  { tree: "tree-3", x: 84, h: 50, tilt: 2 },
  { tree: "tree-2", x: 97, h: 56 },
];

const MIDDLE: Tree[] = [
  { tree: "tree-2", x: 9, h: 78, tilt: 3 },
  { tree: "tree-3", x: 23, h: 70, tilt: 5, flip: true },
  { tree: "tree-1", x: 77, h: 72, tilt: -5 },
  { tree: "tree-3", x: 91, h: 80, tilt: -3, flip: true },
];

const FRONT: Tree[] = [
  { tree: "tree-1", x: 2, h: 112, tilt: 6 },
  { tree: "tree-2", x: 98, h: 108, tilt: -6, flip: true },
];

function TreeImage({ tree, x, h, tilt = 0, flip = false }: Tree) {
  const style = {
    left: `${x}%`,
    height: `calc(var(--u) * ${h})`,
    bottom: `calc(var(--u) * ${-h * 0.2})`,
    transform: `translateX(-50%) rotate(${tilt}deg)${flip ? " scaleX(-1)" : ""}`,
  };
  const className = "absolute w-auto max-w-none origin-bottom";
  return (
    <>
      <Image src={`/decor/${tree}-light.webp`} alt="" width={512} height={768} style={style} className={`${className} dark:hidden`} />
      <Image src={`/decor/${tree}-dark.webp`} alt="" width={512} height={768} style={style} className={`${className} hidden dark:block`} />
    </>
  );
}

const Mist = () => <div className="absolute inset-0 bg-muted opacity-45" />;

export function AuthArt() {
  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0 hidden overflow-hidden opacity-60 [--u:min(1svh,0.65vw)] [mask-image:linear-gradient(to_top,transparent,#000_calc(var(--u)*10))] md:block dark:opacity-45"
    >
      {BACK.map((t) => (
        <TreeImage key={`back-${t.x}`} {...t} />
      ))}
      <Mist />
      {MIDDLE.map((t) => (
        <TreeImage key={`middle-${t.x}`} {...t} />
      ))}
      <Mist />
      {FRONT.map((t) => (
        <TreeImage key={`front-${t.x}`} {...t} />
      ))}
    </div>
  );
}
