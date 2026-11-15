import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  database: z.enum(["connected", "unavailable"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

// auth-recipe:start
export const authEmailSchema = z.email().trim();
export const authPasswordSchema = z.string().min(8).max(128);

export const signUpSchema = z
  .object({
    name: z.string().trim().min(1, "Enter your name.").max(255),
    email: authEmailSchema,
    password: authPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const signInSchema = z.object({
  email: authEmailSchema,
  password: z.string().min(1, "Enter your password.").max(128),
});

export const resetPasswordSchema = z
  .object({
    password: authPasswordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.password === value.confirmPassword, {
    path: ["confirmPassword"],
    message: "Passwords do not match.",
  });

export const authSessionResponseSchema = z
  .object({
    user: z
      .object({
        id: z.string(),
        name: z.string(),
        email: authEmailSchema,
        emailVerified: z.boolean(),
      })
      .passthrough(),
    session: z
      .object({
        userId: z.string(),
        expiresAt: z.string(),
      })
      .passthrough(),
  })
  .passthrough();

export type AuthSessionResponse = z.infer<typeof authSessionResponseSchema>;

// auth-recipe:end

export const HEALTH_PATH = "/health";
