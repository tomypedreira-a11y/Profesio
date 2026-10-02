// Cerrar la sesión desde el navegador: el menú del usuario, el cierre por inactividad y "Usar otra cuenta"
// usan signOutThisDevice; el botón de Configuración → Cuenta, signOutAllDevices.
import { logout } from "@/app/app/(auth)/actions";
import { signOutEverywhere } from "@/app/app/(app)/configuracion/account-actions";
import { flushPendingSaves } from "@/lib/pending-saves";
import { forgetThisDevice } from "@/lib/push-client";

// Antes de cerrar: lo pendiente (ej. un borrador de anotación; después ya no se puede guardar) y las
// notificaciones de la cuenta, que no tienen que seguir llegando a este dispositivo.
async function leaveThisDevice() {
  await flushPendingSaves();
  await forgetThisDevice();
}

export async function signOutThisDevice(reason?: string) {
  await leaveThisDevice();
  await logout(reason);
}

export async function signOutAllDevices() {
  await leaveThisDevice();
  await signOutEverywhere();
}
