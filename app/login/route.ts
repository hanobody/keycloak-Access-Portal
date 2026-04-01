import { NextResponse } from "next/server";
import { createAuthorizationUrl } from "@/lib/oidc";

export async function GET() {
  const url = await createAuthorizationUrl();
  return NextResponse.redirect(url);
}
