import { simulateDelay } from "@/lib/services/delay";
import type {
  ForgotPasswordValues,
  LoginValues,
  ResetPasswordValues,
  SignupValues,
} from "@/lib/validation";

/**
 * Mock authentication only. No session, token, or credential is ever created or stored.
 * The future backend (Supabase Auth) replaces every function in this file.
 *
 * For demo purposes, submitting the password "invalid" simulates an auth failure so the
 * error state can be exercised without a real backend.
 */

export async function mockSignup(values: SignupValues) {
  await simulateDelay(1000);
  if (values.password.toLowerCase() === "invalid") {
    throw new Error("That email is already registered.");
  }
  return { success: true as const };
}

export async function mockLogin(values: LoginValues) {
  await simulateDelay(900);
  if (values.password.toLowerCase() === "invalid") {
    throw new Error("Incorrect email/username or password.");
  }
  return { success: true as const };
}

export async function mockAdminLogin(values: LoginValues) {
  await simulateDelay(900);
  if (values.password.toLowerCase() === "invalid") {
    throw new Error("Incorrect email/username or password.");
  }
  return { success: true as const };
}

export async function mockForgotPassword(values: ForgotPasswordValues) {
  await simulateDelay(900);
  if (values.email.toLowerCase() === "notfound@example.com") {
    throw new Error("We could not find an account with that email.");
  }
  return { success: true as const };
}

export async function mockResetPassword(values: ResetPasswordValues) {
  await simulateDelay(900);
  return { success: true as const, password: values.password };
}

export async function mockResendVerification() {
  await simulateDelay(700);
  return { success: true as const };
}

export async function mockVerifyEmail() {
  await simulateDelay(1200);
  return { success: true as const };
}
