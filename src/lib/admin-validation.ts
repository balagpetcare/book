import { z } from "zod";

const INVISIBLE_FORMATTING_CHARS_RE = new RegExp("[\\u200B\\u200C\\u200D\\uFEFF]", "g");

// Canonical email normalization shared by the login form and the API route.
// Only strips proven-accidental invisible/zero-width formatting characters
// (zero-width space/non-joiner/joiner, BOM) in addition to trim + lowercase.
// Never mutates the password.
export function normalizeLoginEmail(value: string): string {
  return value.replace(INVISIBLE_FORMATTING_CHARS_RE, "").trim().toLowerCase();
}

export const loginSchema = z.object({
  email: z.preprocess((v) => (typeof v === "string" ? normalizeLoginEmail(v) : v), z.string().max(160).email()),
  password: z.string().min(1).max(200),
});

export type LoginFieldError = "empty_email" | "invalid_email" | "empty_password";

// Pure, testable request-building logic used by the actual login form's submit
// handler, so client-side validation can be exercised without a real DOM/browser.
export function buildLoginRequestBody(rawEmail: string, rawPassword: string): { ok: true; body: { email: string; password: string } } | { ok: false; error: LoginFieldError } {
  const email = normalizeLoginEmail(rawEmail);
  if (!email) return { ok: false, error: "empty_email" };
  if (!z.string().email().safeParse(email).success) return { ok: false, error: "invalid_email" };
  if (!rawPassword) return { ok: false, error: "empty_password" };
  return { ok: true, body: { email, password: rawPassword } };
}
export const paymentActionSchema = z.object({ action: z.enum(["VERIFY", "REJECT"]), reason: z.string().max(300).optional() });
export const orderActionSchema = z.object({ action: z.enum(["PACK", "SHIP", "DELIVER", "CANCEL", "RETURN", "RESTOCK_RETURN"]), carrierName: z.string().max(100).optional(), trackingNumber: z.string().max(100).optional() });
export const settingsSchema = z.object({ title: z.string().trim().min(1).max(200), description: z.string().max(2000).optional(), prepaidPrice: z.coerce.number().int().nonnegative(), bangladeshPostDeliveryCharge: z.coerce.number().int().nonnegative().optional(), courierDeliveryCharge: z.coerce.number().int().nonnegative().optional(), courierTotalPrice: z.coerce.number().int().nonnegative().optional(), courierAdvance: z.coerce.number().int().nonnegative(), courierDue: z.coerce.number().int().nonnegative().optional(), bkashNumber: z.string().trim().min(5).max(30), nagadNumber: z.string().trim().min(5).max(30), stockAdjustment: z.coerce.number().int().optional() });
export const reviewActionSchema = z.object({ action: z.enum(["APPROVE", "HIDE", "REJECT"]) });
