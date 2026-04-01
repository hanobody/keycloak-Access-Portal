import { NextResponse } from "next/server";
import { getBaseUrl, handleCallback } from "@/lib/oidc";
import { writePortalSession } from "@/lib/session";

export async function GET(request: Request) {
  try {
    const session = await handleCallback(request.url);
    await writePortalSession(session);
    return NextResponse.redirect(`${getBaseUrl()}/`);
  } catch (error) {
    console.error("[portal-callback-error]", error);
    const target = new URL(`${getBaseUrl()}/signin`);
    target.searchParams.set("error", error instanceof Error ? error.message : "callback");
    return NextResponse.redirect(target.toString());
  }
}
