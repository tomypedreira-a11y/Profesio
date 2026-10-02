"use client";

// Widget del captcha (Cloudflare Turnstile, ver lib/turnstile.ts). Va dentro del <form>: Turnstile agrega el campo
// oculto con el token (CAPTCHA_FIELD), que la Server Action le pasa a Supabase. El token sirve una sola vez:
// después de cada envío (resetKey cambia) se pide uno nuevo. Si el script no carga (sin conexión, un bloqueador),
// se avisa en castellano y se puede reintentar; el botón del formulario queda deshabilitado mientras no haya token.
import { useEffect, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { RotateCwIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CAPTCHA_FIELD, TURNSTILE_SITE_KEY } from "@/lib/turnstile";

type TurnstileApi = {
  render: (container: HTMLElement, options: Record<string, unknown>) => string;
  reset: (widgetId: string) => void;
  remove: (widgetId: string) => void;
};

declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

const SCRIPT_URL = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
const LOAD_TIMEOUT_MS = 10_000;

// Un solo script para toda la página (lo comparten los widgets). Si falla, se descarta para poder reintentar.
let loading: Promise<TurnstileApi> | null = null;

function loadTurnstile(): Promise<TurnstileApi> {
  if (window.turnstile) return Promise.resolve(window.turnstile);
  loading ??= new Promise<TurnstileApi>((resolve, reject) => {
    const script = document.createElement("script");
    script.src = SCRIPT_URL;
    const fail = () => {
      clearTimeout(timer);
      script.remove();
      loading = null;
      reject(new Error("No cargó Turnstile"));
    };
    const timer = setTimeout(fail, LOAD_TIMEOUT_MS);
    script.onload = () => {
      clearTimeout(timer);
      if (window.turnstile) resolve(window.turnstile);
      else fail();
    };
    script.onerror = fail;
    document.head.appendChild(script);
  });
  return loading;
}

// Estado del captcha para el formulario: `ready` habilita el botón de enviar.
export function useCaptcha() {
  const [token, setToken] = useState<string | null>(null);
  return { captchaReady: !TURNSTILE_SITE_KEY || token !== null, onCaptchaToken: setToken };
}

export function Turnstile({
  onToken,
  resetKey,
}: {
  onToken: (token: string | null) => void;
  resetKey?: unknown; // cambia después de cada envío (ej. el estado de useActionState)
}) {
  const { resolvedTheme } = useTheme();
  const theme = resolvedTheme === "dark" ? "dark" : "light";
  const container = useRef<HTMLDivElement>(null);
  const widget = useRef<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Se dibuja de nuevo al cambiar el tema (Turnstile no lo cambia en un widget ya dibujado) o al reintentar.
  useEffect(() => {
    if (!TURNSTILE_SITE_KEY) return;
    let cancelled = false;
    loadTurnstile().then(
      (api) => {
        if (cancelled || !container.current) return;
        widget.current = api.render(container.current, {
          sitekey: TURNSTILE_SITE_KEY,
          theme,
          language: "es",
          size: "flexible",
          "response-field-name": CAPTCHA_FIELD,
          callback: (token: string) => {
            setFailed(false);
            onToken(token);
          },
          // Vencido: Turnstile lo renueva solo; mientras tanto no se puede enviar.
          "expired-callback": () => onToken(null),
          "timeout-callback": () => onToken(null),
          "error-callback": () => {
            onToken(null);
            setFailed(true);
            return true; // manejado: Turnstile no lo tira a la consola
          },
        });
      },
      () => {
        if (!cancelled) setFailed(true);
      },
    );
    return () => {
      cancelled = true;
      if (widget.current) window.turnstile?.remove(widget.current);
      widget.current = null;
      onToken(null);
    };
  }, [theme, attempt, onToken]);

  // Después de cada envío, un token nuevo (el anterior ya lo usó Supabase).
  const lastReset = useRef(resetKey);
  useEffect(() => {
    if (lastReset.current === resetKey) return;
    lastReset.current = resetKey;
    if (!widget.current) return;
    window.turnstile?.reset(widget.current);
    onToken(null);
  }, [resetKey, onToken]);

  if (!TURNSTILE_SITE_KEY) return null;

  return (
    <div className="flex flex-col gap-2">
      {/* Turnstile dibuja adentro el iframe y el campo oculto: React no le pone hijos. */}
      <div ref={container} className={failed ? "hidden" : "min-h-[65px]"} />
      {failed && (
        <div role="alert" className="flex flex-col items-start gap-2 rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">
          <p>
            No se pudo cargar la verificación de seguridad. Revisá tu conexión a internet y, si usás un bloqueador
            de anuncios, desactivalo para este sitio. Sin esa verificación no se puede continuar.
          </p>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              setFailed(false);
              setAttempt((n) => n + 1);
            }}
          >
            <RotateCwIcon />
            Volver a intentar
          </Button>
        </div>
      )}
    </div>
  );
}
