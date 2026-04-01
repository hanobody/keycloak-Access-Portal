import { z } from "zod";

const envSchema = z.object({
  AUTH_SECRET: z.string().min(16).optional(),
  AUTH_URL: z.string().url().optional(),
  KEYCLOAK_ISSUER: z.string().url().optional(),
  KEYCLOAK_CLIENT_ID: z.string().min(1).optional(),
  KEYCLOAK_CLIENT_SECRET: z.string().min(1).optional(),
  KEYCLOAK_SCOPE: z.string().optional(),
  PORTAL_TITLE: z.string().default("Optlink Access Portal"),
  PORTAL_SUBTITLE: z.string().default("统一入口，按 Keycloak 用户组动态展示可访问系统"),
});

export const env = envSchema.parse({
  AUTH_SECRET: process.env.AUTH_SECRET,
  AUTH_URL: process.env.AUTH_URL,
  KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
  KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
  KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
  KEYCLOAK_SCOPE: process.env.KEYCLOAK_SCOPE,
  PORTAL_TITLE: process.env.PORTAL_TITLE,
  PORTAL_SUBTITLE: process.env.PORTAL_SUBTITLE,
});

export function requireServerEnv() {
  return z
    .object({
      AUTH_SECRET: z.string().min(16),
      KEYCLOAK_ISSUER: z.string().url(),
      KEYCLOAK_CLIENT_ID: z.string().min(1),
      KEYCLOAK_CLIENT_SECRET: z.string().min(1),
      KEYCLOAK_SCOPE: z.string().optional(),
    })
    .parse({
      AUTH_SECRET: process.env.AUTH_SECRET,
      KEYCLOAK_ISSUER: process.env.KEYCLOAK_ISSUER,
      KEYCLOAK_CLIENT_ID: process.env.KEYCLOAK_CLIENT_ID,
      KEYCLOAK_CLIENT_SECRET: process.env.KEYCLOAK_CLIENT_SECRET,
      KEYCLOAK_SCOPE: process.env.KEYCLOAK_SCOPE,
    });
}
