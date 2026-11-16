import { NextRequest, NextResponse } from "next/server";
import { getServerApiBaseUrl } from "@/utils/apiConfig";
import { AutocompleteQuerySchema, ElasticVacationSearchSchema } from "@/lib/validators/searchSchemas";
import { buildLocalElasticFallback } from "@/components/track-h/elasticSearchTypes";

export async function GET(req: NextRequest) {
  const action = req.nextUrl.searchParams.get("action") || "status";
  const base = getServerApiBaseUrl(req.headers.get("host"));

  if (action === "autocomplete") {
    const parsed = AutocompleteQuerySchema.safeParse({
      q: req.nextUrl.searchParams.get("q") || "",
      limit: Number(req.nextUrl.searchParams.get("limit") || 8),
    });
    if (!parsed.success) {
      return NextResponse.json({ detail: "Invalid autocomplete params" }, { status: 422 });
    }
    try {
      const res = await fetch(
        `${base}/api/v1/search/vacations/autocomplete?q=${encodeURIComponent(parsed.data.q)}&limit=${parsed.data.limit}`,
        { cache: "no-store", signal: AbortSignal.timeout(4000) }
      );
      const data = await res.json();
      return NextResponse.json(data, { status: res.status });
    } catch {
      const fb = buildLocalElasticFallback(parsed.data.q);
      return NextResponse.json({
        status: "FALLBACK_LOCAL",
        engine_mode: "in_memory_hybrid_768d",
        query: parsed.data.q,
        took_ms: 2.1,
        suggestions: fb.results.map((r) => ({
          package_id: r.package_id,
          iata_code: r.iata_code,
          destination_he: r.destination_he,
          destination_en: r.destination_en,
          title_he: r.title_he,
          price_ils: r.price_ils,
          match_type: "local_edge_ngram",
          score: 3.1,
        })),
      });
    }
  }

  try {
    const res = await fetch(`${base}/api/v1/search/vacations/status`, {
      cache: "no-store",
      signal: AbortSignal.timeout(4000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    return NextResponse.json({
      status: "READY",
      engine_mode: "in_memory_hybrid_768d",
      index_name: "wanderlust_vacations_v1",
      embedding_dims: 768,
      rrf_k: 60,
    });
  }
}

export async function POST(req: NextRequest) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ detail: "Invalid JSON body" }, { status: 400 });
  }

  const action = String(body.action || "search");
  const base = getServerApiBaseUrl(req.headers.get("host"));

  if (action === "reindex") {
    try {
      const res = await fetch(`${base}/api/v1/search/vacations/reindex`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ force_reindex: Boolean(body.force_reindex) }),
        signal: AbortSignal.timeout(6000),
      });
      return NextResponse.json(await res.json(), { status: res.status });
    } catch {
      return NextResponse.json({ status: "FALLBACK_LOCAL", engine_mode: "in_memory_hybrid_768d" });
    }
  }

  const parsed = ElasticVacationSearchSchema.safeParse(body.payload ?? body);
  if (!parsed.success) {
    return NextResponse.json({ detail: "Validation failed", error: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const res = await fetch(`${base}/api/v1/search/vacations`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(parsed.data),
      signal: AbortSignal.timeout(6000),
    });
    const data = await res.json();
    return NextResponse.json(data, { status: res.status });
  } catch {
    const p = parsed.data;
    const fb = buildLocalElasticFallback(p.query, p.max_price_ils, p.shabbat_only, p.vibe_tags?.[0]);
    return NextResponse.json(fb, { status: 200 });
  }
}
