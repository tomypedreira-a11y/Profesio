"use client";

import { useEffect } from "react";

// En el celular el teclado se cierra recién cuando el campo pierde el foco, y tocar un botón o una zona
// vacía no se lo saca (sobre todo en iPhone): el teclado quedaba abierto después de escribir.
// Acá se cierra, como en una app nativa, al tocar fuera del campo, al enviar un formulario o con Enter.

const NON_TEXT_INPUTS = new Set(["button", "checkbox", "color", "file", "hidden", "image", "radio", "range", "reset", "submit"]);

function isTextField(el: Element | null): el is HTMLElement {
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return !NON_TEXT_INPUTS.has(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

function dismissKeyboard() {
  const active = document.activeElement;
  if (isTextField(active)) active.blur();
}

const isTouchDevice = () => window.matchMedia("(pointer: coarse)").matches;

export function KeyboardDismiss() {
  useEffect(() => {
    // pointerup y no pointerdown: si el dedo arrastra para desplazar la pantalla, el navegador cancela
    // el toque (pointercancel) y el teclado sigue abierto. Se cierra antes del click, que igual se ejecuta.
    function onPointerUp(event: PointerEvent) {
      if (event.pointerType !== "touch" && event.pointerType !== "pen") return;
      const target = event.target instanceof Element ? event.target : null;
      // Tocar otro campo (o su etiqueta) pasa el foco a ese campo: el teclado tiene que seguir.
      const field = target?.closest("input, textarea, [contenteditable]") ?? null;
      if (isTextField(field)) return;
      const label = target?.closest("label");
      if (label && isTextField(label.control)) return;
      dismissKeyboard();
    }

    // Enter en el teclado: en un formulario lo envía; en un campo suelto, termina de editarlo.
    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Enter" || event.isComposing || event.defaultPrevented || !isTouchDevice()) return;
      const target = event.target;
      if (target instanceof HTMLInputElement && isTextField(target) && !target.form) target.blur();
    }

    function onSubmit() {
      if (isTouchDevice()) dismissKeyboard();
    }

    document.addEventListener("pointerup", onPointerUp, true);
    document.addEventListener("keydown", onKeyDown);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("pointerup", onPointerUp, true);
      document.removeEventListener("keydown", onKeyDown);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, []);

  return null;
}
