"use client";

// Recorrido de pantallas para las flechas de "volver": desde la sección principal en la que se estaba
// (ej. Sesiones → ficha → anotaciones), cada flecha vuelve un paso hasta esa sección.
import { usePathname, useSearchParams } from "next/navigation";
import { useLayoutEffect, useSyncExternalStore } from "react";

// Secciones principales: se llega desde la barra inferior o el panel lateral, y empiezan un recorrido.
// Las vistas del calendario (/calendario) se abren desde el calendario: su flecha vuelve ahí.
const MAIN_SECTIONS = ["/", "/pacientes", "/sesiones", "/ingresos", "/perfil", "/configuracion"];

const STORAGE_KEY = "profesio:back-stack";
const MAX_ENTRIES = 20;

type Entry = { path: string; url: string }; // url incluye los filtros (?mes=…) para volver igual
const EMPTY: Entry[] = [];

export const isMainSection = (path: string) => MAIN_SECTIONS.includes(path);
// Los formularios no son destino de la flecha: al guardar ya llevan a la ficha.
const isForm = (path: string) => path.endsWith("/nuevo") || path.endsWith("/editar");

// Pantalla de arriba en la jerarquía, para cuando no hay recorrido (se entró por un link o se recargó).
// /pacientes/[id]/editar → /pacientes/[id] → /pacientes
function parentOf(path: string) {
  return "/" + path.split("/").filter(Boolean).slice(0, -1).join("/");
}

function labelFor(path: string) {
  const labels: Record<string, string> = {
    "/": "Calendario",
    "/calendario": "Vistas",
    "/pacientes": "Pacientes",
    "/pacientes/archivados": "Archivados",
    "/sesiones": "Sesiones",
    "/ingresos": "Ingresos",
    "/perfil": "Mi perfil",
    "/configuracion": "Configuración",
  };
  if (labels[path]) return labels[path];
  if (path.endsWith("/anotaciones")) return "Anotaciones";
  if (path.startsWith("/pacientes/")) return "Paciente";
  return "Volver";
}

// Guardado en sessionStorage (sobrevive a recargar la pestaña). Se lee con useSyncExternalStore
// para no tocar el estado dentro de un efecto. Solo se usa en el navegador.
let stack: Entry[] | null = null;
const listeners = new Set<() => void>();

function getStack(): Entry[] {
  if (stack === null) {
    try {
      stack = JSON.parse(sessionStorage.getItem(STORAGE_KEY) ?? "[]") as Entry[];
    } catch {
      stack = [];
    }
  }
  return stack;
}

function setStack(next: Entry[]) {
  stack = next;
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    // Sin sessionStorage (modo privado) el recorrido vive solo en memoria.
  }
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

// Suma la pantalla actual al recorrido.
function record(path: string, url: string) {
  const current = getStack();
  if (isMainSection(path)) return setStack([{ path, url }]); // empieza un recorrido nuevo
  const index = current.findIndex((entry) => entry.path === path);
  // Si ya estaba (se volvió atrás, o al guardar un formulario), se descarta lo que venía después.
  if (index >= 0) return setStack([...current.slice(0, index), { path, url }]);
  if (isForm(path)) return;
  setStack([...current, { path, url }].slice(-MAX_ENTRIES));
}

// Lo usa el layout, una sola vez, para registrar cada pantalla que se visita.
export function useRecordNavigation() {
  const pathname = usePathname();
  const search = useSearchParams().toString();
  // Antes de pintar, así las flechas no muestran por un instante el destino anterior.
  useLayoutEffect(() => {
    record(pathname, search ? `${pathname}?${search}` : pathname);
  }, [pathname, search]);
}

export type BackTarget = {
  url: string;
  path: string;
  label: string;
  fromHistory: boolean; // false = no hay recorrido y se sube un nivel
};

// Adónde vuelve la flecha desde la pantalla actual (null en las secciones principales).
export function useBackTarget(): BackTarget | null {
  const pathname = usePathname();
  const entries = useSyncExternalStore(subscribe, getStack, () => EMPTY);
  if (isMainSection(pathname)) return null;

  const previous = entries.findLast((entry) => entry.path !== pathname);
  if (previous) return { ...previous, label: labelFor(previous.path), fromHistory: true };
  const parent = parentOf(pathname);
  return { url: parent, path: parent, label: labelFor(parent), fromHistory: false };
}
