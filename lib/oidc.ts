import * as oidc from "openid-client";
import { cookies } from "next/headers";
import { jwtVerify, createRemoteJWKSet } from "jose";
import { extractUserAttributes } from "@/lib/user-attributes";
import type { PortalSession } from "@/lib/session";

const OIDC_CONTEXT_COOKIE = "portal_oidc_ctx";

type OidcConfig = Awaited<ReturnType<typeof oidc.discovery>>;

type OidcCookieContext = {
  state: string;
  nonce: string;
};

function requireEnv(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is required`);
  return value;
}

function getBaseUrl() {
  const value = requireEnv("AUTH_URL");
  return value.replace(/\/$/, "");
}

function getCookieDomain() {
  const hostname = new URL(getBaseUrl()).hostname;
  return hostname;
}

function getRedirectUri() {
  return `${getBaseUrl()}/callback`;
}

function getCookieOptions(maxAge: number) {
  return {
    httpOnly: true as const,
    secure: true as const,
    sameSite: "lax" as const,
    path: "/",
    domain: getCookieDomain(),
    maxAge,
  };
}

async function getOidcConfiguration(): Promise<OidcConfig> {
  const issuerUrl = requireEnv("KEYCLOAK_ISSUER");
  const clientId = requireEnv("KEYCLOAK_CLIENT_ID");
  const clientSecret = requireEnv("KEYCLOAK_CLIENT_SECRET");

  const server = new URL(issuerUrl);
  return oidc.discovery(server, clientId, clientSecret);
}

export async function createAuthorizationUrl() {
  const cookieStore = await cookies();
  const config = await getOidcConfiguration();
  const state = oidc.randomState();
  const nonce = oidc.randomNonce();
  const payload = Buffer.from(JSON.stringify({ state, nonce }), "utf8").toString("base64url");

  cookieStore.set(OIDC_CONTEXT_COOKIE, payload, getCookieOptions(60 * 10));

  const url = oidc.buildAuthorizationUrl(config, {
    redirect_uri: getRedirectUri(),
    scope: process.env.KEYCLOAK_SCOPE ?? "openid profile email",
    state,
    nonce,
    response_type: "code",
  });

  return url.toString();
}

async function readOidcContext(): Promise<OidcCookieContext | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(OIDC_CONTEXT_COOKIE)?.value;
  if (!raw) return null;

  try {
    return JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as OidcCookieContext;
  } catch {
    return null;
  }
}

function decodeJwtPayload(token: string) {
  const [, payload] = token.split(".");
  if (!payload) throw new Error("Invalid ID token format");
  return JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as Record<string, unknown>;
}

export async function handleCallback(currentUrl: string): Promise<PortalSession> {
  const cookieStore = await cookies();
  const oidcContext = await readOidcContext();
  const config = await getOidcConfiguration();

  if (!oidcContext?.state || !oidcContext?.nonce) {
    throw new Error("Missing OIDC state or nonce cookie");
  }

  const current = new URL(currentUrl);
  const code = current.searchParams.get("code");
  const state = current.searchParams.get("state");

  if (!code) throw new Error("Missing authorization code");
  if (state !== oidcContext.state) throw new Error("OIDC state mismatch");

  const tokenEndpoint = config.serverMetadata().token_endpoint;
  if (!tokenEndpoint) throw new Error("Missing token endpoint in issuer metadata");

  const body = new URLSearchParams({
    grant_type: "authorization_code",
    code,
    redirect_uri: getRedirectUri(),
    client_id: requireEnv("KEYCLOAK_CLIENT_ID"),
    client_secret: requireEnv("KEYCLOAK_CLIENT_SECRET"),
  });

  const tokenResponse = await fetch(tokenEndpoint, {
    method: "POST",
    headers: {
      "content-type": "application/x-www-form-urlencoded",
    },
    body: body.toString(),
    cache: "no-store",
  });

  if (!tokenResponse.ok) {
    const text = await tokenResponse.text();
    throw new Error(`Token exchange failed: ${text}`);
  }

  const tokenJson = (await tokenResponse.json()) as {
    access_token: string;
    id_token: string;
    expires_in?: number;
    token_type?: string;
  };

  const jwksUri = config.serverMetadata().jwks_uri;
  if (!jwksUri) throw new Error("Missing jwks_uri in issuer metadata");

  const JWKS = createRemoteJWKSet(new URL(jwksUri));
  const { payload } = await jwtVerify(tokenJson.id_token, JWKS, {
    issuer: requireEnv("KEYCLOAK_ISSUER"),
    audience: requireEnv("KEYCLOAK_CLIENT_ID"),
  });

  if (payload.nonce !== oidcContext.nonce) {
    throw new Error("OIDC nonce mismatch");
  }

  const claims = decodeJwtPayload(tokenJson.id_token);
  const userinfo = tokenJson.access_token
    ? ((await oidc.fetchUserInfo(config, tokenJson.access_token, String(payload.sub ?? claims.sub ?? ""))) as Record<string, unknown>)
    : {};
  const merged = { ...claims, ...userinfo } as Record<string, unknown>;
  const groups = Array.isArray(merged.groups) ? (merged.groups as string[]) : [];
  const attributes = extractUserAttributes(merged);

  cookieStore.set(OIDC_CONTEXT_COOKIE, "", getCookieOptions(0));

  return {
    user: {
      sub: String(merged.sub ?? claims.sub ?? ""),
      name: typeof merged.name === "string" ? merged.name : undefined,
      email: typeof merged.email === "string" ? merged.email : undefined,
      preferredUsername: typeof merged.preferred_username === "string" ? merged.preferred_username : undefined,
      groups,
      attributes: {},
      canAccessAws: Boolean(attributes.awsrole),
      canAccessAliyun: Boolean(attributes.aliyunrole),
      canAccessCloudflare: groups.some((g) => ["cloudflare", "cloudflare-access", "devops", "platform", "cloud-admin"].includes(g.toLowerCase())),
    },
    expiresAt: tokenJson.expires_in ? Math.floor(Date.now() / 1000) + tokenJson.expires_in : undefined,
  };
}

export function getLogoutUrl() {
  const issuer = requireEnv("KEYCLOAK_ISSUER");
  const endSession = `${issuer}/protocol/openid-connect/logout`;
  const url = new URL(endSession);
  url.searchParams.set("post_logout_redirect_uri", `${getBaseUrl()}/signin`);
  return url.toString();
}

export { getBaseUrl };
