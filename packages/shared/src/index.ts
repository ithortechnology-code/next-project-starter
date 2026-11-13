import { z } from "zod";

export const healthResponseSchema = z.object({
  status: z.literal("ok"),
  service: z.string(),
  database: z.enum(["connected", "unavailable"]),
});

export type HealthResponse = z.infer<typeof healthResponseSchema>;

export const HEALTH_PATH = "/health";
