import json
import asyncio
import logging
from typing import AsyncGenerator, Dict, Any, Optional

from app.tools.tlv_flight_board_tools import (
    generate_tlv_holiday_flight_board,
    ISRAELI_HOLIDAYS_2026,
    BOI_USD_ILS_RATE,
)

logger = logging.getLogger("tlv_flight_specialist")


def synthesize_tlv_flight_board(
    holiday_name_or_key: Optional[str] = None,
    destination: Optional[str] = None,
    depart_date: Optional[str] = None,
    return_date: Optional[str] = None,
    adults: int = 1,
    children: int = 0,
    infants: int = 0,
    checked_bag_needed: bool = True,
    nonstop_only: bool = False,
    budget_ceiling_nis: Optional[float] = None,
) -> Dict[str, Any]:
    """
    Executes the specialized TLV Holiday Flight Board agent deterministically.
    """
    logger.info(f"Synthesizing TLV Holiday Flight Board: holiday={holiday_name_or_key}, dest={destination}")
    return generate_tlv_holiday_flight_board(
        holiday_name_or_key=holiday_name_or_key,
        destination=destination,
        depart_date=depart_date,
        return_date=return_date,
        adults=adults,
        children=children,
        infants=infants,
        checked_bag_needed=checked_bag_needed,
        nonstop_only=nonstop_only,
        budget_ceiling_nis=budget_ceiling_nis,
    )


