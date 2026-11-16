import { NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/utils/apiConfig";
import { buildDynamicVisionFallback } from "@/components/track-h/lookbookPresets";
import {
  AcpDelegatedCheckoutSchema,
  AcpTokenDelegateSchema,
  BundleNegotiateSchema,
  CreateInterestWatcherSchema,
  PriceProtectionScanSchema,
  ScreenshotDecomposeRequestSchema,
} from "@/lib/validators/trackHSchemas";

const GET_MAP: Record<string, (sp: URLSearchParams) => string> = {
  "acp-manifest": () => "/api/v1/acp/manifest",
  "acp-sessions": () => "/api/v1/acp/sessions",
  interests: (sp) => `/api/v1/interests?user_id=${encodeURIComponent(sp.get("user_id") || "usr_demo123")}`,
  "vision-presets": () => "/api/v1/vision-trip/presets",
  "price-guard": (sp) => `/api/v1/price-guard?user_id=${encodeURIComponent(sp.get("user_id") || "usr_demo123")}`,
  "pulse-actions": () => "/api/v1/pulse/actions",
};

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "pulse-actions";
  const pathBuilder = GET_MAP[action];
  if (!pathBuilder) {
    return NextResponse.json({ detail: "Unsupported Track H action" }, { status: 400 });
  }
  const base = getServerApiBaseUrl(req.headers.get("host"));
  try {
    const res = await fetch(`${base}${pathBuilder(req.nextUrl.searchParams)}`, {
      cache: "no-store",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    if (action === "pulse-actions") {
      return NextResponse.json({ status: "FALLBACK", cards: [] }, { status: 200 });
    }
    return NextResponse.json({ detail: "Backend unavailable", fallback: true }, { status: 503 });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action || "");
  const payload = body.payload ?? body;
  const base = getServerApiBaseUrl(req.headers.get("host"));

  let targetPath = "";
  let validated: unknown;

  try {
    if (action === "acp-delegate") {
      validated = AcpTokenDelegateSchema.parse(payload);
      targetPath = "/api/v1/acp/tokens/delegate";
    } else if (action === "acp-checkout") {
      validated = AcpDelegatedCheckoutSchema.parse(payload);
      targetPath = "/api/v1/acp/checkout";
    } else if (action === "create-interest") {
      validated = CreateInterestWatcherSchema.parse(payload);
      targetPath = "/api/v1/interests";
    } else if (action === "evaluate-interest") {
      targetPath = `/api/v1/interests/${encodeURIComponent(String(body.interest_id || ""))}/evaluate`;
      validated = {};
    } else if (action === "vision-decompose") {
      validated = ScreenshotDecomposeRequestSchema.parse(payload);
      targetPath = "/api/v1/vision-trip/decompose-screenshot";
    } else if (action === "price-guard-scan") {
      validated = PriceProtectionScanSchema.parse(payload);
      targetPath = "/api/v1/price-guard/scan-drops";
    } else if (action === "negotiate-bundle") {
      validated = BundleNegotiateSchema.parse(payload);
      targetPath = "/api/v1/trips/negotiate-bundle";
    } else if (action === "pulse-execute") {
      targetPath = `/api/v1/pulse/actions/${encodeURIComponent(String(body.action_id || ""))}/execute`;
      validated = { user_id: String(body.user_id || "usr_demo123") };
    } else {
      return NextResponse.json({ detail: "Unsupported Track H mutation" }, { status: 400 });
    }
  } catch (err: unknown) {
    return NextResponse.json({ detail: "Validation failed", error: String(err) }, { status: 422 });
  }

  try {
    const res = await fetch(`${base}${targetPath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(validated),
      signal: AbortSignal.timeout(7000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    if (action === "vision-decompose") {
      const fb = buildDynamicVisionFallback(validated as Record<string, string>);
      if (fb) return NextResponse.json(fb, { status: 200 });
    }
    return NextResponse.json({ detail: "Track H backend proxy failed" }, { status: 503 });
  }
}

export async function DELETE(req: NextRequest) {
  const interestId = req.nextUrl.searchParams.get("interest_id");
  if (!interestId) {
    return NextResponse.json({ detail: "Missing interest_id" }, { status: 400 });
  }
  const base = getServerApiBaseUrl(req.headers.get("host"));
  try {
    const res = await fetch(`${base}/api/v1/interests/${encodeURIComponent(interestId)}`, {
      method: "DELETE",
      signal: AbortSignal.timeout(5000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({ detail: "Delete proxy failed" }, { status: 503 });
  }
}
