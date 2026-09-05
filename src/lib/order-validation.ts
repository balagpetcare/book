import { z } from "zod";

export function normalizeBangladeshMobile(value: string) {
  const compact = value.trim().replace(/[\s-]/g, "");
  if (compact.startsWith("+880")) return `0${compact.slice(4)}`;
  if (compact.startsWith("880")) return `0${compact.slice(3)}`;
  return compact;
}

export const orderInputSchema = z.object({
  customerName: z.string().trim().min(2).max(120), mobile: z.string().trim().min(1),
  district: z.string().trim().min(2).max(80), upazilaOrThana: z.string().trim().min(2).max(100),
  fullAddress: z.string().trim().min(5).max(500), postalCode: z.string().trim().max(4).optional(),
  plan: z.enum(["PREPAID_350", "COURIER_ADVANCE_100"]), paymentMethod: z.enum(["BKASH", "NAGAD"]), senderMobile: z.string().trim().min(1), transactionId: z.string().trim().min(3).max(80), amount: z.coerce.number().int().positive(), proofImagePath: z.string().optional(),
}).superRefine((data, ctx) => {
  const mobile = normalizeBangladeshMobile(data.mobile); const sender = normalizeBangladeshMobile(data.senderMobile);
  if (!/^01\d{9}$/.test(mobile)) ctx.addIssue({ code: "custom", path: ["mobile"], message: "Enter a valid Bangladesh mobile number." });
  if (!/^01\d{9}$/.test(sender)) ctx.addIssue({ code: "custom", path: ["senderMobile"], message: "Enter a valid Bangladesh mobile number." });
  if (data.postalCode && !/^\d{4}$/.test(data.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Postal Code must be 4 digits." });
});

export const orderCaptureSchema = z.object({
  customerName: z.string().trim().min(2).max(120), mobile: z.string().trim().min(1),
  district: z.string().trim().min(2).max(80), upazilaOrThana: z.string().trim().min(2).max(100),
  fullAddress: z.string().trim().min(5).max(500), postalCode: z.string().trim().max(4).optional(),
  plan: z.enum(["PREPAID_350", "COURIER_ADVANCE_100"]),
}).superRefine((data, ctx) => {
  if (!/^01\d{9}$/.test(normalizeBangladeshMobile(data.mobile))) ctx.addIssue({ code: "custom", path: ["mobile"], message: "Enter a valid Bangladesh mobile number." });
  if (data.postalCode && !/^\d{4}$/.test(data.postalCode)) ctx.addIssue({ code: "custom", path: ["postalCode"], message: "Postal Code must be 4 digits." });
});

export const paymentInputSchema = z.object({ paymentMethod: z.enum(["BKASH", "NAGAD"]), senderMobile: z.string().trim().min(1), transactionId: z.string().trim().min(3).max(80) }).superRefine((data, ctx) => {
  if (!/^01\d{9}$/.test(normalizeBangladeshMobile(data.senderMobile))) ctx.addIssue({ code: "custom", path: ["senderMobile"], message: "Enter a valid Bangladesh mobile number." });
});
