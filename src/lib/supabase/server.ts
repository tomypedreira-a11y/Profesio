// Cliente de Supabase para código que corre en el servidor
// (Server Components, Server Actions y Route Handlers).
// Lee la sesión del usuario desde las cookies, así las reglas RLS saben quién es.
import { cache } from "react";
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

// Sesión y perfil del psicólogo, una sola vez por request: el layout de (app) y la página los piden los dos, y
// cache() de React hace que la segunda llamada reciba el mismo resultado (sin otra consulta). Solo dura lo que
// el render de ese request; en Server Actions no guarda nada (cada llamada consulta).
export const getClaims = cache(async () => {
    const supabase = await createClient();
    const { data } = await supabase.auth.getClaims();
    return data?.claims ?? null;
});

// La fila de profiles (sin datos clínicos): zona horaria, preferencias y datos profesionales.
export const getProfile = cache(async () => {
    const claims = await getClaims();
    if (!claims) return null;
    const supabase = await createClient();
    const { data } = await supabase.from("profiles").select("*").eq("id", claims.sub).single();
    return data;
});
