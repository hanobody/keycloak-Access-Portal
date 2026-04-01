import { cookies } from "next/headers";
import { sealData, unsealData } from "iron-session";

export type PortalSession = {
  user: {
    sub: string;
    name?: string;
    email?: string;
    preferredUsername?: string;
    groups: string[];
    attributes: Record<string, string | string[]>;
    canAccessAws: boolean;
    canAccessAliyun: boolean;
    canAccessCloudflare: boolean;
  };
  expiresAt?: number;
};

const COOKIE_NAME = "portal_session";

function getPassword() {
  const password = process.env.AUTH_SECRET;
  if (!password || password.length < 16) {
    throw new Error("AUTH_SECRET is missing or too short");
  }
  return password;
}

export async function readPortalSession(): Promise<PortalSession | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(COOKIE_NAME)?.value;
  if (!raw) return null;

  try {
    const session = await unsealData<PortalSession>(raw, { password: getPassword() });
    return session ?? null;
  } catch {
    return null;
  }
}

export async function writePortalSession(session: PortalSession) {
  const cookieStore = await cookies();
  const sealed = await sealData(session, { password: getPassword() });

  cookieStore.set(COOKIE_NAME, sealed, {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
}

export async function clearPortalSession() {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, "", {
    httpOnly: true,
    secure: true,
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
