import { useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

// Email-OTP auth for the reporter-rewards flow. No passwords: the reporter
// enters an email, gets a 6-digit code, and verifies it. The verified email is
// the reporter's identity (auth.uid()), used to attribute reports and accrue
// the $1-per-report balance.

// Tracks the current Supabase session. Reads it once on mount, then stays in
// sync via onAuthStateChange (covers verify, sign-out, and other tabs).
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

// Send the 6-digit code to the email. shouldCreateUser lets first-time
// reporters get an account on the fly.
export async function sendOtp(email: string): Promise<void> {
  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { shouldCreateUser: true },
  });
  if (error) throw error;
}

// Verify the code the reporter pastes from their inbox.
export async function verifyOtp(email: string, token: string): Promise<void> {
  const { error } = await supabase.auth.verifyOtp({
    email: email.trim(),
    token: token.trim(),
    type: "email",
  });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  await supabase.auth.signOut();
}
