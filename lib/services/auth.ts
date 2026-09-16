"use client";

import { createClient } from "@/lib/supabase/client";
import type {
  ForgotPasswordValues,
  LoginValues,
  ResetPasswordValues,
  SignupValues,
} from "@/lib/validation";

/**
 * Real Supabase Auth. Runs client-side (browser client) so @supabase/ssr can persist
 * the session into cookies that Server Components and middleware then read.
 */

function mapAuthError(message: string): string {
  if (/already registered|already exists/i.test(message)) {
    return "That email is already registered.";
  }
  if (/invalid login credentials/i.test(message)) {
    return "Incorrect email/username or password.";
  }
  if (/rate limit/i.test(message)) {
    return "Too many attempts. Try again shortly.";
  }
  return message;
}

export async function signUp(values: SignupValues) {
  const supabase = createClient();
  const { error } = await supabase.auth.signUp({
    email: values.email,
    password: values.password,
    options: {
      data: { username: values.username, phone: values.phone },
      emailRedirectTo: `${window.location.origin}/auth/confirm`,
    },
  });
  if (error) throw new Error(mapAuthError(error.message));
  return { success: true as const };
}

/** Resolves username-or-email to an email, then signs in. */
export async function logIn(values: LoginValues) {
  const supabase = createClient();

  const { data: email } = await supabase.rpc("fn_resolve_login_email", {
    p_identifier: values.identifier,
  });
  if (!email) throw new Error("Incorrect email/username or password.");

  const { error } = await supabase.auth.signInWithPassword({
    email,
    password: values.password,
  });
  if (error) throw new Error("Incorrect email/username or password.");
  return { success: true as const };
}

/** Same as logIn, but signs back out if the account has no admin_users row. */
export async function adminLogIn(values: LoginValues) {
  const supabase = createClient();
  await logIn(values);

  const { data: isAdmin } = await supabase.rpc("is_admin");
  if (!isAdmin) {
    await supabase.auth.signOut();
    throw new Error("This account does not have admin access.");
  }
  return { success: true as const };
}

export async function forgotPassword(values: ForgotPasswordValues) {
  const supabase = createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(values.email, {
    redirectTo: `${window.location.origin}/reset-password`,
  });
  // Supabase returns success even for unknown emails (prevents account enumeration) —
  // surface the same success state regardless, matching that behavior intentionally.
  if (error) throw new Error(mapAuthError(error.message));
  return { success: true as const };
}

export async function resetPassword(values: ResetPasswordValues) {
  const supabase = createClient();
  const { error } = await supabase.auth.updateUser({ password: values.password });
  if (error) throw new Error(mapAuthError(error.message));
  return { success: true as const };
}

export async function resendVerification(email: string) {
  const supabase = createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email,
    options: { emailRedirectTo: `${window.location.origin}/auth/confirm` },
  });
  if (error) throw new Error(mapAuthError(error.message));
  return { success: true as const };
}

/**
 * Supabase's updateUser() doesn't check the current password on its own — it just
 * updates for whatever session is active. Re-authenticating first closes that gap:
 * a hijacked session can't change the password without knowing the current one.
 */
export async function changePassword(email: string, currentPassword: string, newPassword: string) {
  const supabase = createClient();

  const { error: reauthError } = await supabase.auth.signInWithPassword({
    email,
    password: currentPassword,
  });
  if (reauthError) throw new Error("Current password is incorrect.");

  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw new Error(mapAuthError(error.message));
  return { success: true as const };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
}
