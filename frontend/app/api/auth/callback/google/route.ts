import { NextRequest, NextResponse } from "next/server";

function getPublicOrigin(request: NextRequest): string {
  // If explicitly configured in env, respect that first
  if (process.env.NEXT_PUBLIC_APP_URL && !process.env.NEXT_PUBLIC_APP_URL.includes("0.0.0.0")) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  }

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  const host = forwardedHost || request.headers.get("host") || "";

  // If host is missing or 0.0.0.0, fallback to localhost:3000
  if (!host || host.includes("0.0.0.0")) {
    return "http://localhost:3000";
  }

  const proto = forwardedProto || (request.nextUrl.protocol.replace(":", "") || "http");
  return `${proto}://${host}`;
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const state = searchParams.get("state");

  const baseUrl = getPublicOrigin(request);
  const redirectTarget = state ? decodeURIComponent(state) : "/";

  if (error) {
    console.error("Google OAuth error from provider:", error);
    return NextResponse.redirect(
      new URL(`/login?error=google_access_denied&message=${encodeURIComponent(error)}`, baseUrl)
    );
  }

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_oauth_code", baseUrl)
    );
  }

  try {
    const apiBase =
      process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

    // Exact redirectUri matching Google Cloud Console authorization
    const redirectUri = `${baseUrl}/api/auth/callback/google`;

    const backendRes = await fetch(`${apiBase}/api/auth/google`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        code,
        redirect_uri: redirectUri,
      }),
    });

    const data = await backendRes.json();

    if (!backendRes.ok || !data.access_token) {
      console.error("Backend failed to exchange Google code:", data);
      const errMsg = data.detail || "האימות מול Google נכשל בשרת";
      return NextResponse.redirect(
        new URL(`/login?error=google_auth_failed&message=${encodeURIComponent(errMsg)}`, baseUrl)
      );
    }

    // Auth succeeded! Set cookies and redirect to destination with auth_token parameter
    const targetUrl = new URL(redirectTarget, baseUrl);
    targetUrl.searchParams.set("auth_token", data.access_token);

    const response = NextResponse.redirect(targetUrl);

    // Cookie expires in 7 days
    const maxAge = 60 * 60 * 24 * 7;
    response.cookies.set("wanderlust_auth_token", data.access_token, {
      path: "/",
      maxAge,
      sameSite: "lax",
    });

    response.cookies.set("wanderlust_user", JSON.stringify(data.user), {
      path: "/",
      maxAge,
      sameSite: "lax",
    });

    return response;
  } catch (err: any) {
    console.error("Exception during Google OAuth callback processing:", err);
    return NextResponse.redirect(
      new URL("/login?error=oauth_server_error", baseUrl)
    );
  }
}
