import { z } from "zod";

export const AcpTokenDelegateSchema = z.object({
  external_agent_provider: z
    .enum(["OPENAI_ACP", "PERPLEXITY_PRO", "GOOGLE_UCP", "AMAZON_BUY_FOR_ME", "CLAUDE_MCP"])
    .default("OPENAI_ACP"),
  user_id: z.string().min(2).max(64).default("usr_demo123"),
  max_authorized_ils: z.number().positive().max(100000),
  allowed_categories: z.array(z.string()).min(1).default(["FLIGHT", "HOTEL", "PACKAGE"]),
  ttl_minutes: z.number().int().min(5).max(1440).default(60),
});

export const AcpDelegatedCheckoutSchema = z.object({
  external_agent_provider: z
    .enum(["OPENAI_ACP", "PERPLEXITY_PRO", "GOOGLE_UCP", "AMAZON_BUY_FOR_ME", "CLAUDE_MCP"])
    .default("OPENAI_ACP"),
  user_id: z.string().min(2).max(64).default("usr_demo123"),
  delegated_token: z.string().optional(),
  max_authorized_ils: z.number().positive().max(100000),
  destination: z.string().min(2).max(120).default("Santorini"),
  origin: z.string().min(2).max(16).default("TLV"),
  duration_days: z.number().int().min(1).max(30).default(5),
  sku_codes: z.array(z.string().min(3).max(40)).min(1).max(10),
  fulfillment_mode: z.enum(["DIGITAL_VOUCHER", "TEL_AVIV_LOCKER", "VIP_CONCIERGE"]).default("DIGITAL_VOUCHER"),
  shabbat_safe_mode: z.boolean().default(false),
});

export const CreateInterestWatcherSchema = z.object({
  user_id: z.string().min(2).max(64).default("usr_demo123"),
  raw_prompt_hebrew: z.string().min(4, "תיאור תחום העניין חייב להכיל לפחות 4 תווים").max(280),
  target_category: z
    .enum(["ALL", "FLIGHTS", "HOTELS", "PACKAGES", "SHABBAT_FRIENDLY", "LUXURY"])
    .default("ALL"),
  max_price_ils: z.number().min(100).max(50000),
  auto_reserve_vip: z.boolean().default(false),
});

export const ScreenshotDecomposeRequestSchema = z.object({
  scene_type: z
    .enum([
      "SANTORINI_CLIFFSIDE",
      "TOKYO_NEON_FOOD",
      "SWISS_ALPINE_CHALET",
      "AMALFI_COAST_LUXURY",
      "BALI_JUNGLE_VILLA",
    ])
    .default("SANTORINI_CLIFFSIDE"),
  image_source_url: z.string().url().optional(),
  travelers: z.number().int().min(1).max(12).default(2),
  budget_ceiling_ils: z.number().min(500).max(100000).default(8500),
});

export const PriceProtectionScanSchema = z.object({
  user_id: z.string().min(2).max(64).default("usr_demo123"),
  booking_ref: z.string().min(3).max(64),
  destination: z.string().min(2).max(120).default("Rome"),
  paid_amount_ils: z.number().positive(),
  sku_code: z.string().min(3).max(64).default("PKG-TLV-ROM-5D"),
  vip_tier: z.enum(["STANDARD", "GOLD", "PLATINUM"]).default("PLATINUM"),
  simulated_market_drop_pct: z.number().min(0).max(45).optional(),
});

export const BundleNegotiateSchema = z.object({
  destination: z.string().min(2).max(120).default("Santorini"),
  base_total_ils: z.number().positive(),
  travelers: z.number().int().min(1).max(12).default(2),
  components: z.array(z.string()).min(1).default(["FLIGHT", "BOUTIQUE_HOTEL", "TRANSFER_ESIM"]),
  loyalty_tier: z.enum(["STANDARD", "GOLD", "PLATINUM"]).default("PLATINUM"),
  target_discount_pct: z.number().min(1).max(25).default(12),
});

export type AcpDelegatedCheckoutInput = z.infer<typeof AcpDelegatedCheckoutSchema>;
export type CreateInterestWatcherInput = z.infer<typeof CreateInterestWatcherSchema>;
export type ScreenshotDecomposeInput = z.infer<typeof ScreenshotDecomposeRequestSchema>;
export type PriceProtectionScanInput = z.infer<typeof PriceProtectionScanSchema>;
export type BundleNegotiateInput = z.infer<typeof BundleNegotiateSchema>;
