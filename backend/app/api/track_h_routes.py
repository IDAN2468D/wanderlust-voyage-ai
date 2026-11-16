"""
FastAPI Router for Sprint 10 (V10.0 — Track H):
ACP/UCP Gateway, Proactive Interests Scout, Screenshot-to-Trip Vision,
Post-Booking Price Drop Guard, Sidekick Pulse & Bundle Deal Negotiator.
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query

from app.api.schemas import (
    AcpDelegatedCheckoutRequest,
    AcpTokenDelegateRequest,
    BundleNegotiateRequest,
    CreateInterestWatcherRequest,
    FitAssessmentRequest,
    PriceProtectionRegisterRequest,
    PriceProtectionScanRequest,
    PulseActionExecuteRequest,
    ScreenshotDecomposeRequest,
)
from app.tools.acp_gateway_tools import (
    execute_acp_atomic_checkout,
    get_acp_manifest,
    issue_delegated_spend_token,
    list_acp_sessions,
)
from app.tools.interests_scout_tools import (
    create_interest_watcher,
    delete_interest_watcher,
    evaluate_interest_watcher,
    list_interest_watchers,
)
from app.tools.price_guard_tools import (
    get_price_guard_overview,
    register_price_protection_policy,
    scan_price_drops_and_credit_wallet,
)
from app.tools.pulse_negotiator_tools import (
    execute_pulse_action,
    get_proactive_pulse_actions,
    negotiate_travel_bundle,
)
from app.tools.vision_trip_tools import (
    assess_trip_vision_fit,
    decompose_travel_screenshot,
    get_vision_presets,
)

track_h_core_router = APIRouter(tags=["Track H - Agentic Commerce & Proactive AI"])
track_h_v1_router = APIRouter(prefix="/v1", tags=["Track H - Agentic Commerce & Proactive AI"])


# 1. ACP / UCP External AI Travel Commerce Gateway
@track_h_core_router.get("/acp/manifest", status_code=200)
async def acp_manifest_endpoint():
    return get_acp_manifest()


@track_h_core_router.post("/acp/tokens/delegate", status_code=201)
async def acp_delegate_token_endpoint(payload: AcpTokenDelegateRequest):
    return issue_delegated_spend_token(
        external_agent_provider=payload.external_agent_provider,
        user_id=payload.user_id,
        max_authorized_ils=payload.max_authorized_ils,
        allowed_categories=payload.allowed_categories,
        ttl_minutes=payload.ttl_minutes,
    )


@track_h_core_router.post("/acp/checkout", status_code=200)
async def acp_checkout_endpoint(payload: AcpDelegatedCheckoutRequest):
    return execute_acp_atomic_checkout(
        external_agent_provider=payload.external_agent_provider,
        user_id=payload.user_id,
        max_authorized_ils=payload.max_authorized_ils,
        destination=payload.destination,
        origin=payload.origin,
        duration_days=payload.duration_days,
        sku_codes=payload.sku_codes,
        fulfillment_mode=payload.fulfillment_mode,
        delegated_token=payload.delegated_token,
        shabbat_safe_mode=payload.shabbat_safe_mode,
    )


@track_h_core_router.get("/acp/sessions", status_code=200)
async def acp_sessions_endpoint(limit: int = Query(default=12, ge=1, le=50)):
    return {"sessions": list_acp_sessions(limit=limit)}


# 2. Proactive Travel Interests & Fare Radar
@track_h_core_router.get("/interests", status_code=200)
async def list_interests_endpoint(user_id: Optional[str] = Query(default=None)):
    watchers = list_interest_watchers(user_id=user_id)
    return {"watchers": watchers, "total": len(watchers)}


@track_h_core_router.post("/interests", status_code=201)
async def create_interest_endpoint(payload: CreateInterestWatcherRequest):
    return create_interest_watcher(
        user_id=payload.user_id,
        raw_prompt_hebrew=payload.raw_prompt_hebrew,
        target_category=payload.target_category,
        max_price_ils=payload.max_price_ils,
        auto_reserve_vip=payload.auto_reserve_vip,
    )


@track_h_core_router.post("/interests/{interest_id}/evaluate", status_code=200)
async def evaluate_interest_endpoint(interest_id: str):
    res = evaluate_interest_watcher(interest_id)
    if not res:
        raise HTTPException(status_code=404, detail="התראת תחום העניין לא נמצאה")
    return res


@track_h_core_router.delete("/interests/{interest_id}", status_code=200)
async def delete_interest_endpoint(interest_id: str):
    ok = delete_interest_watcher(interest_id)
    if not ok:
        raise HTTPException(status_code=404, detail="התראת תחום העניין לא נמצאה")
    return {"status": "DELETED", "interest_id": interest_id}


# 3. Screenshot-to-Trip & Virtual Fit Assessment
@track_h_core_router.get("/vision-trip/presets", status_code=200)
async def vision_presets_endpoint():
    return {"presets": get_vision_presets()}


@track_h_core_router.post("/vision-trip/decompose-screenshot", status_code=200)
async def vision_decompose_endpoint(payload: ScreenshotDecomposeRequest):
    return decompose_travel_screenshot(
        scene_type=payload.scene_type,
        image_source_url=payload.image_source_url,
        travelers=payload.travelers,
        budget_ceiling_ils=payload.budget_ceiling_ils,
    )


@track_h_core_router.post("/vision-trip/fit-assessment", status_code=200)
async def vision_fit_endpoint(payload: FitAssessmentRequest):
    return assess_trip_vision_fit(
        scene_type=payload.scene_type,
        travelers=payload.travelers,
        budget_ceiling_ils=payload.budget_ceiling_ils,
        shabbat_observant=payload.shabbat_observant,
        max_flight_hours=payload.max_flight_hours,
    )


# 4. Post-Booking Price Drop Guard & Travel Wallet
@track_h_core_router.get("/price-guard", status_code=200)
async def price_guard_overview_endpoint(user_id: Optional[str] = Query(default=None)):
    return get_price_guard_overview(user_id=user_id)


@track_h_core_router.post("/price-guard/register", status_code=201)
async def price_guard_register_endpoint(payload: PriceProtectionRegisterRequest):
    return register_price_protection_policy(
        user_id=payload.user_id,
        booking_ref=payload.booking_ref,
        destination=payload.destination,
        sku_code=payload.sku_code,
        paid_amount_ils=payload.paid_amount_ils,
        vip_tier=payload.vip_tier,
    )


@track_h_core_router.post("/price-guard/scan-drops", status_code=200)
async def price_guard_scan_endpoint(payload: PriceProtectionScanRequest):
    return scan_price_drops_and_credit_wallet(
        user_id=payload.user_id,
        booking_ref=payload.booking_ref,
        destination=payload.destination,
        paid_amount_ils=payload.paid_amount_ils,
        sku_code=payload.sku_code,
        vip_tier=payload.vip_tier,
        simulated_market_drop_pct=payload.simulated_market_drop_pct,
    )


# 5. Sidekick TravelOps Pulse & Bundle Deal Negotiator
@track_h_core_router.get("/pulse/actions", status_code=200)
async def pulse_actions_endpoint():
    return get_proactive_pulse_actions()


@track_h_core_router.post("/pulse/actions/{action_id}/execute", status_code=200)
async def pulse_execute_endpoint(action_id: str, payload: PulseActionExecuteRequest):
    return execute_pulse_action(
        action_id=action_id,
        user_id=payload.user_id,
        context=payload.context,
    )


@track_h_core_router.post("/trips/negotiate-bundle", status_code=200)
async def negotiate_bundle_endpoint(payload: BundleNegotiateRequest):
    return negotiate_travel_bundle(
        destination=payload.destination,
        base_total_ils=payload.base_total_ils,
        travelers=payload.travelers,
        components=payload.components,
        loyalty_tier=payload.loyalty_tier,
        target_discount_pct=payload.target_discount_pct,
    )


track_h_v1_router.include_router(track_h_core_router)
