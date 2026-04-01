import { NextResponse } from "next/server";
import { clearPortalSession } from "@/lib/session";
import { getBaseUrl } from "@/lib/oidc";

export async function GET() {
  await clearPortalSession();
  return NextResponse.redirect(`${getBaseUrl()}/signin`);
}
