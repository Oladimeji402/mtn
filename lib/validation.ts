import { z } from "zod";
import {
  MAX_AIRTIME_AMOUNT,
  MAX_FUNDING_AMOUNT,
  MIN_AIRTIME_AMOUNT,
  MIN_FUNDING_AMOUNT,
  MTN_PREFIXES,
} from "@/lib/constants";

const nigerianPhoneRegex = /^0\d{10}$/;

export function isMtnNumber(phone: string) {
  const digits = phone.replace(/\s/g, "");
  return MTN_PREFIXES.some((prefix) => digits.startsWith(prefix));
}

/** General Nigerian phone number — used for contact numbers (any network). */
export const nigerianPhoneSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => nigerianPhoneRegex.test(v), {
    message: "Enter a valid 11-digit Nigerian phone number",
  });

/** MTN-only — used where the number is the actual recipient of a purchase. */
export const phoneNumberSchema = z
  .string()
  .trim()
  .min(1, "Phone number is required")
  .transform((v) => v.replace(/\s/g, ""))
  .refine((v) => nigerianPhoneRegex.test(v), {
    message: "Enter a valid 11-digit Nigerian phone number",
  })
  .refine((v) => isMtnNumber(v), {
    message: "This does not look like an MTN number",
  });

export const usernameSchema = z
  .string()
  .trim()
  .min(3, "Username must be at least 3 characters")
  .max(20, "Username must be at most 20 characters")
  .regex(/^[a-zA-Z0-9_.]+$/, "Only letters, numbers, dots and underscores allowed");

export const emailSchema = z.string().trim().min(1, "Email is required").email("Enter a valid email address");

export const passwordSchema = z
  .string()
  .min(8, "At least 8 characters")
  .regex(/[A-Z]/, "At least one uppercase letter")
  .regex(/[a-z]/, "At least one lowercase letter")
  .regex(/[0-9]/, "At least one number");

export const signupSchema = z
  .object({
    username: usernameSchema,
    email: emailSchema,
    phone: nigerianPhoneSchema,
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
    agreeToTerms: z.boolean().refine((v) => v === true, {
      message: "Agree to the Terms & Conditions",
    }),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type SignupValues = z.infer<typeof signupSchema>;

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type LoginValues = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: emailSchema,
});

export type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, "Confirm your password"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const fundWalletSchema = z.object({
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount" })
    .min(MIN_FUNDING_AMOUNT, `Minimum funding amount is ₦${MIN_FUNDING_AMOUNT.toLocaleString()}`)
    .max(MAX_FUNDING_AMOUNT, `Maximum funding amount is ₦${MAX_FUNDING_AMOUNT.toLocaleString()}`),
});

export type FundWalletValues = z.infer<typeof fundWalletSchema>;

export const buyAirtimeSchema = z.object({
  phoneNumber: phoneNumberSchema,
  amount: z.coerce
    .number({ invalid_type_error: "Enter an amount" })
    .min(MIN_AIRTIME_AMOUNT, `Minimum airtime amount is ₦${MIN_AIRTIME_AMOUNT.toLocaleString()}`)
    .max(MAX_AIRTIME_AMOUNT, `Maximum airtime amount is ₦${MAX_AIRTIME_AMOUNT.toLocaleString()}`),
});

export type BuyAirtimeValues = z.infer<typeof buyAirtimeSchema>;

export const buyDataSchema = z.object({
  phoneNumber: phoneNumberSchema,
  dataPlanId: z.string().min(1, "Select a data plan"),
});

export type BuyDataValues = z.infer<typeof buyDataSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: passwordSchema,
    confirmPassword: z.string().min(1, "Please confirm your new password"),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export type ChangePasswordValues = z.infer<typeof changePasswordSchema>;

export const adminLoginSchema = z.object({
  identifier: z.string().trim().min(1, "Email or username is required"),
  password: z.string().min(1, "Password is required"),
});

export type AdminLoginValues = z.infer<typeof adminLoginSchema>;

export const adminSettingsSchema = z.object({
  maxPurchaseDataGB: z.coerce.number().min(0.5, "Must be at least 0.5GB").max(50),
});

export type AdminSettingsValues = z.infer<typeof adminSettingsSchema>;
