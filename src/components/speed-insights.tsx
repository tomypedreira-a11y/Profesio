"use client";

// Métricas de velocidad de carga (Vercel Speed Insights): tiempos de carga y de respuesta de cada pantalla.
// Sin cookies. Antes de enviar, se quitan de la dirección los identificadores (ej. el de un paciente en
// /app/pacientes/<id>) y los parámetros: a Vercel solo le llega la forma de la ruta.
import { SpeedInsights as VercelSpeedInsights } from "@vercel/speed-insights/next";

const UUID = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi;

export function SpeedInsights() {
  return (
    <VercelSpeedInsights
      beforeSend={(event) => {
        const url = new URL(event.url);
        return { ...event, url: `${url.origin}${url.pathname.replace(UUID, "[id]")}` };
      }}
    />
  );
}
