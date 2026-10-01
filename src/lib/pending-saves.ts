// Guardados pendientes (ej. el borrador de una anotación): se completan antes de cerrar la sesión,
// porque después ya no hay permiso para escribir. Solo en el navegador.

type PendingSave = () => Promise<unknown>;

const saves = new Set<PendingSave>();

// Devuelve la función para quitarlo (para el cleanup de un useEffect).
export function registerPendingSave(save: PendingSave) {
  saves.add(save);
  return () => {
    saves.delete(save);
  };
}

// Espera los guardados, como mucho timeoutMs (sin conexión no van a terminar: el cierre no se traba).
export async function flushPendingSaves(timeoutMs = 5000) {
  if (saves.size === 0) return;
  const timeout = new Promise((resolve) => setTimeout(resolve, timeoutMs));
  await Promise.race([Promise.allSettled([...saves].map((save) => save())), timeout]);
}
