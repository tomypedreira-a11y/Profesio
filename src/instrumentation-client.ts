// Corre en el navegador antes de que la app se vuelva interactiva (Next: instrumentation-client).
import { config } from "zod/v4/core";

// Zod 4 compila las validaciones con Function("") si puede; la CSP no permite evaluar código ('unsafe-eval') y
// cada intento queda como violación en la consola. Sin compilar valida igual (apenas más lento).
// Va acá porque Zod lo decide al crear cada esquema: tiene que estar antes de que carguen los formularios.
config({ jitless: true });
