-- =============================================================================
-- Mensaje de recordatorio por WhatsApp: el texto que trae escrito el chat al tocar "Enviar recordatorio".
-- null = el mensaje por defecto de la app (lib/whatsapp.ts), así se puede mejorar sin tocar las cuentas.
-- Lo envía el propio psicólogo desde su WhatsApp: la app solo arma el link (wa.me/...?text=).
-- =============================================================================
alter table public.profiles
  add column whatsapp_reminder_template text
    check (char_length(btrim(whatsapp_reminder_template)) between 1 and 500);
