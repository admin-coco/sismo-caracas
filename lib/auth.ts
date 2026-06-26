import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Magic-link auth for the reporter-rewards flow. No passwords: the reporter
// enters an email, gets a one-time sign-in link, and clicking it logs them in
// and lands them on /mis-reportes. The verified email is the reporter's
// identity (auth.uid()), used to attribute reports and accrue the $1-per-report
// balance. We use the default Supabase email (no custom SMTP needed).

// Where the magic link sends the reporter back. Uses the current origin in the
// browser so it works on localhost in dev and the real domain in prod (the
// origin must be in Supabase's Redirect URLs allowlist).
export function authRedirectUrl(): string {
  const origin =
    typeof window !== "undefined"
      ? window.location.origin
      : "https://sismovenezuela.org";
  return `${origin}/mis-reportes`;
}

// Tracks the current Supabase session. Reads it once on mount, then stays in
// sync via onAuthStateChange (covers magic-link login, sign-out, other tabs).
export function useSession(): { session: Session | null; loading: boolean } {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
      setLoading(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, s) => {
      setSession(s);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  return { session, loading };
}

// Send a magic sign-in link to the email. shouldCreateUser lets first-time
// reporters get an account on the fly; emailRedirectTo brings them back to
// /mis-reportes (on the same origin) already logged in.
export async function sendMagicLink(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: {
      shouldCreateUser: true,
      emailRedirectTo: authRedirectUrl(),
    },
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
