import NextAuth from "next-auth";
import Keycloak from "next-auth/providers/keycloak";
import { requireServerEnv } from "@/lib/env";
import { extractUserAttributes } from "@/lib/user-attributes";

type KeycloakProfile = {
  sub: string;
  preferred_username?: string;
  email?: string;
  name?: string;
  given_name?: string;
  family_name?: string;
  groups?: string[];
  attributes?: Record<string, string | string[]>;
  awsRole?: string | string[];
  aliyunRole?: string | string[];
  [key: string]: unknown;
};

function splitGroups(value?: string | string[] | null) {
  if (!value) return [];
  if (Array.isArray(value)) return value.filter(Boolean);

  return value
    .split(/[\s,]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

const serverEnv = requireServerEnv();

export const { handlers, auth, signIn, signOut } = NextAuth({
  trustHost: true,
  debug: true,
  session: {
    strategy: "jwt",
  },
  logger: {
    error(error) {
      console.error("[auth-logger][error]", error);
    },
    warn(code) {
      console.warn("[auth-logger][warn]", code);
    },
    debug(message, metadata) {
      console.log("[auth-logger][debug]", message, metadata);
    },
  },
  providers: [
    Keycloak({
      issuer: serverEnv.KEYCLOAK_ISSUER,
      clientId: serverEnv.KEYCLOAK_CLIENT_ID,
      clientSecret: serverEnv.KEYCLOAK_CLIENT_SECRET,
      checks: ["state"],
      authorization: {
        params: {
          scope: serverEnv.KEYCLOAK_SCOPE ?? "openid profile email groups",
        },
      },
      profile(profile) {
        const typed = profile as KeycloakProfile;
        return {
          id: typed.sub,
          name: typed.name ?? typed.preferred_username ?? typed.email ?? typed.sub,
          email: typed.email,
          image: null,
          groups: typed.groups ?? [],
          username: typed.preferred_username,
          attributes: extractUserAttributes(profile as Record<string, unknown>),
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, profile, account }) {
      if (profile) {
        const typed = profile as KeycloakProfile;
        token.groups = typed.groups ?? splitGroups((profile as Record<string, unknown>).groups as string | string[] | undefined);
        token.preferred_username = typed.preferred_username ?? token.preferred_username;
        token.name = typed.name ?? token.name;
        token.email = typed.email ?? token.email;
        token.attributes = extractUserAttributes(profile as Record<string, unknown>);
      }

      if (account?.access_token) token.accessToken = account.access_token;
      if (account?.id_token) token.idToken = account.id_token;

      return token;
    },
    async session({ session, token }) {
      session.user.id = token.sub ?? "";
      session.user.groups = Array.isArray(token.groups) ? (token.groups as string[]) : [];
      session.user.username = typeof token.preferred_username === "string" ? token.preferred_username : undefined;
      session.user.attributes = (token.attributes ?? {}) as Record<string, string | string[]>;
      session.accessToken = typeof token.accessToken === "string" ? token.accessToken : undefined;
      session.idToken = typeof token.idToken === "string" ? token.idToken : undefined;
      return session;
    },
  },
  pages: {
    signIn: "/signin",
  },
});
