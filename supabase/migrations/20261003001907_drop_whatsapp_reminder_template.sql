-- =============================================================================
-- Los mensajes de WhatsApp pasan a ser fijos (lib/whatsapp.ts): el recordatorio arma el cuándo según cuánto falta
-- para la sesión, y hay uno para cuando el paciente no llegó. Armar el mensaje en Configuración con marcadores
-- resultaba complicado, así que el texto personalizado del perfil ya no se usa.
-- =============================================================================
alter table public.profiles drop column whatsapp_reminder_template;
