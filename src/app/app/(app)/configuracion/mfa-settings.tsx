"use client";

// Verificación en dos pasos (TOTP): dispositivos registrados, activar (QR + primer código) y quitar.
import { useEffect, useRef, useState, useTransition } from "react";
import { CheckIcon, CopyIcon, PlusIcon, ShieldCheckIcon, SmartphoneIcon, Trash2Icon } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field, FieldDescription, FieldError, FieldLabel } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { MAX_MFA_FACTORS } from "@/lib/mfa";
import {
  cancelMfaEnrollment,
  confirmMfaEnrollment,
  removeMfaFactor,
  startMfaEnrollment,
  type EnrollResult,
} from "./account-actions";

export type MfaDevice = { id: string; name: string; added: string };

export function MfaSettings({ devices }: { devices: MfaDevice[] }) {
  const [enrollOpen, setEnrollOpen] = useState(false);
  const active = devices.length > 0;

  return (
    <div className="flex flex-col gap-3">
      {active ? (
        <>
          <Badge className="w-fit">
            <ShieldCheckIcon />
            Activada
          </Badge>
          <ul className="flex flex-col gap-2">
            {devices.map((device) => (
              <DeviceItem key={device.id} device={device} last={devices.length === 1} />
            ))}
          </ul>
          {devices.length < MAX_MFA_FACTORS && (
            <Button variant="outline" className="w-fit" onClick={() => setEnrollOpen(true)}>
              <PlusIcon />
              Agregar otro dispositivo
            </Button>
          )}
          <FieldDescription>
            {devices.length < MAX_MFA_FACTORS &&
              "Te conviene registrar un segundo dispositivo (ej. una tablet) por si perdés el celular. "}
            Si perdés acceso a tu app de códigos y no tenés otro dispositivo registrado, escribinos para recuperar tu
            cuenta.
          </FieldDescription>
        </>
      ) : (
        <>
          <FieldDescription>
            Además de tu contraseña, te pedimos un código de una app como Google Authenticator o Authy.
          </FieldDescription>
          <Button className="w-fit" onClick={() => setEnrollOpen(true)}>
            <ShieldCheckIcon />
            Activar
          </Button>
        </>
      )}

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent>
          {/* Se monta al abrir: cada activación arranca de cero. */}
          {enrollOpen && (
            <EnrollFlow
              defaultName={active ? "Otro dispositivo" : "Celular"}
              first={!active}
              onDone={() => setEnrollOpen(false)}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Paso 1: nombre del dispositivo. Paso 2: QR (o código a mano) y el primer código de 6 números.
function EnrollFlow({ defaultName, first, onDone }: { defaultName: string; first: boolean; onDone: () => void }) {
  const [name, setName] = useState(defaultName);
  const [enrollment, setEnrollment] = useState<EnrollResult>();
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [copied, setCopied] = useState(false);
  const [pending, startTransition] = useTransition();
  const verifiedRef = useRef(false);
  const factorRef = useRef<string>(undefined);

  // Si se cierra sin verificar, el factor a medias se borra (si no, quedaría ocupando un lugar).
  useEffect(() => {
    const factor = factorRef;
    const verified = verifiedRef;
    return () => {
      if (factor.current && !verified.current) void cancelMfaEnrollment(factor.current);
    };
  }, []);

  function start() {
    setError(undefined);
    startTransition(async () => {
      const result = await startMfaEnrollment(name);
      if (result.error) return setError(result.error);
      factorRef.current = result.factorId;
      setEnrollment(result);
    });
  }

  function verify() {
    if (!enrollment?.factorId) return;
    setError(undefined);
    startTransition(async () => {
      const result = await confirmMfaEnrollment(enrollment.factorId!, code);
      if (result.error) return setError(result.error);
      verifiedRef.current = true;
      toast.success(first ? "Verificación en dos pasos activada." : "Dispositivo agregado.");
      onDone();
    });
  }

  async function copySecret() {
    if (!enrollment?.secret) return;
    try {
      await navigator.clipboard.writeText(enrollment.secret);
      setCopied(true);
    } catch {
      toast.error("No se pudo copiar. Seleccioná el código y copialo a mano.");
    }
  }

  if (!enrollment) {
    return (
      <form
        onSubmit={(e) => {
          e.preventDefault();
          start();
        }}
        className="flex flex-col gap-4"
      >
        <DialogHeader>
          <DialogTitle>{first ? "Activar la verificación en dos pasos" : "Agregar otro dispositivo"}</DialogTitle>
          <DialogDescription>
            Vas a necesitar una app de códigos en tu celular, como Google Authenticator o Authy (son gratis).
            {first && " Al activarla se cierra la sesión en tus otros dispositivos: ingresás de nuevo con el código."}
          </DialogDescription>
        </DialogHeader>
        <Field data-invalid={!!error}>
          <FieldLabel htmlFor="mfa_name">Nombre del dispositivo</FieldLabel>
          <Input id="mfa_name" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} required />
          <FieldDescription>Para reconocerlo en la lista (ej. «Celular», «Tablet»).</FieldDescription>
          <FieldError>{error}</FieldError>
        </Field>
        <DialogFooter>
          <Button type="submit" disabled={pending || !name.trim()}>
            {pending ? "Preparando…" : "Continuar"}
          </Button>
        </DialogFooter>
      </form>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        verify();
      }}
      className="flex flex-col gap-4"
    >
      <DialogHeader>
        <DialogTitle>Escaneá el código QR</DialogTitle>
        <DialogDescription>
          En tu app de códigos, agregá una cuenta y escaneá este código. Después ingresá el código de 6 números que te
          muestra.
        </DialogDescription>
      </DialogHeader>
      {/* Fondo blanco también en modo oscuro: las cámaras leen mejor un QR oscuro sobre claro. */}
      {/* eslint-disable-next-line @next/next/no-img-element -- SVG en data URL generado por Supabase */}
      <img src={enrollment.qrCode} alt="Código QR para la app de códigos" className="mx-auto size-44 rounded-md bg-white p-2" />
      <div className="flex flex-col gap-1">
        <p className="text-xs text-muted-foreground">¿No podés escanearlo? Cargá este código a mano:</p>
        <div className="flex items-center gap-2">
          <code className="flex-1 rounded-md bg-muted px-2 py-1.5 font-mono text-xs break-all select-all">
            {enrollment.secret}
          </code>
          <Button type="button" variant="ghost" size="icon" onClick={copySecret} aria-label="Copiar el código">
            {copied ? <CheckIcon /> : <CopyIcon />}
          </Button>
        </div>
      </div>
      <Field data-invalid={!!error}>
        <FieldLabel htmlFor="mfa_code">Código de 6 números</FieldLabel>
        <Input
          id="mfa_code"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={7}
          placeholder="123456"
          className="text-center text-lg tracking-[0.3em]"
          aria-invalid={!!error}
          required
        />
        <FieldError>{error}</FieldError>
      </Field>
      <DialogFooter>
        <Button type="submit" disabled={pending || !code.trim()}>
          {pending ? "Verificando…" : first ? "Activar" : "Agregar"}
        </Button>
      </DialogFooter>
    </form>
  );
}

function DeviceItem({ device, last }: { device: MfaDevice; last: boolean }) {
  // Controlado: en Base UI, AlertDialogAction no cierra el diálogo solo.
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [code, setCode] = useState("");
  const [error, setError] = useState<string>();
  const [pending, startTransition] = useTransition();

  function remove() {
    setError(undefined);
    startTransition(async () => {
      const result = await removeMfaFactor(device.id, last ? code : undefined);
      if (result.error) return setError(result.error);
      setConfirmOpen(false);
      toast.success(last ? "Verificación en dos pasos desactivada." : "Dispositivo quitado.");
    });
  }

  return (
    <li className="flex items-center gap-3 rounded-lg border px-3 py-2 text-sm">
      <SmartphoneIcon className="size-4 shrink-0 text-muted-foreground" />
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="truncate font-medium">{device.name}</span>
        <span className="text-xs text-muted-foreground">Agregado el {device.added}</span>
      </span>
      <Button variant="ghost" size="sm" onClick={() => setConfirmOpen(true)}>
        <Trash2Icon />
        Quitar
      </Button>

      <AlertDialog
        open={confirmOpen}
        onOpenChange={(open) => {
          setConfirmOpen(open);
          setCode("");
          setError(undefined);
        }}
      >
        <AlertDialogContent>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              remove();
            }}
            className="flex flex-col gap-4"
          >
            <AlertDialogHeader>
              <AlertDialogTitle>
                {last ? "¿Desactivar la verificación en dos pasos?" : `¿Quitar «${device.name}»?`}
              </AlertDialogTitle>
              <AlertDialogDescription>
                {last
                  ? "Es tu único dispositivo: al quitarlo, para ingresar alcanza con la contraseña. Para confirmar, ingresá un código de la app."
                  : "Sus códigos dejan de servir para ingresar. Te queda el otro dispositivo registrado."}
              </AlertDialogDescription>
            </AlertDialogHeader>
            {last && (
              <Field data-invalid={!!error}>
                <FieldLabel htmlFor={`remove_code_${device.id}`}>Código de 6 números</FieldLabel>
                <Input
                  id={`remove_code_${device.id}`}
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  maxLength={7}
                  placeholder="123456"
                  className="text-center text-lg tracking-[0.3em]"
                  aria-invalid={!!error}
                  required
                />
              </Field>
            )}
            {error && <FieldError>{error}</FieldError>}
            <AlertDialogFooter>
              <AlertDialogCancel type="button">Cancelar</AlertDialogCancel>
              <AlertDialogAction type="submit" variant="destructive" disabled={pending || (last && !code.trim())}>
                {pending ? "Quitando…" : last ? "Desactivar" : "Quitar"}
              </AlertDialogAction>
            </AlertDialogFooter>
          </form>
        </AlertDialogContent>
      </AlertDialog>
    </li>
  );
}

