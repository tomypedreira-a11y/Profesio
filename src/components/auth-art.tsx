"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Image from "next/image";
import { cn } from "@/lib/utils";

// Fondo decorativo de las pantallas de ingreso (login, registro, recuperación). Hay varias escenas y se elige una
// al azar en cada carga (abrir la app, recargar): distinta de la última, que se recuerda en el navegador. Al ir
// del login al registro sigue la misma (el layout no se vuelve a montar), como el árbol del panel lateral.
// Árboles de public/decor (una versión por tema, la base del tronco al 80% del alto: bottom = -20% del alto la deja
// justo en el borde) y el logo (public/decor/logo-tree.svg, lo copia scripts/generate-icons.mjs).
// Solo desde tablet: en el celular la tarjeta ocupa casi todo.
// Unidad --u: crece con el alto de la pantalla (donde sobra espacio), pero sin pasarse en las angostas.
// Va detrás del contenido: en (auth)/layout.tsx el logo y la tarjeta son `relative` y vienen después.

type Tree = {
  tree: "tree-1" | "tree-2" | "tree-3";
  x: number; // centro, en % del ancho
  h: number; // alto, en --u
  tilt?: number; // grados
  flip?: boolean; // espejado, para que no se repitan iguales
};

function TreeImage({ tree, x, h, tilt = 0, flip = false }: Tree) {
  const style = {
    left: `${x}%`,
    height: `calc(var(--u) * ${h})`,
    bottom: `calc(var(--u) * ${-h * 0.2})`,
    transform: `translateX(-50%) rotate(${tilt}deg)${flip ? " scaleX(-1)" : ""}`,
  };
  // Gira sobre la base del tronco: queda donde se lo ubicó, se incline cuanto se incline.
  const className = "absolute w-auto max-w-none origin-[50%_80%]";
  return (
    <>
      <Image src={`/decor/${tree}-light.webp`} alt="" width={512} height={768} style={style} className={`${className} dark:hidden`} />
      <Image src={`/decor/${tree}-dark.webp`} alt="" width={512} height={768} style={style} className={`${className} hidden dark:block`} />
    </>
  );
}

const Trees = ({ trees }: { trees: Tree[] }) => trees.map((t) => <TreeImage key={`${t.tree}-${t.x}`} {...t} />);

// Capa del color del fondo entre planos: lo de atrás se ve más lejos y lo de adelante lo tapa.
const Mist = () => <div className="absolute inset-0 bg-muted opacity-45" />;

// Bosque en tres planos: chicos a lo ancho, medianos y dos grandes en las esquinas.
function Forest() {
  return (
    <div className="absolute inset-0 opacity-60 dark:opacity-45">
      <Trees
        trees={[
          { tree: "tree-3", x: 3, h: 52, tilt: -2 },
          { tree: "tree-2", x: 15, h: 58, flip: true },
          { tree: "tree-1", x: 28, h: 50, tilt: 3 },
          { tree: "tree-3", x: 41, h: 56, flip: true },
          { tree: "tree-2", x: 57, h: 54, tilt: -3 },
          { tree: "tree-1", x: 70, h: 58, flip: true },
          { tree: "tree-3", x: 84, h: 50, tilt: 2 },
          { tree: "tree-2", x: 97, h: 56 },
        ]}
      />
      <Mist />
      <Trees
        trees={[
          { tree: "tree-2", x: 9, h: 78, tilt: 3 },
          { tree: "tree-3", x: 23, h: 70, tilt: 5, flip: true },
          { tree: "tree-1", x: 77, h: 72, tilt: -5 },
          { tree: "tree-3", x: 91, h: 80, tilt: -3, flip: true },
        ]}
      />
      <Mist />
      <Trees
        trees={[
          { tree: "tree-1", x: 2, h: 112, tilt: 6 },
          { tree: "tree-2", x: 98, h: 108, tilt: -6, flip: true },
        ]}
      />
    </div>
  );
}

// Un solo árbol enorme, desde la esquina de abajo a la izquierda, cruzando el fondo en diagonal.
function DiagonalTree() {
  return (
    <div className="absolute inset-0 opacity-40 dark:opacity-35">
      <Trees trees={[{ tree: "tree-3", x: 3, h: 200, tilt: 54 }]} />
    </div>
  );
}

// El árbol del logo, grande y centrado detrás de la tarjeta: la copa la rodea. Es una máscara pintada con el
// verde del logo (en el oscuro, con el color principal del tema).
function LogoTree() {
  return (
    <div
      className="absolute top-1/2 left-1/2 aspect-[1552/1712] -translate-1/2 bg-[#0a4a26] opacity-10 [mask:url(/decor/logo-tree.svg)_center/contain_no-repeat] dark:bg-primary dark:opacity-15"
      style={{ height: "calc(var(--u) * 104)" }}
    />
  );
}

// Dos árboles grandes, uno a cada lado de la tarjeta, inclinados apenas hacia el centro.
function TreePair() {
  return (
    <div className="absolute inset-0 opacity-45 dark:opacity-35">
      <Trees
        trees={[
          { tree: "tree-1", x: 12, h: 95, tilt: 6 },
          { tree: "tree-2", x: 88, h: 95, tilt: -6 },
        ]}
      />
    </div>
  );
}

const SCENES = { forest: Forest, diagonal: DiagonalTree, logo: LogoTree, pair: TreePair };
type Scene = keyof typeof SCENES;
const SCENE_NAMES = Object.keys(SCENES) as Scene[];
const STORAGE_KEY = "auth-scene";

// Al azar, sin repetir la última (si se puede leer).
function pickScene(): Scene {
  let last: string | null = null;
  try {
    last = localStorage.getItem(STORAGE_KEY);
  } catch {
    // Sin almacenamiento (ventana privada o en el servidor): cualquiera.
  }
  const options = SCENE_NAMES.filter((name) => name !== last);
  return options[Math.floor(Math.random() * options.length)];
}

const subscribe = () => () => {};

export function AuthArt() {
  // El azar solo en el navegador: en el servidor (y al hidratar) no se muestra ninguna, y después aparece.
  const isClient = useSyncExternalStore(subscribe, () => true, () => false);
  const [scene] = useState(pickScene);
  const SceneArt = SCENES[scene];

  // Se recuerda en un efecto (no al elegirla): en desarrollo React llama dos veces al inicializador.
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, scene);
    } catch {
      // Sin almacenamiento: la próxima puede repetirse.
    }
  }, [scene]);

  return (
    <div
      aria-hidden
      data-scene={isClient ? scene : undefined}
      className={cn(
        "pointer-events-none absolute inset-0 hidden overflow-hidden transition-opacity duration-700 [--u:min(1svh,0.65vw)] [mask-image:linear-gradient(to_top,transparent,#000_calc(var(--u)*10))] md:block",
        isClient ? "opacity-100" : "opacity-0",
      )}
    >
      {isClient && <SceneArt />}
    </div>
  );
}
