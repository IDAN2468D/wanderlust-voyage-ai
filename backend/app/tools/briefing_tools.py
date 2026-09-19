import json
import urllib.parse
from typing import Dict, Any, List, Optional


def generate_whatsapp_daily_briefings(
    destination: str,
    duration_days: int,
    structured_days: List[Dict[str, Any]],
    weather_metrics: Optional[Dict[str, Any]] = None,
) -> str:
    """
    Generates ready-to-share WhatsApp formatted daily briefings with direct 1-click share URLs.
    """
    dest = destination.strip()
    briefings = []

    temp_high = weather_metrics.get("temp_high", 24) if weather_metrics else 24
    weather_cond = weather_metrics.get("condition", "נעים ובהיר") if weather_metrics else "נעים ובהיר"

    for day in structured_days:
        day_num = day.get("day_number", 1)
        date_fmt = day.get("date_formatted", "")
        title = day.get("title", f"יום {day_num} ב{dest}")

        morning = day.get("morning", {})
        afternoon = day.get("afternoon", {})
        evening = day.get("evening", {})
        tip = day.get("local_tip", "הצטיידו בנעלי הליכה נוחות")

        msg_lines = [
            f"☀️ *בוקר טוב! תדריך יומי - {dest}* 🌍",
            f"📅 *{title}* ({date_fmt})",
            f"🌡️ מזג אוויר: {temp_high}°C ({weather_cond})",
            "",
            f"🌅 *בוקר ({morning.get('time', '09:00')}):*",
            f"📍 {morning.get('activity', '')}",
            f"💡 {morning.get('highlight', '')}",
            "",
            f"🍽️ *ארוחת צהריים ({afternoon.get('time', '13:00')}):*",
            f"🍴 מסעדת {afternoon.get('dining', '')} ({afternoon.get('neighborhood', '')})",
            f"⭐ מומלץ לטעום: {afternoon.get('signature_dish', '')}",
            "",
            f"🌆 *אחה\"צ וערב:*",
            f"🏛️ {afternoon.get('activity', '')}",
            f"🌙 {evening.get('activity', '')}",
            "",
            f"📌 *טיפ היום מהסוכן:* {tip}",
            "",
            "✨ _הופק על ידי Wanderlust Voyage AI Butler_",
        ]

        raw_text = "\n".join(msg_lines)
        encoded_text = urllib.parse.quote(raw_text)
        whatsapp_url = f"https://api.whatsapp.com/send?text={encoded_text}"

        briefings.append({
            "day_number": day_num,
            "date_formatted": date_fmt,
            "title": title,
            "whatsapp_text": raw_text,
            "whatsapp_share_url": whatsapp_url,
        })

    result = {
        "destination": dest,
        "total_briefings": len(briefings),
        "briefings": briefings,
    }

    return json.dumps(result, ensure_ascii=False)
