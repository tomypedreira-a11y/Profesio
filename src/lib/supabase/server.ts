// Cliente de Supabase para código que corre en el servidor
// (Server Components, Server Actions y Route Handlers).
// Lee la sesión del usuario desde las cookies, así las reglas RLS saben quién es.
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import type { Database } from "@/lib/database.types";

export async function createClient() {
    const cookieStore = await cookies();

    return createServerClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
            cookies: {
                getAll() {
                    return cookieStore.getAll();
                },
                setAll(cookiesToSet) {
                    try {
                        cookiesToSet.forEach(({ name, value, options }) =>
                            cookieStore.set(name, value, options),
                        );
                    } catch {
                        // Desde un Server Component no se pueden escribir cookies.
                        // No pasa nada: la sesión se refresca en el proxy (lo sumamos en la etapa 2).
                    }
                },
            },
        },
    );
}