async def stream_tlv_flight_board_execution(
    holiday_name_or_key: Optional[str] = None,
    destination: Optional[str] = None,
    depart_date: Optional[str] = None,
    return_date: Optional[str] = None,
    adults: int = 1,
    children: int = 0,
    infants: int = 0,
    checked_bag_needed: bool = True,
    nonstop_only: bool = False,
    budget_ceiling_nis: Optional[float] = None,
    session_id: Optional[str] = None,
) -> AsyncGenerator[str, None]:
    """
    Streams multi-stage deliberation and live thought processes for the TLV Holiday Flight Board
    via Server-Sent Events (SSE). Strictly adheres to AGENTS.md deterministic streaming law.
    """
    dest_display = destination or "כל יעד זול (Anywhere)"

    # Stage 1: Gather Holiday Parameters
    evt1 = {
        "type": "step_start",
        "stage": "holiday_parameters",
        "agent": "מומחה חופשות ומועדים",
        "message": f"מנתח את מועדי החג הישראלי ובודק את חלון החופשה הרשמי עבור {dest_display}...",
    }
    yield f"data: {json.dumps(evt1, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    board_result = generate_tlv_holiday_flight_board(
        holiday_name_or_key=holiday_name_or_key,
        destination=destination,
        depart_date=depart_date,
        return_date=return_date,
        adults=adults,
        children=children,
        infants=infants,
        checked_bag_needed=checked_bag_needed,
        nonstop_only=nonstop_only,
        budget_ceiling_nis=budget_ceiling_nis,
    )
    h_info = board_result["holiday"]

    h_name = h_info.get("name_he", "חג ישראלי")
    h_dep = h_info.get("depart_date", "")
    h_ret = h_info.get("return_date", "")
    h_break = h_info.get("school_break", "")

    evt1_thought = {
        "type": "thought",
        "stage": "holiday_parameters",
        "agent": "מומחה חופשות ומועדים",
        "message": f"מועד מאותר: {h_name} | יציאה: {h_dep} | חזרה: {h_ret} | חופשת בתי ספר: {h_break}",
    }
    yield f"data: {json.dumps(evt1_thought, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    # Stage 2: Shabbat & Holiday Constraints Check
    evt2 = {
        "type": "step_start",
        "stage": "shabbat_constraints",
        "agent": "מבקר שבת וחגי ישראל",
        "message": "מבצע ביקורת מועדי שבת וחג עבור אל על וישראייר (חברות שומרות שבת)...",
    }
    yield f"data: {json.dumps(evt2, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    shabbat_audit = board_result["shabbat_audit"]
    if shabbat_audit["has_shabbat_or_holiday_conflict"]:
        conflict_desc = " | ".join([c["advisory"] for c in shabbat_audit["conflicts"]])
        shabbat_msg = f"⚠️ התראה: {conflict_desc}"
    else:
        shabbat_msg = "✅ תאריכי ההמראה והנחיתה אינם מתנגשים עם כניסת/יציאת שבת או יום טוב."

    evt2_thought = {
        "type": "thought",
        "stage": "shabbat_constraints",
        "agent": "מבקר שבת וחגי ישראל",
        "message": shabbat_msg,
    }
    yield f"data: {json.dumps(evt2_thought, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    # Stage 3: Build Search Links
    evt3 = {
        "type": "step_start",
        "stage": "search_links",
        "agent": "מנוע קישורים חיים",
        "message": "בונה קישורים מוכנים ישירים ל-Google Flights, Skyscanner ו-KAYAK בשקלים (ILS)...",
    }
    yield f"data: {json.dumps(evt3, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    evt3_thought = {
        "type": "thought",
        "stage": "search_links",
        "agent": "מנוע קישורים חיים",
        "message": "קישורים נבנו בהצלחה עם פרמטרי שפה ומטבע ישראל (curr=ILS&gl=IL&hl=he).",
    }
    yield f"data: {json.dumps(evt3_thought, ensure_ascii=False)}\n\n"

    # Stage 4: Pull Live Fares
    evt4 = {
        "type": "step_start",
        "stage": "fare_retrieval",
        "agent": "סוכן תעריפי נתב\"ג",
        "message": "שולף תעריפים מחברות ישראליות (אל על, ישראייר, ארקיע) וחברות בינלאומיות פעילות...",
    }
    yield f"data: {json.dumps(evt4, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    evt4_thought = {
        "type": "thought",
        "stage": "fare_retrieval",
        "agent": "סוכן תעריפי נתב\"ג",
        "message": f"שער חליפין בנק ישראל: {BOI_USD_ILS_RATE} ₪ לדולר | נוספה עמלת המרת מט\"ח 3% לכרטיסי אשראי ישראליים.",
    }
    yield f"data: {json.dumps(evt4_thought, ensure_ascii=False)}\n\n"

    # Stage 5: Baggage Normalization
    evt5 = {
        "type": "step_start",
        "stage": "baggage_normalization",
        "agent": "יועץ כבודה ועלות אמיתית",
        "message": "מנרמל את עלויות הכבודה: משווה El Al Classic (כולל מזוודה) מול El Al Lite ותוספות ישראייר/ארקיע...",
    }
    yield f"data: {json.dumps(evt5, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    passengers_str = f"{adults} מבוגרים" + (f", {children} ילדים" if children > 0 else "")
    bag_txt = "כולל מזוודה לבטן המטוס" if checked_bag_needed else "ללא מזוודה (רק טרולי)"
    evt5_thought = {
        "type": "thought",
        "stage": "baggage_normalization",
        "agent": "יועץ כבודה ועלות אמיתית",
        "message": f"חישוב מתמטי עבור {passengers_str} ({bag_txt}): מחיר בסיס + דמי כבודה + 3% עמלת מט\"ח.",
    }
    yield f"data: {json.dumps(evt5_thought, ensure_ascii=False)}\n\n"

    # Stage 6: Board Ranking & Top Picks
    evt6 = {
        "type": "step_start",
        "stage": "board_ranking",
        "agent": "אלגוריתם דירוג נתב\"ג",
        "message": "מדרג את לוח ההמראות לפי העלות האמיתית הכוללת לאדם ולמשפחה...",
    }
    yield f"data: {json.dumps(evt6, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    top_p = board_result["top_picks"]
    best_v_name = top_p["best_value"]["airline"] if top_p.get("best_value") else "N/A"
    best_v_price = top_p["best_value"]["true_total_nis"] if top_p.get("best_value") else 0
    evt6_thought = {
        "type": "thought",
        "stage": "board_ranking",
        "agent": "אלגוריתם דירוג נתב\"ג",
        "message": f"הבחירה המשתלמת ביותר: {best_v_name} ב-₪{best_v_price:,} לאדם (עלות אמיתית סופית כולל כבודה).",
    }
    yield f"data: {json.dumps(evt6_thought, ensure_ascii=False)}\n\n"

    # Stage 7: Holiday Advisories
    evt7 = {
        "type": "step_start",
        "stage": "holiday_advisories",
        "agent": "בקר מבצעי נתב\"ג",
        "message": "מייצר הנחיות התייצבות רשמיות בטרמינל נתב\"ג ואזהרות שיא עונתיות...",
    }
    yield f"data: {json.dumps(evt7, ensure_ascii=False)}\n\n"
    await asyncio.sleep(0.3)

    arr_rec = h_info.get("airport_arrival_recommendation", "3 שעות לפני הטיסה")
    evt7_thought = {
        "type": "thought",
        "stage": "holiday_advisories",
        "agent": "בקר מבצעי נתב\"ג",
        "message": f"{arr_rec} | שימו לב: טורקיש ואמירטס אינן מפעילות טיסות מנתב\"ג.",
    }
    yield f"data: {json.dumps(evt7_thought, ensure_ascii=False)}\n\n"

    # Final Complete Event with Full Payload
    evt_final = {
        "type": "complete",
        "stage": "finished",
        "data": board_result,
    }
    yield f"data: {json.dumps(evt_final, ensure_ascii=False)}\n\n"
