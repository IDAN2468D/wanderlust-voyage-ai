import { z } from "zod";

export const GeoFilterSchema = z.object({
  anchor_id: z.string().max(64).optional(),
  lat: z.number().min(-90).max(90).optional(),
  lon: z.number().min(-180).max(180).optional(),
  radius_km: z.number().min(0.5).max(2000).default(25),
});

export const ElasticVacationSearchSchema = z.object({
  query: z.string().max(300).default(""),
  vibe_tags: z.array(z.string().max(40)).optional(),
  min_price_ils: z.number().min(0).max(200000).optional(),
  max_price_ils: z.number().min(100).max(200000).optional(),
  min_stars: z.number().int().min(1).max(5).optional(),
  shabbat_only: z.boolean().default(false),
  weather_badge: z.string().max(40).optional(),
  geo_filter: GeoFilterSchema.optional(),
  limit: z.number().int().min(1).max(24).default(8),
  use_hybrid_rrf: z.boolean().default(true),
  sort_by: z.enum(["rrf", "price_asc", "distance"]).default("rrf"),
});

export const AutocompleteQuerySchema = z.object({
  q: z.string().max(120).default(""),
  limit: z.number().int().min(1).max(20).default(8),
});

export type ElasticVacationSearchInput = z.infer<typeof ElasticVacationSearchSchema>;
