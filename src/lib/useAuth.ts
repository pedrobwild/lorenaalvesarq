import { useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

type AuthState = {
  user: User | null;
  session: Session | null;
  isAdmin: boolean;
  loading: boolean;
};

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    session: null,
    isAdmin: false,
    loading: true,
  });

  useEffect(() => {
    let mounted = true;

    // Set up listener BEFORE checking session (recommended order).
    // O `setTimeout(0)` que existia aqui era resíduo do supabase-js v1,
    // onde chamadas à API dentro do callback de auth podiam deadlockar.
    // Em supabase-js v2 (em uso) o callback é "async-safe", então
    // chamamos `checkAdmin` direto — sem trabalho enfileirado em macro
    // task que atrasa o `loading=false` por um tick visível.
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setState((s) => ({ ...s, isAdmin: false, loading: false }));
      }
    });

    // Then check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!mounted) return;
      setState((s) => ({ ...s, session, user: session?.user ?? null }));
      if (session?.user) {
        checkAdmin(session.user.id);
      } else {
        setState((s) => ({ ...s, loading: false }));
      }
    });

    async function checkAdmin(userId: string) {
      const { data } = await supabase
        .from("admin_users")
        .select("user_id")
        .eq("user_id", userId)
        .maybeSingle();
      if (!mounted) return;
      setState((s) => ({ ...s, isAdmin: !!data, loading: false }));
    }

    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    return await supabase.auth.signInWithPassword({ email, password });
  }

  async function signOut() {
    await supabase.auth.signOut();
  }

  return { ...state, signIn, signOut };
}
